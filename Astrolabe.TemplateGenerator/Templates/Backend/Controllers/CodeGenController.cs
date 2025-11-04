using System.Text.Json;
using __AppName__.Forms;
using Astrolabe.CodeGen.Typescript;
using Astrolabe.Schemas;
using Astrolabe.Schemas.CodeGen;
using Microsoft.AspNetCore.Mvc;

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

    [HttpGet("Forms")]
    public string GetForms()
    {
        return FormDefinition
            .GenerateFormModule("FormDefinitions", AppForms.Forms, "./schemas", "./")
            .ToSource();
    }
}
