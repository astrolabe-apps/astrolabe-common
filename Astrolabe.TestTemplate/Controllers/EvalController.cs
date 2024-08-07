using System.Text.Json;
using System.Text.Json.Nodes;
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
    public async Task<ActionResult<JsonElement>> Eval([FromBody] EvalData evalData)
    {
        var valEnv = RuleValidator.FromData(
            JsonDataLookup.FromObject(JsonSerializer.SerializeToNode(evalData.Data))
        );
        var result = valEnv.Evaluate(ExprParser.Parse(evalData.Expression));
        return Ok(result.Value.ToNative());
    }
}

public record EvalData(string Expression, IDictionary<string, object?> Data);
