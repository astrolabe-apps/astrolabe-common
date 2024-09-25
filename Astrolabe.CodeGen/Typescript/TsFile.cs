using System.Collections;
using System.Globalization;
using System.Text.Json;

namespace Astrolabe.CodeGen.Typescript;

public record TsFile(IEnumerable<TsDeclaration> Declarations)
{
    public static TsFile FromDeclarations(ICollection<TsDeclaration> allDeclarations)
    {
        return new TsFile(
            allDeclarations.Prepend(
                new TsImports(allDeclarations.SelectMany(x => x.CollectImports()))
            )
        );
    }
}

public interface TsImportable
{
    IEnumerable<TsImport> AllImports();
}

public record TsImport(string File, string Import, bool DefaultImport = false) : TsImportable
{
    public IEnumerable<TsImport> AllImports()
    {
        return new[] { this };
    }

    public TsTypeRef TypeRef => new(Import, this);

    public TsRawExpr Ref => new(Import, this);

    public TsGenericType GenericType(params TsType[] typeArgs)
    {
        return new TsGenericType(TypeRef, typeArgs);
    }
}

public interface TsBase;

public interface TsDeclaration : TsBase;

public interface TsExpr : TsBase;

public abstract record TsParentExpr(IEnumerable<TsBase> Children) : TsExpr, TsImportable
{
    public IEnumerable<TsImport> AllImports()
    {
        return Children.SelectMany(x => x.CollectImports());
    }
}

public interface TsStatement;

public record TsImports(IEnumerable<TsImport> Imports) : TsDeclaration, TsImportable
{
    public IEnumerable<TsImport> AllImports()
    {
        return Imports;
    }
}

public record TsRawFunction(string Def, TsImportable? Imports = null) : TsDeclaration;

public record TsFunction(
    string Name,
    IEnumerable<TsArg> Args,
    TsType? ReturnType,
    IEnumerable<TsStatement> Body
) : TsDeclaration;

public record TsAssignment(string Name, TsExpr Expr, TsType? Type = null) : TsDeclaration;

public record TsInterface(string Name, TsObjectType ObjectType) : TsDeclaration;

public record TsObjectType(IEnumerable<TsFieldType> Fields);

public record TsFunctionType(
    IEnumerable<TsType> ArgTypes,
    TsType ReturnType,
    bool Undefinable = false,
    bool Nullable = false
) : TsType(Undefinable, Nullable);

public record TsType(bool Undefinable, bool Nullable) : TsBase;

public record TsTypeRef(
    string Name,
    TsImportable? Imports = null,
    bool Undefinable = false,
    bool Nullable = false
) : TsType(Undefinable, Nullable);

public record TsArrayType(TsType OfType, bool Undefinable = false, bool Nullable = false)
    : TsType(Undefinable, Nullable);

public record TsGenericType(
    TsType BaseType,
    IEnumerable<TsType> GenTypes,
    bool Undefinable = false,
    bool Nullable = false
) : TsType(Undefinable, Nullable);

public record TsTypeParamExpr(TsExpr Expr, IEnumerable<TsType> Types) : TsExpr;

public record TsStringConstantType(string Value) : TsType(false, false);

public record TsTypeSet(IEnumerable<TsType> Types) : TsType(false, false);

public record TsFieldType(string Field, bool Optional, TsType Type);

public record TsObjectExpr(IEnumerable<TsObjectField> Fields) : TsExpr
{
    public static TsObjectExpr Make(params TsObjectField[] fields)
    {
        return new TsObjectExpr(fields);
    }

    public TsObjectExpr SetField(TsObjectField field)
    {
        var existing = Fields.FirstOrDefault(x => x.Field.ToSource() == field.Field.ToSource());
        if (existing != null)
        {
            return new TsObjectExpr(Fields: Fields.Select(x => x == existing ? field : x).ToList());
        }

        return new TsObjectExpr(Fields.Append(field).ToList());
    }
}

public record TsObjectField(TsExpr Field, TsExpr Value)
{
    public static TsObjectField NamedField(string name, TsExpr value)
    {
        return new TsObjectField(new TsRawExpr(name), value);
    }

    public static TsObjectField ForVariable(TsExpr varExpr)
    {
        return new TsObjectField(varExpr, varExpr);
    }
}

