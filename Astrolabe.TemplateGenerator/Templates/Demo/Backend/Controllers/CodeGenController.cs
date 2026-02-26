using System.IO;
using System.Text.Json;
using __ProjectName__.Forms;
using __ProjectName__.Services;
using Astrolabe.CodeGen.Typescript;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Microsoft.AspNetCore.Mvc;

namespace __ProjectName__.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CodeGenController : ControllerBase
{
    private static readonly JsonSerializerOptions Indented = new() { WriteIndented = true };

    [HttpGet("schemas")]
    public string GetSchemas()
    {
        var schemaTypes = AppForms.Forms.Select(x => x.GetSchema());
        var gen = new SchemaFieldsGenerator(
            new SchemaFieldsGeneratorOptions(EditorTsImporter.MakeImporter("../client-common"))
        );
        var decls = gen.CollectDataForTypes(schemaTypes.ToArray());
        return TsFile
            .FromDeclarations(GeneratedSchema.ToDeclarations(decls.ToList(), "SchemaMap").ToList())
            .ToSource();
    }

    [HttpGet("forms")]
    public async Task<string> GetForms([FromServices] IWebHostEnvironment hostEnvironment)
    {
        var formDefsDir = Path.Combine(hostEnvironment.ContentRootPath, FormService.FormDefDir);
        Directory.CreateDirectory(formDefsDir);

        foreach (var appForm in AppForms.Forms)
        {
            var jsonFile = Path.Join(formDefsDir, appForm.Value + ".json");
            if (!System.IO.File.Exists(jsonFile))
            {
                await System.IO.File.WriteAllTextAsync(
                    jsonFile,
                    JsonSerializer.Serialize(
                        new { controls = Enumerable.Empty<object>(), config = new { } },
                        Indented
                    )
                );
            }
        }

        return FormDefinition
            .GenerateFormModule("FormDefinitions", AppForms.Forms, "./schemas", "./formDefs/")
            .ToSource();
    }

    [HttpGet("SchemasSchemas")]
    public string GetSchemasSchemas()
    {
        var gen = new SchemaFieldsGenerator(
            new SchemaFieldsGeneratorOptions(EditorTsImporter.MakeImporter("../client-common"))
        );
        var allGenSchemas = gen.CollectDataForTypes(typeof(SchemaField), typeof(ControlDefinition))
            .ToList();
        var file = TsFile.FromDeclarations(
            GeneratedSchema.ToDeclarations(allGenSchemas, "ControlDefinitionSchemaMap").ToList()
        );
        return file.ToSource();
    }

    [HttpPost("{form}")]
    public async Task SaveForm(
        string form,
        [FromBody] JsonElement body,
        [FromServices] IWebHostEnvironment environment
    )
    {
        var path = Path.Join(environment.ContentRootPath, FormService.FormDefDir, form + ".json");
        await System.IO.File.WriteAllTextAsync(path, JsonSerializer.Serialize(body, Indented));
    }
}
