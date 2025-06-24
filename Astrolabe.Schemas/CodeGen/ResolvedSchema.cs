using Astrolabe.CodeGen.Typescript;

namespace Astrolabe.Schemas.CodeGen;

public record ResolvedSchema(
    TsImport? ApiImport,
    TsExpr SchemaRefExpr,
    TsType FormType,
    string FormTypeName,
    string SchemaConstName,
    TsExpr SchemaRefNameExpr,
    string DefaultValueName)
{
    public static string FlattenedTypeName(Type type)
    {
        if (!type.IsGenericType) return type.Name;
        var args = type.GetGenericArguments();
        return args[0].Name + type.Name[..type.Name.IndexOf('`')];
    }

    public static ResolvedSchema Primitive(TsType primitiveType)
    {
        return new ResolvedSchema(null, new TsRawExpr("ERROR"), primitiveType, "ERROR", "ERROR", new TsRawExpr("ERROR"), "ERROR");
    }

    public static string ToTsTypeName(string typeName)
    {
        if (char.IsAsciiLetterUpper(typeName[0]))
            return typeName;
        return char.ToUpper(typeName[0]) + typeName[1..];
    }
}
