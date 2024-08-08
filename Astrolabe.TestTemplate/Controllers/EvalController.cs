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
        var result = valEnv.Evaluate(ExprParser.Parse(evalData.Expression));
        return new EvalResult(result.Value.ToNative(), result.Env.Errors.Select(x => x.Message));
    }
}

public record EvalData(string Expression, IDictionary<string, object?> Data);

public record EvalResult(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] object? Result,
    IEnumerable<string> Errors
);
