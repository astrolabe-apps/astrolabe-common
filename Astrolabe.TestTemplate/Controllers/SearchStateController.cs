using System.Text.Json;
using Astrolabe.CodeGen.Typescript;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Astrolabe.SearchState;
using Astrolabe.TestTemplate.Forms;
using Microsoft.AspNetCore.Mvc;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchStateController : ControllerBase
{
    private const string FormDefDir = "ClientApp/sites/formServer/src/forms";

    private static readonly JsonSerializerOptions Indented =
        new(FormDataJson.Options) { WriteIndented = true };

    public static SchemaFieldsGeneratorOptions FieldGeneratorOptions = new("./client");

    [HttpGet("Schemas")]
    public string GetSchemas()
    {
        var schemaTypes = AppForms.Forms.Select(x => x.GetSchema());
        var gen = new SchemaFieldsGenerator(new SchemaFieldsGeneratorOptions("./client"));
        var allGenSchemas = gen.CollectDataForTypes(schemaTypes.ToArray()).ToList();
        var file = TsFile.FromDeclarations(
            GeneratedSchema.ToDeclarations(allGenSchemas, "SchemaMap").ToList()
        );
        return file.ToSource();
    }

    [HttpGet("Forms")]
    public async Task<string> GetForms([FromServices] IHostEnvironment hostEnvironment)
    {
        foreach (var appForm in AppForms.Forms)
        {
            var jsonFile = Path.Join(
                hostEnvironment.ContentRootPath,
                FormDefDir,
                appForm.Value + ".json"
            );
            if (!System.IO.File.Exists(jsonFile))
            {
                await System.IO.File.WriteAllTextAsync(
                    jsonFile,
                    JsonSerializer.Serialize(
                        new { Controls = Enumerable.Empty<object>(), Config = new { } },
                        Indented
                    )
                );
            }
        }
        return FormDefinition
            .GenerateFormModule("FormDefinitions", AppForms.Forms, "./schemas", "./forms/")
            .ToSource();
    }

    [HttpPut("ControlDefinition/{id}")]
    public async Task EditControlDefinition(
        string id,
        JsonElement formData,
        [FromServices] IWebHostEnvironment environment
    )
    {
        var path = Path.Join(
            environment.ContentRootPath,
            $"ClientApp/sites/formServer/src/forms/{id}.json"
        );
        await System.IO.File.WriteAllTextAsync(
            path,
            JsonSerializer.Serialize(
                new { Controls = Enumerable.Empty<object>(), Config = new { } },
                Indented
            )
        );
    }
}
