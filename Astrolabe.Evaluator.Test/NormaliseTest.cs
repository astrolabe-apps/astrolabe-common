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
        Prop.ForAll(ExprGen.EvalExpr.ToArbitrary(),
                x =>
                {
                    var normalString = x.ToNormalString();
                    var reflected = JsonSerializer.Serialize(NormalString.Parse(normalString).Result);
                    Assert.Equivalent(JsonSerializer.Serialize(x), reflected);
                }
            )
            // .QuickCheckThrowOnFailure();
            .Check(Config.VerboseThrowOnFailure.WithReplay(11188303408321914308,5320079614174359401, 11));
    }
}