using System.Text.Json;
using System.Text.Json.Serialization;
using Astrolabe.Evaluator;
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
            var variables = evalData.Data.ToDictionary(
                kvp => kvp.Key, EvalExpr (kvp) =>
                {
                    var jsonNode = JsonSerializer.SerializeToNode(kvp.Value);
                    return JsonDataLookup.ToValue(null, jsonNode);
                }
            );

            // Create partial evaluation environment with variables
            var partialEnv = EvalEnvFactory.CreatePartialEnv(variables);

            var result = partialEnv.Uninline(partialEnv.EvaluateExpr(evalExpr));

            // Collect errors from result tree
            var errors = result is ValueExpr ve
                ? ValueExpr.CollectAllErrors(ve)
                : [];

            return new EvalResult(
                result.Print(),
                errors
            );
        }
        else
        {
            // Create basic evaluation environment with data
            var jsonData = JsonSerializer.SerializeToNode(evalData.Data);
            var env = EvalEnvFactory.BasicEnv(jsonData);

            var result = env.EvaluateExpr(evalExpr);

            if (result is not ValueExpr resultValue)
            {
                return new EvalResult(result.Print(), []);
            }

            // Collect errors from result tree
            var errors = ValueExpr.CollectAllErrors(resultValue);

            return new EvalResult(
                includeDeps ? ToValueWithDeps(resultValue) : ToValueWithoutDeps(resultValue),
                errors
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
