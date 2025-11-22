using System.Text.Json;
using System.Text.Json.Serialization;
using Astrolabe.Evaluator;
using Astrolabe.Validation;
using Microsoft.AspNetCore.Mvc;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EvalController : ControllerBase
{
    [HttpPost]
    public async Task<EvalResult> Eval([FromBody] EvalTestData evalData, bool includeDeps = false, bool partialEval = false)
    {
        var evalExpr = ExprParser.Parse(evalData.Expression);

        if (partialEval)
        {
            // For partial evaluation, treat data fields as variables
            // Convert each data value to a proper ValueExpr structure via JsonNode
            var variables = evalData.Data.Select(kvp =>
            {
                var jsonNode = JsonSerializer.SerializeToNode(kvp.Value);
                var valueExpr = JsonDataLookup.ToValue(null, jsonNode);
                return new KeyValuePair<string, EvalExpr>(kvp.Key, valueExpr);
            }).ToList();

            // Create environment with undefined data (property access returns PropertyExpr for symbolic evaluation)
            var partialEnv = RuleValidator.FromData(
                EvalData.UndefinedData()
            ).WithVariables(variables);

            var result = partialEnv.EvaluatePartial(evalExpr);

            return new EvalResult(
                PrintExpr.Print(result.Value),
                result.Env.Errors.Select(x => x.Message)
            );
        }
        else
        {
            var valEnv = RuleValidator.FromData(
                JsonDataLookup.FromObject(JsonSerializer.SerializeToNode(evalData.Data))
            );
            var result = valEnv.Evaluate(evalExpr);
            return new EvalResult(
                includeDeps ? ToValueWithDeps(result.Value) : ToValueWithoutDeps(result.Value),
                result.Env.Errors.Select(x => x.Message)
            );
        }
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
            expr.Deps?.SelectMany(ValueExpr.ExtractAllPaths).Select(x => x.ToPathString())
        );
    }
}

public record EvalTestData(string Expression, IDictionary<string, object?> Data);

public record EvalResult(object? Result, IEnumerable<string> Errors);

public record ValueWithDeps(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] object? Value,
    string? Path,
    IEnumerable<string>? Deps
);
