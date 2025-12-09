using System.Text.Json;
using System.Text.Json.Serialization;
using FsCheck;
using FsCheck.Fluent;
using Xunit.Abstractions;

namespace Astrolabe.Evaluator.Test;

public class NormaliseTest(ITestOutputHelper output)
{
    [Fact]
    public void NormaliseReflective()
    {
        Prop.ForAll(
                ExprGen.EvalExpr.ToArbitrary(),
                x =>
                {
                    var normalString = x.ToNormalString();
                    var parsed = NormalString.Parse(normalString).Result;
                    var normalised = Normalise(x);
                    var reflected = JsonSerializer.Serialize(parsed);
                    Assert.Equivalent(JsonSerializer.Serialize(normalised), reflected);
                }
            )
            // .Check(Config.VerboseThrowOnFailure.WithMaxTest(100000));
            .VerboseCheckThrowOnFailure();
        // .Check(Config.VerboseThrowOnFailure.WithReplay(17740565117687559759,4192450112079655587, 4));
    }

    /// <summary>
    /// Normalises an expression to the form it would have after round-tripping through NormalString.
    /// ArrayValue becomes ArrayExpr, ObjectValue becomes CallExpr("object", ...).
    /// </summary>
    private static EvalExpr Normalise(EvalExpr expr)
    {
        return expr switch
        {
            ValueExpr { Value: ArrayValue av } => new ArrayExpr(av.Values.Select(Normalise)),
            ValueExpr { Value: ObjectValue ov } => new CallExpr("object",
                ov.Properties.SelectMany(kv => new EvalExpr[]
                {
                    new ValueExpr(kv.Key),
                    Normalise(kv.Value)
                }).ToList()),
            ArrayExpr ae => new ArrayExpr(ae.Values.Select(Normalise), ae.Location, ae.Data),
            CallExpr ce => new CallExpr(ce.Function, ce.Args.Select(Normalise).ToList(), ce.Location, ce.Data),
            LetExpr le => new LetExpr(
                le.Vars.Select(v => (v.Item1, Normalise(v.Item2))),
                Normalise(le.In),
                le.Location,
                le.Data),
            LambdaExpr lam => new LambdaExpr(lam.Variable, Normalise(lam.Value), lam.Location, lam.Data),
            _ => expr,
        };
    }
}
