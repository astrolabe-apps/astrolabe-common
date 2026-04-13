namespace Astrolabe.Evaluator;

public static class EvalEnvExtensions
{
    public static List<EvalExpr> EvaluateAll(this EvalEnv env, IEnumerable<EvalExpr> exprs)
    {
        return exprs.Select(env.EvaluateExpr).ToList();
    }
}
