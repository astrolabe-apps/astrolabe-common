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
        public override EvalExpr VisitOrExpr(AstroExprParser.OrExprContext context)
        {
            return DoFunction(_ => "or", context);
        }

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

        public override EvalExpr VisitUnaryExprNoRoot(
            AstroExprParser.UnaryExprNoRootContext context
        )
        {
            if (context.NOT() != null)
            {
                return new CallExpr("!", [Visit(context.filterExpr())]);
            }

            if (context.MINUS() != null)
            {
                return new CallExpr("-", [new ValueExpr(0), Visit(context.filterExpr())]);
            }
            return Visit(context.filterExpr());
        }

        public override EvalExpr VisitLambdaExpr(AstroExprParser.LambdaExprContext context)
        {
            return new LambdaExpr(
                Visit(context.variableReference()).AsVar().Name,
                Visit(context.expr())
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
            var leftPar = context.LPAR();
            return leftPar != null ? Visit(context.expr()) : base.VisitPrimaryExpr(context);
        }

        public override EvalExpr VisitPredicate(AstroExprParser.PredicateContext context)
        {
            return Visit(context.expr());
        }

        public override EvalExpr VisitFilterExpr(AstroExprParser.FilterExprContext context)
        {
            var baseExpr = Visit(context.primaryExpr());
            var predicate = context.predicate();
            return predicate != null ? new CallExpr("[", [baseExpr, Visit(predicate)]) : baseExpr;
        }

        public override EvalExpr VisitConditionExpression(
            AstroExprParser.ConditionExpressionContext context
        )
        {
            var ifExpr = Visit(context.orExpr());
            var thenExpr = context.expr();
            var elseExpr = context.conditionExpression();
            if (thenExpr != null)
                return new CallExpr("?", [ifExpr, Visit(thenExpr), Visit(elseExpr)]);
            return ifExpr;
        }

        public override EvalExpr VisitFunctionCall(AstroExprParser.FunctionCallContext context)
        {
            var variableString = context.variableReference().Identifier().GetText();
            var args = context.expr().Select(Visit).ToList();
            return new CallExpr(variableString, args);
        }

        public override EvalExpr VisitMapExpr(AstroExprParser.MapExprContext context)
        {
            return DoFunction(_ => ".", context);
        }

        public override EvalExpr VisitAndExpr(AstroExprParser.AndExprContext context)
        {
            return DoFunction(_ => "and", context);
        }

        public override EvalExpr VisitRelationalExpr(AstroExprParser.RelationalExprContext context)
        {
            return DoFunction(
                x =>
                    x.Symbol.Type switch
                    {
                        AstroExprParser.LESS => "<",
                        AstroExprParser.MORE_ => ">",
                        AstroExprParser.LE => "<=",
                        AstroExprParser.GE => ">=",
                    },
                context
            );
        }

        public override EvalExpr VisitEqualityExpr(AstroExprParser.EqualityExprContext context)
        {
            return DoFunction(t => t.Symbol.Type == AstroExprParser.EQ ? "=" : "!=", context);
        }

        public override EvalExpr VisitMultiplicativeExpr(
            AstroExprParser.MultiplicativeExprContext context
        )
        {
            return DoFunction(t => t.Symbol.Type == AstroExprParser.MUL ? "*" : "/", context);
        }

        public override EvalExpr VisitAdditiveExpr(AstroExprParser.AdditiveExprContext context)
        {
            return DoFunction(t => t.Symbol.Type == AstroExprParser.PLUS ? "+" : "-", context);
        }

        public EvalExpr DoFunction(Func<ITerminalNode, string> func, ParserRuleContext context)
        {
            return DoBinOps((t, e1, e2) => new CallExpr(func(t), [e1, e2]), context);
        }

        public EvalExpr DoBinOps(
            Func<ITerminalNode, EvalExpr, EvalExpr, EvalExpr> createExpr,
            ParserRuleContext context
        )
        {
            return context
                .children.Aggregate(
                    (BinState)(null, null),
                    (acc, next) =>
                        next switch
                        {
                            ITerminalNode tn => (acc.Item1, tn),
                            _ when Visit(next) is { } e
                                => acc is { Item2: not null, Item1: not null }
                                    ? (createExpr(acc.Item2, acc.Item1, e), null)
                                    : (e, null),
                        }
                )
                .Item1;
        }
    }
}
