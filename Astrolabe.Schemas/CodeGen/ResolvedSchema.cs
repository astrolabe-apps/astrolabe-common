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

    public static ResolvedSchema Primitive(TsType primitiveType)
    {
        return new ResolvedSchema(null, new TsRawExpr("ERROR"), primitiveType, "ERROR", "ERROR", new TsRawExpr("ERROR"), "ERROR");
    }
}