public record TsAsExpr(TsExpr Expr, TsType As) : TsParentExpr([Expr, As]);

public record TsArrayExpr(IEnumerable<TsExpr> Elements) : TsExpr;

public record TsPropertyExpr(TsExpr Object, TsExpr Field) : TsParentExpr([Object, Field]);

public record TsCallExpression(TsExpr Function, IEnumerable<TsExpr> Args) : TsExpr
{
    public static TsCallExpression Make(TsExpr expr, params TsExpr[] args)
    {
        return new TsCallExpression(expr, args);
    }
}

public record TsNewExpression(TsType ClassType, IEnumerable<TsExpr> Args) : TsExpr;

public record TsAnonFunctionExpression(IEnumerable<TsArg> ArgDefs, TsExpr Body) : TsExpr;

public record TsRawExpr(string Source, TsImportable? Imports = null) : TsExpr;

public record TsConstExpr(object? Value) : TsExpr;

public record TsExprStatement(TsExpr Expr) : TsStatement;

public record TsEnumValueExpr(TsType EnumType, string Member) : TsExpr;

public record TsArg(string Name, TsType? Type);

public static class TsToSource
{
    // TODO proper precedence
    public static string MaybeBracketType(this TsType tsType)
    {
        var needsEscape = tsType switch
        {
            TsTypeSet typeSet when typeSet.Types.Count() > 1 => true,
            _ => tsType.Undefinable || tsType.Nullable
        };
        return needsEscape ? $"({tsType.ToSource()})" : tsType.ToSource();
    }

    public static string ToSource(this TsType tsType)
    {
        var mainType = tsType switch
        {
            TsArrayType tsArrayType => $"{tsArrayType.OfType.MaybeBracketType()}[]",
            TsTypeRef tsTypeRef => $"{tsTypeRef.Name}",
            TsGenericType tsGenType
                => $"{tsGenType.BaseType.ToSource()}<{string.Join(", ", tsGenType.GenTypes.Select(x => x.ToSource()))}>",
            TsFunctionType tsFuncType
                => $"({string.Join(", ", tsFuncType.ArgTypes.Select(x => x.ToSource()))}) => {tsFuncType.ReturnType.ToSource()}",
            TsStringConstantType(var v) => EscapeString(v),
            TsTypeSet tsTypeSet => string.Join("|", tsTypeSet.Types.Select(x => x.ToSource())),
            _ => throw new ArgumentOutOfRangeException(nameof(tsType))
        };
        return $"{mainType}{(tsType.Nullable ? " | null" : "")}{(tsType.Undefinable ? " | undefined" : "")}";
    }

    public static string ToSource(this TsStatement statement)
    {
        return statement switch
        {
            TsExprStatement tsExprStatement => tsExprStatement.Expr.ToSource() + ";"
        };
    }

    public static string ToSource(this TsFieldType tsFieldType)
    {
        return $"{tsFieldType.Field}{(tsFieldType.Optional ? "?" : "")}: {tsFieldType.Type.ToSource()};";
    }

    public static string ToSource(this TsObjectType tsObjectType)
    {
        return "{\n" + string.Join("\n", tsObjectType.Fields.Select(f => f.ToSource())) + "\n}\n";
    }

    public static string OptionalType(TsType? type)
    {
        return type?.ToSource() is { } v ? " : " + v : "";
    }

    public static string ToSource(this TsDeclaration tsDeclaration)
    {
        return tsDeclaration switch
        {
            TsAssignment tsAssignment
                => $"export const {tsAssignment.Name}{OptionalType(tsAssignment.Type)} = {tsAssignment.Expr.ToSource()}",
            TsImportable tsImports
                => string.Join(
                    ";\n",
                    tsImports
                        .AllImports()
                        .ToHashSet()
                        .ToLookup(x => x.File)
                        .Select(x => ImportString(x.Key, x.ToList()))
                ),
            TsInterface tsInterface
                => "export interface " + tsInterface.Name + " " + tsInterface.ObjectType.ToSource(),
            TsRawFunction tsRawFunction => "export " + tsRawFunction.Def,
            TsFunction tsFunction
                => $"export function {tsFunction.Name}({string.Join(", ", tsFunction.Args.Select(x => x.ToSource()))}) {'{'} {string.Join("\n", tsFunction.Body.Select(x => x.ToSource()))} {'}'}",
            _ => throw new ArgumentOutOfRangeException(nameof(tsDeclaration))
        };

        string ImportString(string file, IList<TsImport> imports)
        {
            var defaultImport = imports.FirstOrDefault(x => x.DefaultImport)?.Import;
            var nonDefaults = imports.Where(x => !x.DefaultImport).Select(x => x.Import).ToList();
            IEnumerable<string?> allImports = [defaultImport, JoinWith(',', '{', '}', nonDefaults)];

            return $"import {string.Join(',', allImports.OfType<string>())} from {EscapeString(file)}";
        }
    }

