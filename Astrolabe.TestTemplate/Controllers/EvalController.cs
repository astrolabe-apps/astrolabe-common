using System.Collections.Immutable;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Astrolabe.Evaluator;
using Astrolabe.Evaluator.Functions;
using Astrolabe.Validation;
using Microsoft.AspNetCore.Mvc;
using EvaluatorData = Astrolabe.Evaluator.EvalData;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EvalController : ControllerBase
{
    [HttpPost]
    public async Task<EvalResult> Eval([FromBody] EvalData evalData, bool includeDeps = false, bool partialEval = false)
    {
        var evalExpr = ExprParser.Parse(evalData.Expression);

        if (partialEval)
        {
            // Partial evaluation mode - treat data fields as compile-time variables
            var variables = evalData.Data.ToDictionary(
                kvp => kvp.Key, EvalExpr (kvp) => JsonDataLookup.ToValue(null, JsonSerializer.SerializeToNode(kvp.Value))
            );

            var state = new EvalEnvironmentState(
                Data: new EvaluatorData(ValueExpr.Undefined, (_, __) => ValueExpr.Undefined),
                Current: ValueExpr.Undefined,
                Compare: EvalEnvironment.DefaultComparison,
                LocalVariables: variables.ToImmutableDictionary(),
                Parent: null,
                Errors: ImmutableList<EvalError>.Empty
            );

            var env = new PartialEvalEnvironment(state).AddDefaultFunctions() as PartialEvalEnvironment;
            var partialResult = env!.PartialEvaluate(evalExpr);

            return new EvalResult(
                partialResult.Print(),
                env.State.Errors.Select(x => x.Message)
            );
        }
        else
        {
            // Normal evaluation mode
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

public record EvalData(string Expression, IDictionary<string, object?> Data);

public record EvalResult(object? Result, IEnumerable<string> Errors);

public record ValueWithDeps(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] object? Value,
    string? Path,
    IEnumerable<string>? Deps
);
