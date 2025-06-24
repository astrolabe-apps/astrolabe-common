using Astrolabe.CodeGen;
using Astrolabe.CodeGen.Typescript;

namespace Astrolabe.Schemas.CodeGen;

public class SchemaFieldsGeneratorOptions : BaseGeneratorOptions
{
    public Func<Type, TsImport> ImportType { get; }
    private Func<Type, ResolvedSchema> ResolveSchema { get; }
    private Dictionary<Type, ResolvedSchema> ResolvedSchemas { get; } = new();

    public SchemaFieldsGeneratorOptions(Func<Type, TsImport> importType, Func<Type, ResolvedSchema>? resolveSchema = null)
    {
        ImportType = importType;
        ResolveSchema = resolveSchema ?? DefaultSchemaResolver.Create(importType);
    }

    public SchemaFieldsGeneratorOptions(string clientModule) : this(DefaultSchemaResolver.ClientImport(clientModule))
    {
    }

    public ResolvedSchema GetResolvedSchema(Type type)
    {
        if (ResolvedSchemas.TryGetValue(type, out var schema))
            return schema;
        schema = ResolveSchema(type);
        ResolvedSchemas[type] = schema;
        return schema;
    }

    public Func<string, string>? DisplayNameFromProperty { get; set; }

    public Func<Type, string?>? CustomFieldType { get; set; }

    public IEnumerable<string>? CustomFieldTypes { get; set; }
    
    public bool DontResolve { get; set; }
    
    //
    // public string FormTypeName(Type type)
    // {
    //     return FlattenedTypeName(type) + "Form";
    // }
    //
    // public string SchemaConstName(Type type)
    // {
    //     return FlattenedTypeName(type) + "Schema";
    // }
    //
    // public string SchemaRefName(Type type)
    // {
    //     return FlattenedTypeName(type);
    // }

}