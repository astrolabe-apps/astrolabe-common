using Astrolabe.CodeGen.Typescript;
using Astrolabe.Schemas.CodeGen;

namespace __ProjectName__.Controllers;

public static class EditorTsImporter
{
    private static readonly HashSet<string> FormLibTypes = new()
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
        "ControlDisableType",
    };

    public static Func<Type, TsImport> MakeImporter(string clientModule)
    {
        var fallback = DefaultSchemaResolver.ClientImport(clientModule);
        return x =>
        {
            var nameOnly = x.Name;
            return FormLibTypes.Contains(nameOnly)
                ? SchemaFieldsGenerator.FormLibImport(nameOnly)
                : fallback(x);
        };
    }
}
