using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using Astrolabe.CodeGen.Typescript;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Astrolabe.Web.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using __AppName__.Forms;
using __AppName__.Services;

namespace __AppName__.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CodeGenController : ControllerBase
{
    [HttpGet("Schemas")]
    public string GetSchemas()
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

    [AllowAnonymous]
    [HttpGet("forms")]
    public async Task<string> GetForms([FromServices] IHostEnvironment hostEnvironment)
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
                    JsonConvert.SerializeObject(
                        new { controls = Enumerable.Empty<object>(), config = new { } },
                        Formatting.Indented
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
}