    private static string? JoinWith<T>(char c, char start, char end, ICollection<T> vals)
    {
        if (vals.Count == 0)
            return null;
        return start + string.Join(c, vals) + end;
    }

    public static string ToSource(this TsArg tsArg)
    {
        return tsArg.Name + OptionalType(tsArg.Type);
    }

    public static string ToSource(this TsFile tsFile)
    {
        return string.Join("\n\n", tsFile.Declarations.Select(ToSource));
    }

    public static IEnumerable<TsImport> CollectImports(this TsType tsType)
    {
        return tsType switch
        {
            TsArrayType tsArrayType => tsArrayType.OfType.CollectImports(),
            TsTypeRef tsTypeRef => tsTypeRef.Imports?.AllImports() ?? Array.Empty<TsImport>(),
            TsGenericType tsGenType
                => tsGenType
                    .BaseType.CollectImports()
                    .Concat(tsGenType.GenTypes.SelectMany(x => x.CollectImports())),
            TsFunctionType tsFunctionType
                => tsFunctionType
                    .ArgTypes.SelectMany(x => x.CollectImports())
                    .Concat(tsFunctionType.ReturnType.CollectImports()),
            TsStringConstantType => Array.Empty<TsImport>(),
            TsTypeSet(var types) => types.SelectMany(CollectImports),
            _ => throw new ArgumentOutOfRangeException(nameof(tsType))
        };
    }

    public static string EscapeString(string value)
    {
        return $"\"{value}\"";
    }

    public static string ToSource(this TsConstExpr tsConstExpr)
    {
        return tsConstExpr.Value switch
        {
            string s => EscapeString(s),
            int i => i.ToString(),
            double d => d.ToString(CultureInfo.InvariantCulture),
            null => "null",
            bool b => b ? "true" : "false",
            IDictionary d
                => new TsObjectExpr(
                    d.Keys.Cast<object>()
                        .Select(x => new TsObjectField(new TsConstExpr(x), new TsConstExpr(d[x])))
                ).ToSource(),
            IEnumerable v
                => new TsArrayExpr(
                    v.Cast<object>().Select(x => new TsConstExpr(x)).ToList()
                ).ToSource(),
            var v
                => new TsObjectExpr(
                    v.GetType()
                        .GetProperties()
                        .Select(x => new TsObjectField(
                            new TsRawExpr(JsonNamingPolicy.CamelCase.ConvertName(x.Name)),
                            new TsConstExpr(x.GetMethod!.Invoke(v, new object[] { }))
                        ))
                        .ToList()
                ).ToSource(),
        };
    }

