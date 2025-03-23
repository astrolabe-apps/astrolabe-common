using System.Text.Json;
using Astrolabe.CodeGen.Typescript;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Astrolabe.TestTemplate.Forms;
using Microsoft.AspNetCore.Mvc;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CodeGenController : ControllerBase
{
    [HttpGet("Schemas")]
    public string GetSchemas()
    {
        var gen = new SchemaFieldsGenerator(
            new SchemaFieldsGeneratorOptions("../client") { ForEditorLib = true }
        );
        var allGenSchemas = gen.CollectDataForTypes(typeof(SchemaField), typeof(ControlDefinition))
            .ToList();
        var file = TsFile.FromDeclarations(
            GeneratedSchema.ToDeclarations(allGenSchemas, "ControlDefinitionSchemaMap").ToList()
        );
        return file.ToSource();
    }

    [HttpPut("ControlDefinition")]
    public async Task EditControlDefinition(
        JsonElement formData,
        [FromServices] IWebHostEnvironment environment
    )
    {
        var path = Path.Join(
            environment.ContentRootPath,
            $"ClientApp/sites/formServer/src/ControlDefinition.json"
        );
        await System.IO.File.WriteAllTextAsync(
            path,
            JsonSerializer.Serialize(formData, new JsonSerializerOptions { WriteIndented = true })
        );
    }
    
    [HttpPut("SchemaField")]
    public async Task EditSchemaFieldDefinition(
        JsonElement formData,
        [FromServices] IWebHostEnvironment environment
    )
    {
        var path = Path.Join(
            environment.ContentRootPath,
            $"ClientApp/sites/formServer/src/SchemaField.json"
        );
        await System.IO.File.WriteAllTextAsync(
            path,
            JsonSerializer.Serialize(formData, new JsonSerializerOptions { WriteIndented = true })
        );
    }

}
