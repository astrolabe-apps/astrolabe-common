using System.Data;
using System.Text;
using Antlr4.Runtime;
using Antlr4.Runtime.Tree;
using Astrolabe.Evaluator.Parser;

namespace Astrolabe.Evaluator;

public class ExprParser
{
    public static EvalExpr Parse(
        string expression,
        bool allowSyntaxErrors = true,
        string? sourceFile = null
    )
    {
        var inputStream = new AntlrInputStream(expression);
        var exprLexer = new AstroExprLexer(inputStream);
        var commonTokenStream = new CommonTokenStream(exprLexer);
        var exprParser = new AstroExprParser(commonTokenStream);
        var errors = new SyntaxErrorListener();
        exprParser.RemoveErrorListeners();
        exprParser.AddErrorListener(errors);
        var exprContext = exprParser.main();
        var visitor = new AstroExprVisitor(sourceFile);
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
        private readonly string? _sourceFile;

        public AstroExprVisitor(string? sourceFile = null)
        {
            _sourceFile = sourceFile;
        }

        private SourceLocation GetLocation(ParserRuleContext context)
        {
            return new SourceLocation(
                context.Start.StartIndex,
                (context.Stop?.StopIndex ?? context.Start.StopIndex) + 1,
                _sourceFile
            );
        }

        private SourceLocation GetLocation(IToken token)
        {
            return new SourceLocation(token.StartIndex, token.StopIndex + 1, _sourceFile);
        }

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
            return new VarExpr(context.identifierName().GetText(), GetLocation(context));
        }

        public override EvalExpr VisitLetExpr(AstroExprParser.LetExprContext context)
        {
            var assignments = context
                .variableAssign()
                .Select(x => ((VarExpr)Visit(x.variableReference()), Visit(x.expr())!));
            return new LetExpr(assignments, Visit(context.expr()), GetLocation(context));
        }

        public override EvalExpr VisitLambdaExpr(AstroExprParser.LambdaExprContext context)
        {
            return new LambdaExpr(
                Visit(context.variableReference()).AsVar().Name,
                Visit(context.expr()),
                GetLocation(context)
            );
        }

        public override EvalExpr VisitBinOp(AstroExprParser.BinOpContext context)
        {
            return new CallExpr(
                context.GetChild(1).GetText(),
                [Visit(context.expr(0)), Visit(context.expr(1))],
                GetLocation(context)
            );
        }

        public override EvalExpr VisitTernaryOp(AstroExprParser.TernaryOpContext context)
        {
            return new CallExpr(
                "?",
                [Visit(context.expr(0)), Visit(context.expr(1)), Visit(context.expr(2))],
                GetLocation(context)
            );
        }

        public override EvalExpr VisitArrayLiteral(AstroExprParser.ArrayLiteralContext context)
        {
            var elems = context.expr().Select(x => Visit(x));
            return new ArrayExpr(elems, GetLocation(context));
        }

        public override EvalExpr VisitObjectLiteral(AstroExprParser.ObjectLiteralContext context)
        {
            var fields = context.objectField();
            var objectArgs = fields.SelectMany(x =>
                x.expr().Length == 2 ? new[] { Visit(x.expr(0)), Visit(x.expr(1)) } : []
            );
            return new CallExpr("object", objectArgs.ToList(), GetLocation(context));
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
            var location = GetLocation(context);
            return args.Count switch
            {
                0 => new ValueExpr("", null, null, location),
                1 when args[0].IsString() => args[0],
                _ => new CallExpr("string", args, location)
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
            var location = GetLocation(node.Symbol);
            return node.Symbol.Type switch
            {
                AstroExprParser.Identifier => new PropertyExpr(node.GetText(), location),
                AstroExprParser.Number => new ValueExpr(double.Parse(node.GetText()), null, null, location),
                AstroExprParser.False => new ValueExpr(false, null, null, location),
                AstroExprParser.True => new ValueExpr(true, null, null, location),
                AstroExprParser.Null => new ValueExpr(null, null, null, location),
                AstroExprParser.StringLiteral when node.GetText() is var text
                    => StringValue(text.Substring(1, text.Length - 2), location),
                _ => throw new NotImplementedException()
            };
        }

        public override EvalExpr VisitUnaryOp(AstroExprParser.UnaryOpContext context)
        {
            var expr = context.expr();
            var location = GetLocation(context);
            return context.NOT() != null
                ? new CallExpr("!", [Visit(expr)], location)
                : context.PLUS() != null
                    ? Visit(expr)
                    : context.MINUS() != null
                        ? new CallExpr("-", [new ValueExpr(0), Visit(expr)], location)
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
            return new CallExpr(functionName, args, GetLocation(context));
        }
    }

    public static ValueExpr StringValue(string escaped, SourceLocation? location = null)
    {
        return new ValueExpr(StringUnescape.UnescapeJsString(escaped), null, null, location);
    }
}
