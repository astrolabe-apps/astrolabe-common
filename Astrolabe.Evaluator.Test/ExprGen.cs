using FsCheck;
using FsCheck.Fluent;

namespace Astrolabe.Evaluator.Test;

public static class ExprGen
{
    private static Gen<string> GenString => ArbMap.Default.GeneratorFor<string>();
    
    private static readonly Gen<ValueExpr> GenValueExpr =
        Gen.OneOf(
            Gen.Constant(ValueExpr.Null),
            Gen.Constant(ValueExpr.False),
            Gen.Constant(ValueExpr.True),
            ArbMap.Default.GeneratorFor<string>().Select(ValueExpr.From),
            ArbMap.Default.GeneratorFor<int?>().Select(ValueExpr.From),
            ArbMap.Default.GeneratorFor<double?>().Where(x => x is not {} d || (!double.IsInfinity(d) && !double.IsNaN(d))).Select(ValueExpr.From));

    private static readonly Gen<EvalExpr> GenVarExpr =
        GenString.Select(EvalExpr (x) => new VarExpr(x));
    
    private static readonly Gen<EvalExpr> GenPropertyExpr =
        GenString.Select(EvalExpr (x) => new PropertyExpr(x));

    private static Gen<EvalExpr> GenCallExpr(Gen<EvalExpr> argsGen) =>
        GenString.SelectMany(x => 
            argsGen.ListOf().Select(EvalExpr (args) => new CallExpr(x, args)));

    private static Gen<EvalExpr> GenArrayExpr(Gen<EvalExpr> elemGen) =>
        elemGen.ListOf().Select(EvalExpr (args) => new ArrayExpr(args));

    private static Gen<EvalExpr> GenLambdaExpr(Gen<EvalExpr> inGen) =>
        GenString.SelectMany(v => inGen.Select(EvalExpr (x) => new LambdaExpr(v, x)));

    private static Gen<EvalExpr> GenLetExpr(Gen<EvalExpr> evalExprGen) =>
        GenString.SelectMany(v => evalExprGen.Select(x => (new VarExpr(v), x))).ListOf()
            .SelectMany(v => evalExprGen.Select(EvalExpr (x) => new LetExpr(v, x)));

    private static Gen<EvalExpr> GenEvalTerm = Gen.OneOf(GenValueExpr.Select(EvalExpr (x) => x), GenVarExpr, GenPropertyExpr);
    
    private static Gen<EvalExpr> SafeEvalExpr(int size)
    {
        if (size == 0)
            return GenEvalTerm;
        var elemGen = SafeEvalExpr(size / 2);
        return Gen.OneOf(GenEvalTerm, GenLetExpr(elemGen),
            GenCallExpr(elemGen), GenArrayExpr(elemGen), GenLambdaExpr(elemGen));
    }
    
    public static readonly Gen<EvalExpr> EvalExpr = Gen.Sized(SafeEvalExpr);

}