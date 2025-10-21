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
    public async Task<EvalResult> Eval([FromBody] EvalData evalData, bool includeDeps = false)
    {
        var valEnv = RuleValidator.FromData(
            JsonDataLookup.FromObject(JsonSerializer.SerializeToNode(evalData.Data))
        );
        var evalExpr = ExprParser.Parse(evalData.Expression);
        var result = valEnv.Evaluate(evalExpr);
        return new EvalResult(
            includeDeps ? ToValueWithDeps(result.Value) : ToValueWithoutDeps(result.Value),
            result.Env.Errors.Select(x => x.Message)
        );
    }

    public static object? ToValueWithoutDeps(ValueExpr expr)
    {
        return expr.Value switch
        {
            ArrayValue av => av.Values.Select(ToValueWithoutDeps),
            ObjectValue ov => ov.Properties.ToDictionary(kv => kv.Key, kv => ToValueWithoutDeps(kv.Value)),
            var v => v,
        };
    }

    public static ValueWithDeps ToValueWithDeps(ValueExpr expr)
    {
        var value = expr.Value switch
        {
            ArrayValue av => av.Values.Select(ToValueWithDeps),
            ObjectValue ov => ov.Properties.ToDictionary(kv => kv.Key, kv => ToValueWithDeps(kv.Value)),
            var v => v,
        };
        return new ValueWithDeps(
            value,
            expr.Path?.ToPathString(),
            expr.Deps?.Select(x => x.ToPathString())
        );
    }
}

public record EvalData(string Expression, IDictionary<string, object?> Data);

public record EvalResult(object? Result, IEnumerable<string> Errors);

public record ValueWithDeps(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] object? Value,
    string? Path,
    IEnumerable<string>? Deps
);