    public static string ToSource(this TsExpr tsExpr)
    {
        return tsExpr switch
        {
            TsAsExpr tsAs => $"{tsAs.Expr.ToSource()} as {tsAs.As.ToSource()}",
            TsArrayExpr tsArrayExpr
                => "[" + string.Join(", ", tsArrayExpr.Elements.Select(x => x.ToSource())) + "]",
            TsCallExpression tsCallExpression
                => $"{tsCallExpression.Function.ToSource()}("
                    + string.Join(", ", tsCallExpression.Args.Select(x => x.ToSource()))
                    + ")",
            TsPropertyExpr propExpr => $"{propExpr.Object.ToSource()}.{propExpr.Field.ToSource()}",
            TsObjectExpr tsObjectExpr
                => "{\n"
                    + string.Join(
                        ",\n",
                        tsObjectExpr.Fields.Select(x =>
                            $"{x.Field.ToSource()}: {x.Value.ToSource()}"
                        )
                    )
                    + "\n}\n",
            TsRawExpr tsRawExpr => tsRawExpr.Source,
            TsConstExpr tsConstExpr => tsConstExpr.ToSource(),
            TsTypeParamExpr tsTypeParamExpr
                => $"{tsTypeParamExpr.Expr.ToSource()}<{string.Join(", ", tsTypeParamExpr.Types.Select(x => x.ToSource()))}>",
            TsNewExpression tsNewExpression
                => $"new {tsNewExpression.ClassType.ToSource()}({string.Join(", ", tsNewExpression.Args.Select(x => x.ToSource()))})",
            TsAnonFunctionExpression tsAnon
                => $"({string.Join(", ", tsAnon.ArgDefs.Select(x => x.ToSource()))}) => {tsAnon.Body.ToSource()}",
            TsEnumValueExpr tsEnumValue
                => $"{tsEnumValue.EnumType.ToSource()}.{tsEnumValue.Member}",
            _ => throw new ArgumentOutOfRangeException(nameof(tsExpr))
        };
    }

    public static IEnumerable<TsImport> CollectImports(this TsExpr tsExpr)
    {
        return tsExpr switch
        {
            TsImportable importable => importable.AllImports(),
            TsArrayExpr tsArrayExpr => tsArrayExpr.Elements.SelectMany(x => x.CollectImports()),
            TsCallExpression tsCallExpression
                => tsCallExpression
                    .Args.SelectMany(x => x.CollectImports())
                    .Concat(tsCallExpression.Function.CollectImports()),
            TsObjectExpr tsObjectExpr
                => tsObjectExpr.Fields.SelectMany(x =>
                    x.Value.CollectImports().Concat(x.Field.CollectImports())
                ),
            TsRawExpr tsRawExpr => tsRawExpr.Imports?.AllImports() ?? Array.Empty<TsImport>(),
            TsConstExpr tsConst => Array.Empty<TsImport>(),
            TsTypeParamExpr { Expr: var e, Types: var t }
                => e.CollectImports().Concat(t.SelectMany(CollectImports)),
            TsNewExpression tsNew
                => tsNew
                    .Args.SelectMany(x => x.CollectImports())
                    .Concat(tsNew.ClassType.CollectImports()),
            TsAnonFunctionExpression tsAnon
                => tsAnon
                    .ArgDefs.SelectMany(x => x.CollectImports())
                    .Concat(tsAnon.Body.CollectImports()),
            TsEnumValueExpr tsEnumValueExpr => tsEnumValueExpr.EnumType.CollectImports(),
            _ => throw new ArgumentOutOfRangeException(nameof(tsExpr))
        };
    }

    static IEnumerable<TsImport> CollectImports(this TsStatement tsStatement)
    {
        return tsStatement switch
        {
            TsExprStatement tsExprStatement => tsExprStatement.Expr.CollectImports()
        };
    }

    static IEnumerable<TsImport> CollectImports(this TsArg tsArg)
    {
        return tsArg.Type?.CollectImports() ?? Array.Empty<TsImport>();
    }

    public static IEnumerable<TsImport> CollectImports(this TsDeclaration tsDeclaration)
    {
        return tsDeclaration switch
        {
            TsAssignment tsAssignment => tsAssignment.Expr.CollectImports(),
            TsImportable t => t.AllImports(),
            TsInterface tsInterface
                => tsInterface.ObjectType.Fields.SelectMany(x => x.Type.CollectImports()),
            TsRawFunction tsRawFunction
                => tsRawFunction.Imports?.AllImports() ?? Array.Empty<TsImport>(),
            TsFunction tsFunction
                => tsFunction
                    .Args.SelectMany(x => x.CollectImports())
                    .Concat(tsFunction.ReturnType?.CollectImports() ?? Array.Empty<TsImport>())
                    .Concat(tsFunction.Body.SelectMany(x => x.CollectImports())),
        };
    }

    public static IEnumerable<TsImport> CollectImports(this TsBase baseNode)
    {
        return baseNode switch
        {
            TsImportable ts => ts.AllImports(),
            TsExpr e => e.CollectImports(),
            TsDeclaration d => d.CollectImports(),
            TsType t => t.CollectImports()
        };
    }
}
