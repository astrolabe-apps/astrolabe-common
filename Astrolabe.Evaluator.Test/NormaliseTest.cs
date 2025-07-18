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
                    var reflected = JsonSerializer.Serialize(
                        NormalString.Parse(normalString).Result
                    );
                    Assert.Equivalent(JsonSerializer.Serialize(x), reflected);
                }
            )
            // .Check(Config.VerboseThrowOnFailure.WithMaxTest(100000));
            .VerboseCheckThrowOnFailure();
        // .Check(Config.VerboseThrowOnFailure.WithReplay(17740565117687559759,4192450112079655587, 4));
    }
}
