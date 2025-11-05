using System.Text;

namespace Astrolabe.Evaluator;

public static class PrintExpr
{
    // Operator precedence levels (higher number = higher precedence)
    private static class Precedence
    {
        public const int Ternary = 1;    // ? :
        public const int Or = 2;         // or
        public const int And = 3;        // and
        public const int Rel = 4;        // <, >, =, !=, <=, >=
        public const int Plus = 5;       // +, -
        public const int Times = 6;      // *, /, %
        public const int Map = 7;        // .
        public const int Filter = 8;     // [...]
        public const int Prefix = 9;     // unary !, +, -
        public const int Call = 10;      // function calls
    }

    private static int GetPrecedence(EvalExpr expr)
    {
        if (expr is not CallExpr call) return Precedence.Call; // atoms have highest precedence

        return call.Function switch
        {
            "?" => Precedence.Ternary,
            "or" => Precedence.Or,
            "and" => Precedence.And,
            "<" or ">" or "=" or "!=" or "<=" or ">=" => Precedence.Rel,
            "+" or "-" => Precedence.Plus,
            "*" or "/" or "%" => Precedence.Times,
            "." => Precedence.Map,
            "[" => Precedence.Filter,
            "??" => Precedence.Or, // default operator
            _ => Precedence.Call
        };
    }

    private static string PrintWithParens(EvalExpr expr, int parentPrecedence)
    {
        var exprPrecedence = GetPrecedence(expr);
        var needsParens = exprPrecedence < parentPrecedence;
        var printed = expr.Print();
        return needsParens ? $"({printed})" : printed;
    }

    private static string EscapeString(string str)
    {
        var sb = new StringBuilder();
        foreach (var c in str)
        {
            switch (c)
            {
                case '\\': sb.Append("\\\\"); break;
                case '"': sb.Append("\\\""); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                case '\v': sb.Append("\\v"); break;
                default: sb.Append(c); break;
            }
        }
        return sb.ToString();
    }

    public static string PrintValue(object? value)
    {
        return value switch
        {
            null => "null",
            true => "true",
            false => "false",
            EmptyPath => "",
            DataPath dp => dp.ToPathString(),
            ArrayValue av => $"[{string.Join(", ", av.Values.Select(x => PrintValue(x.Value)))}]",
            ObjectValue ov => PrintObjectValue(ov),
            string s => $"\"{EscapeString(s)}\"",
            _ => $"{value}",
        };
    }

    private static string PrintObjectValue(ObjectValue obj)
    {
        if (!obj.Properties.Any()) return "{}";

        var pairs = obj.Properties.Select(kvp =>
            $"\"{EscapeString(kvp.Key)}\": {kvp.Value.Print()}"
        );
        return $"{{{string.Join(", ", pairs)}}}";
    }

    public static string Print(this EvalExpr expr)
    {
        return expr switch
        {
            ValueExpr v => PrintValue(v.Value),
            VarExpr varExpr => $"${varExpr.Name}",
            LambdaExpr lambdaExpr => $"${lambdaExpr.Variable} => {lambdaExpr.Value.Print()}",
            LetExpr letExpr when !letExpr.Vars.Any() => letExpr.In.Print(),
            LetExpr letExpr =>
                $"let {string.Join(", ", letExpr.Vars.Select(x => $"${x.Item1.Name} := {x.Item2.Print()}"))} in {letExpr.In.Print()}",
            ArrayExpr arrayExpr =>
                $"[{string.Join(", ", arrayExpr.Values.Select(x => x.Print()))}]",
            CallExpr { Function: "[", Args: var a } when a.ToList() is [var first, var t] =>
                $"{PrintWithParens(first, Precedence.Filter)}[{t.Print()}]",
            CallExpr { Function: "?", Args: var a } when a.ToList() is [var ifE, var t, var f] =>
                $"{PrintWithParens(ifE, Precedence.Ternary + 1)} ? {PrintWithParens(t, Precedence.Ternary)} : {PrintWithParens(f, Precedence.Ternary)}",
            CallExpr { Function: "object", Args: var args } when args.Count % 2 == 0 =>
                PrintObjectLiteral(args),
            CallExpr { Function: "string", Args: var args } when args.Count > 1 =>
                PrintTemplateString(args),
            PropertyExpr propExpr => propExpr.Property,
            // Handle unary minus: 0 - expr => -expr
            CallExpr { Function: "-", Args: var args } when args.ToList() is [ValueExpr { Value: 0 }, var operand] =>
                $"-{PrintWithParens(operand, Precedence.Prefix)}",
            // Handle unary NOT: !expr
            CallExpr { Function: "!", Args: var args } when args.Count == 1 =>
                $"!{PrintWithParens(args[0], Precedence.Prefix)}",
            CallExpr callExpr when InfixFunc(callExpr.Function) is { } op && callExpr.Args.ToList() is [var v1, var v2] =>
                PrintBinaryOp(callExpr, v1, v2, op),
            CallExpr callExpr =>
                $"${callExpr.Function}({string.Join(", ", callExpr.Args.Select(x => x.Print()))})",
            _ => expr.ToString()!,
        };
    }

    private static string PrintObjectLiteral(IList<EvalExpr> args)
    {
        if (args.Count == 0) return "{}";

        var pairs = new List<string>();
        for (int i = 0; i < args.Count; i += 2)
        {
            var key = args[i];
            var value = args[i + 1];
            // Print the key as-is to preserve whether it's a string literal or identifier
            pairs.Add($"{key.Print()}: {value.Print()}");
        }
        return $"{{{string.Join(", ", pairs)}}}";
    }

    private static string PrintTemplateString(IList<EvalExpr> args)
    {
        var sb = new StringBuilder("`");
        foreach (var arg in args)
        {
            if (arg is ValueExpr { Value: string s })
            {
                // Escape backticks and backslashes in template strings
                sb.Append(s.Replace("\\", "\\\\").Replace("`", "\\`"));
            }
            else
            {
                sb.Append("{").Append(arg.Print()).Append("}");
            }
        }
        sb.Append("`");
        return sb.ToString();
    }

    private static string PrintBinaryOp(CallExpr callExpr, EvalExpr left, EvalExpr right, string op)
    {
        var precedence = GetPrecedence(callExpr);
        // Left-associative: left operand needs parens if lower precedence,
        // right operand needs parens if lower or equal precedence
        return $"{PrintWithParens(left, precedence)}{op}{PrintWithParens(right, precedence + 1)}";
    }

    public static string? InfixFunc(string func)
    {
        return func switch
        {
            "=" => " = ",
            "<" => " < ",
            "<=" => " <= ",
            ">" => " > ",
            ">=" => " >= ",
            "!=" => " != ",
            "and" => " and ",
            "or" => " or ",
            "??" => " ?? ",
            "+" => " + ",
            "-" => " - ",
            "*" => " * ",
            "/" => " / ",
            "%" => " % ",
            "." => ".",
            _ => null,
        };
    }
}
