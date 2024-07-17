namespace Astrolabe.Evaluator;

public static class PrintExpr
{
    public static string PrintValue(object? value)
    {
        return value switch
        {
            null => "null",
            EmptyPath => "$",
            DataPath dp => dp.ToPathString(),
            ArrayValue av => $"[{string.Join(", ", av.Values.Cast<object?>().Select(PrintValue))}]",
            _ => $"{value}"
        };
    }

    public static string Print(this Expr expr)
    {
        return expr switch
        {
            ExprValue v => PrintValue(v.Value),
            ArrayExpr arrayExpr
                => $"[{string.Join(", ", arrayExpr.ValueExpr.Select(x => x.Print()))}]",
            CallExpr { Function: InbuiltFunction.IfElse, Args: var a }
                when a.ToList() is [var ifE, var t, var f]
                => $"{ifE.Print()} ? {t.Print()} : {f.Print()}",
            CallExpr callExpr
                when InfixFunc(callExpr.Function) is { } op
                    && callExpr.Args.ToList() is [var v1, var v2]
                => $"{v1.Print()}{op}{v2.Print()}",
            CallExpr callExpr
                => $"{callExpr.Function}({string.Join(", ", callExpr.Args.Select(x => x.Print()))})",
            _ => expr.ToString()!,
        };
    }

    public static string? InfixFunc(InbuiltFunction func)
    {
        return func switch
        {
            InbuiltFunction.Eq => " = ",
            InbuiltFunction.Lt => " < ",
            InbuiltFunction.LtEq => " <= ",
            InbuiltFunction.Gt => " > ",
            InbuiltFunction.GtEq => " >= ",
            InbuiltFunction.Ne => " <> ",
            InbuiltFunction.And => " and ",
            InbuiltFunction.Or => " or ",
            InbuiltFunction.Add => " + ",
            InbuiltFunction.Minus => " - ",
            InbuiltFunction.Multiply => " * ",
            InbuiltFunction.Divide => " / ",
            _ => null
        };
    }
}
