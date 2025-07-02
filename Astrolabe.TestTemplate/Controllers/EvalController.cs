using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Astrolabe.Evaluator;
using Astrolabe.Evaluator.Functions;
using Astrolabe.Validation;
using Microsoft.AspNetCore.Mvc;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EvalController : ControllerBase
{
    [HttpPost]
    public async Task<EvalResult> Eval([FromBody] EvalData evalData)
    {
        var valEnv = RuleValidator.FromData(
            JsonDataLookup.FromObject(JsonSerializer.SerializeToNode(evalData.Data))
        );
        var evalExpr = ExprParser.Parse(evalData.Expression);
        var result = valEnv.Evaluate(evalExpr);
        var normalString = evalExpr.ToNormalString();
        return new EvalResult(
            ToValueWithDeps(result.Value),
            result.Env.Errors.Select(x => x.Message),
            normalString + ":"+ NormalString.Parse(normalString).Result.ToNormalString()
        );
    }

    public static ValueWithDeps ToValueWithDeps(ValueExpr expr)
    {
        var value = expr.Value switch
        {
            ArrayValue av => av.Values.Select(ToValueWithDeps),
            ObjectValue ov => ov.Object,
            var v => v
        };
        return new ValueWithDeps(
            value,
            expr.Path?.ToPathString(),
            expr.Deps?.Select(x => x.ToPathString())
        );
    }
}

public record EvalData(string Expression, IDictionary<string, object?> Data);

public record EvalResult(ValueWithDeps Result, IEnumerable<string> Errors, string NormalString);

public record ValueWithDeps(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] object? Value,
    string? Path,
    IEnumerable<string>? Deps
);
