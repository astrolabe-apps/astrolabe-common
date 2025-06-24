using System.Reflection;
using Astrolabe.Annotation;
using Astrolabe.CodeGen.Typescript;

namespace Astrolabe.Schemas.CodeGen;


public static class DefaultSchemaResolver
{
    public static Func<Type, ResolvedSchema> Create(Func<Type, TsImport> importer)
    {
        return x =>
        {
            var primType = GetPrimitiveTsType(x);
            if (x.IsEnum)
                return ResolvedSchema.Primitive(importer(x).TypeRef);
            if (primType != null)
                return ResolvedSchema.Primitive(new TsTypeRef(primType));
            var schemaGenAttr = x.GetCustomAttribute<SchemaGenAttribute>();
            var flattened = FlattenedTypeName(x);
            var endsWithForm = flattened.EndsWith("Form");
            var formTypeName = schemaGenAttr?.FormName ?? (endsWithForm ? flattened : flattened + "Form");
            var includeApi = schemaGenAttr?.ApiClass ?? !endsWithForm;
            var schemaConstName = flattened + "Schema";
            return new ResolvedSchema(includeApi ? importer(x) : null, new TsRawExpr(schemaConstName), new TsTypeRef(formTypeName), formTypeName, schemaConstName, new TsConstExpr(flattened), "default"+formTypeName);
        };
    }

    public static string? GetPrimitiveTsType(Type type)
    {
        if (IsTsStringType(type)) return "string";
        if (IsTsNumberType(type)) return "number";
        if (IsTsBoolType(type)) return "boolean";
        return IsTsAnyType(type) ? "any" : null;
    }
    
    public static bool IsTsAnyType(Type type)
    {
        return type == typeof(object)
               || (
                   type.IsGenericType
                   && typeof(IDictionary<,>).IsAssignableFrom(type.GetGenericTypeDefinition())
               );
    }

    public static bool IsTsStringType(Type type)
    {
        return type == typeof(string)
               || type == typeof(Guid)
               || type == typeof(DateTime)
               || type == typeof(DateOnly)
               || type == typeof(TimeOnly)
               || type == typeof(DateTimeOffset);
    }

    public static bool IsTsNumberType(Type type)
    {
        return type == typeof(int)
               || type == typeof(double)
               || type == typeof(long)
               || type == typeof(short)
               || type == typeof(ushort)
               || type == typeof(decimal);
    }

    public static bool IsTsBoolType(Type type)
    {
        return type == typeof(bool);
    }
    
    public static string FlattenedTypeName(Type type)
    {
        if (!type.IsGenericType) return type.Name;
        var args = type.GetGenericArguments();
        return args[0].Name + type.Name[..type.Name.IndexOf('`')];
    }
    public static string ToTsTypeName(string typeName)
    {
        if (char.IsAsciiLetterUpper(typeName[0]))
            return typeName;
        return char.ToUpper(typeName[0]) + typeName[1..];
    }

    public static Func<Type, TsImport> ClientImport(string clientModule)
    {
        return x => new TsImport(clientModule, ToTsTypeName(FlattenedTypeName(x)));
    }
}