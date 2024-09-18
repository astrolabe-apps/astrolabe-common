using Antlr4.Runtime;
using Antlr4.Runtime.Tree;
using Astrolabe.Evaluator.Parser;

namespace Astrolabe.Evaluator;

using BinState = (EvalExpr?, ITerminalNode?);

public class ExprParser
{
    public static EvalExpr Parse(string expression)
    {
        var inputStream = new AntlrInputStream(expression);
        var speakLexer = new AstroExprLexer(inputStream);
        var commonTokenStream = new CommonTokenStream(speakLexer);
        var speakParser = new AstroExprParser(commonTokenStream);
        var chatContext = speakParser.main();
        var visitor = new AstroExprVisitor();
        return visitor.Visit(chatContext);
    }

    public class AstroExprVisitor : AstroExprBaseVisitor<EvalExpr>
    {
        public override EvalExpr VisitMain(AstroExprParser.MainContext context)
        {
            return Visit(context.expr());
        }

        public override EvalExpr VisitVariableReference(
            AstroExprParser.VariableReferenceContext context
        )
        {
            return new VarExpr(context.Identifier().GetText());
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

        public override EvalExpr VisitTerminal(ITerminalNode node)
        {
            return node.Symbol.Type switch
            {
                AstroExprParser.Identifier => new PropertyExpr(node.GetText()),
                AstroExprParser.Number => new ValueExpr(double.Parse(node.GetText())),
                AstroExprParser.False => ValueExpr.False,
                AstroExprParser.True => ValueExpr.True,
                AstroExprParser.Null => ValueExpr.Null,
                AstroExprParser.Literal when node.GetText() is var text
                    => new ValueExpr(text.Substring(1, text.Length - 2)),
                _ => throw new NotImplementedException()
            };
        }

        public override EvalExpr VisitPrimaryExpr(AstroExprParser.PrimaryExprContext context)
        {
            return context.LPAR() != null
                ? Visit(context.expr())
                : context.PLUS() != null
                    ? Visit(context.expr())
                    : context.MINUS() != null
                        ? new CallExpr("-", [new ValueExpr(0), Visit(context.expr())])
                        : context.NOT() != null
                            ? new CallExpr("!", [Visit(context.expr())])
                            : base.VisitPrimaryExpr(context);
        }

        public override EvalExpr VisitFunctionCall(AstroExprParser.FunctionCallContext context)
        {
            var variableString = context.variableReference().Identifier().GetText();
            var args = context.expr().Select(Visit).ToList();
            return new CallExpr(variableString, args);
        }
    }
}
