using System.Data;
using System.Text;
using Antlr4.Runtime;
using Antlr4.Runtime.Tree;
using Astrolabe.Evaluator.Parser;

namespace Astrolabe.Evaluator;

public class ExprParser
{
    public static EvalExpr Parse(string expression, bool allowSyntaxErrors = true)
    {
        var inputStream = new AntlrInputStream(expression);
        var exprLexer = new AstroExprLexer(inputStream);
        var commonTokenStream = new CommonTokenStream(exprLexer);
        var exprParser = new AstroExprParser(commonTokenStream);
        var errors = new SyntaxErrorListener();
        exprParser.RemoveErrorListeners();
        exprParser.AddErrorListener(errors);
        var exprContext = exprParser.main();
        var visitor = new AstroExprVisitor();
        var result = visitor.Visit(exprContext);
        if (!allowSyntaxErrors && errors.Errors.Count > 0)
        {
            throw new SyntaxErrorException(
                $"{exprParser.NumberOfSyntaxErrors} syntax errors",
                errors.Errors
            );
        }
        return result;
    }

    private class SyntaxErrorListener : BaseErrorListener
    {
        public readonly List<SyntaxError> Errors = [];

        public override void SyntaxError(
            TextWriter output,
            IRecognizer recognizer,
            IToken offendingSymbol,
            int line,
            int charPositionInLine,
            string msg,
            RecognitionException e
        )
        {
            Errors.Add(new SyntaxError(offendingSymbol, line, charPositionInLine, msg, e));
        }
    }

    public class AstroExprVisitor : AstroExprParserBaseVisitor<EvalExpr>
    {
        public override EvalExpr VisitMain(AstroExprParser.MainContext context)
        {
            return Visit(context.expr());
        }

        public override EvalExpr VisitVariableReference(
            AstroExprParser.VariableReferenceContext context
        )
        {
            // Grammar is: variableReference : '$' identifierName ;
            // So the identifierName part does NOT include the $
            return new VarExpr(context.identifierName().GetText());
        }

        public override EvalExpr VisitLetExpr(AstroExprParser.LetExprContext context)
        {
            var assignments = context
                .variableAssign()
                .Select(x => ((VarExpr)Visit(x.variableReference()), Visit(x.expr())!));
            return new LetExpr(assignments, Visit(context.expr()));
        }

        public override EvalExpr VisitLambdaExpr(AstroExprParser.LambdaExprContext context)
        {
            return new LambdaExpr(
                Visit(context.variableReference()).AsVar().Name,
                Visit(context.expr())
            );
        }

        public override EvalExpr VisitBinOp(AstroExprParser.BinOpContext context)
        {
            return new CallExpr(
                context.GetChild(1).GetText(),
                [Visit(context.expr(0)), Visit(context.expr(1))]
            );
        }

        public override EvalExpr VisitTernaryOp(AstroExprParser.TernaryOpContext context)
        {
            return new CallExpr(
                "?",
                [Visit(context.expr(0)), Visit(context.expr(1)), Visit(context.expr(2))]
            );
        }

        public override EvalExpr VisitArrayLiteral(AstroExprParser.ArrayLiteralContext context)
        {
            var elems = context.expr().Select(x => Visit(x));
            return new ArrayExpr(elems);
        }

        public override EvalExpr VisitObjectLiteral(AstroExprParser.ObjectLiteralContext context)
        {
            var fields = context.objectField();
            var objectArgs = fields.SelectMany(x =>
                x.expr().Length == 2 ? new[] { Visit(x.expr(0)), Visit(x.expr(1)) } : []
            );
            return new CallExpr("object", objectArgs.ToList());
        }

        public override EvalExpr VisitTemplateStringLiteral(AstroExprParser.TemplateStringLiteralContext context)
        {
            var atoms = context.templateStringAtom();
            var currentString = new StringBuilder();
            var args = new List<EvalExpr>();
            foreach (var atom in atoms)
            {
                var expr = atom.expr();
                if (expr != null)
                {
                    FinishString();
                    args.Add(Visit(expr));
                }
                else
                {
                    currentString.Append(atom.GetText());
                }
            }
            FinishString();
            return args.Count switch
            {
                0 => new ValueExpr(""),
                1 when args[0].IsString() => args[0],
                _ => new CallExpr("string", args)
            };

            void FinishString()
            {
                if (currentString.Length <= 0) return;
                args.Add(StringValue(currentString.ToString()));
                currentString.Clear();
            }

        }

        public override EvalExpr VisitTerminal(ITerminalNode node)
        {
            return node.Symbol.Type switch
            {
                AstroExprParser.Identifier => new PropertyExpr(node.GetText()),
                AstroExprParser.Number => new ValueExpr(double.Parse(node.GetText())),
                AstroExprParser.False => ValueExpr.False,
                AstroExprParser.True => ValueExpr.True,
                AstroExprParser.Null => ValueExpr.Null,
                AstroExprParser.StringLiteral when node.GetText() is var text
                    => StringValue(text.Substring(1, text.Length - 2)),
                _ => throw new NotImplementedException()
            };
        }

        public override EvalExpr VisitUnaryOp(AstroExprParser.UnaryOpContext context)
        {
            var expr = context.expr();
            return context.NOT() != null
                ? new CallExpr("!", [Visit(expr)])
                : context.PLUS() != null
                    ? Visit(expr)
                    : context.MINUS() != null
                        ? new CallExpr("-", [new ValueExpr(0), Visit(expr)])
                        : base.VisitUnaryOp(context);
        }

        public override EvalExpr VisitPrimaryExpr(AstroExprParser.PrimaryExprContext context)
        {
            return context.LPAR() != null ? Visit(context.expr()) : base.VisitPrimaryExpr(context);
        }

        public override EvalExpr VisitFunctionCall(AstroExprParser.FunctionCallContext context)
        {
            // Get the function name from the variable reference (already has $ stripped by grammar)
            var functionName = context.variableReference().identifierName().GetText();
            var args = context.expr().Select(Visit).ToList();
            return new CallExpr(functionName, args);
        }
    }

    public static ValueExpr StringValue(string escaped)
    {
        return new ValueExpr(StringUnescape.UnescapeJsString(escaped));
    }
}
