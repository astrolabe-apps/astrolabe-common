using Astrolabe.CodeGen.Typescript;
using Astrolabe.Schemas.CodeGen;

namespace Astrolabe.TestTemplate.Controllers;

public static class EditorTsImporter
{
    private static readonly HashSet<string> FormLibTypes =
        new()
        {
            "FieldType",
            "ControlDefinitionType",
            "DisplayDataType",
            "ExpressionType",
            "DynamicPropertyType",
            "ControlAdornmentType",
            "DataRenderType",
            "SyncTextType",
            "GroupRenderType",
            "DisplayDataType",
            "ControlDefinitionType",
            "ControlDefinition",
            "SchemaFieldType",
            "SchemaField",
            "IconMapping",
            "RenderOptions",
            "GroupRenderOptions",
            "DisplayData",
            "FieldOption",
            "EntityExpression",
            "DynamicProperty",
            "ControlAdornment",
            "SchemaRestrictions",
            "AdornmentPlacement",
            "SchemaValidator",
            "JsonataValidator",
            "DateComparison",
            "DateValidator",
            "IconReference",
            "ActionStyle",
            "IconPlacement",
            "ActionOptions",
            "ControlDisableType"
        };

    private static readonly HashSet<string> EditorLibImports =
        new()
        {
            "SchemaFieldForm",
            "SchemaFieldSchema",
            "ControlDefinitionForm",
            "ControlDefinitionSchema"
        };
    
    private static TsImport EditorLibImport(string type)
    {
        return new TsImport("@astrolabe/schemas-editor/schemaSchemas", type);
    }


    public static Func<Type, TsImport> MakeImporter(string clientModule)
    {
        var fallback = DefaultSchemaResolver.ClientImport(clientModule);
        return x =>
        {
            var nameOnly = x.Name;
            return FormLibTypes.Contains(nameOnly) ? SchemaFieldsGenerator.FormLibImport(nameOnly) : fallback(x);
        };
    }

}