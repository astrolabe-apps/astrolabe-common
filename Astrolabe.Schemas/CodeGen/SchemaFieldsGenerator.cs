using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Astrolabe.Annotation;
using Astrolabe.CodeGen;
using Astrolabe.CodeGen.Typescript;

namespace Astrolabe.Schemas.CodeGen;

public class SchemaFieldsGenerator : CodeGenerator<SchemaFieldData, GeneratedSchema>
{
    private readonly SchemaFieldsGeneratorOptions _options;
    private readonly IEnumerable<TsType> _customFieldTypeParams;

    public SchemaFieldsGenerator(string clientPath)
        : this(new SchemaFieldsGeneratorOptions(clientPath)) { }

    public SchemaFieldsGenerator(SchemaFieldsGeneratorOptions options)
        : this(options, new MappedTypeVisitor()) { }

    public SchemaFieldsGenerator(
        SchemaFieldsGeneratorOptions options,
        TypeVisitor<SchemaFieldData> typeVisitor
    )
        : base(options, typeVisitor)
    {
        _options = options;
        if (_options.CustomFieldTypes != null)
        {
            _customFieldTypeParams = new[]
            {
                new TsTypeSet(_options.CustomFieldTypes.Select(x => new TsStringConstantType(x)))
            };
        }
        else
        {
            _customFieldTypeParams = Array.Empty<TsType>();
        }
    }

    public static TsImport FormLibImport(string type)
    {
        return new TsImport("@react-typed-forms/schemas", type);
    }
    
    private static readonly TsRawExpr MakeScalarField =
        new("makeScalarField", FormLibImport("makeScalarField"));

    private static readonly TsExpr MakeEntryExpr = new TsRawExpr(
        "mkEntry",
        new TsImport(".", "mkEntry")
    );

    private static readonly TsImport FieldTypeImport = FormLibImport("FieldType");

    private static readonly TsImport ApplyDefaultValuesImport = FormLibImport("applyDefaultValues");

    private static readonly TsImport DefaultValueForFields = FormLibImport("defaultValueForFields");

    private static readonly TsRawExpr MakeCompoundField = new TsRawExpr(
        "makeCompoundField",
        FormLibImport("makeCompoundField")
    );

    private static readonly TsRawExpr BuildSchemaFunc =
        new("buildSchema", FormLibImport("buildSchema"));


    private TsExpr BuildSchema(string schemaType)
    {
        return new TsTypeParamExpr(
            BuildSchemaFunc,
            new[] { new TsTypeRef(schemaType) }.Concat(_customFieldTypeParams)
        );
    }
    
    private TsAssignment CreateDefaultFormConst(ResolvedSchema resolved)
    {
        return new TsAssignment(
            resolved.DefaultValueName,
            new TsRawExpr(
                $"defaultValueForFields({resolved.SchemaConstName})",
                new TsImports([DefaultValueForFields])
            ),
            resolved.FormType
        );
    }

    private TsRawFunction CreateConvertFunction(ResolvedSchema resolved)
    {
        return new TsRawFunction(
            $"function to{resolved.FormTypeName}(v: {resolved.ApiImport?.Import}): {resolved.FormTypeName} "
                + "{\n"
                + $"return applyDefaultValues(v, {resolved.SchemaConstName});"
                + "\n}\n",
            new TsImports([resolved.ApiImport, ApplyDefaultValuesImport])
        );
    }
    
    public static string FullKeyForObjectType(Type t)
    {
        return t switch
        {
            { IsGenericType: true }
                => $"{t.Name}[{string.Join(",", t.GetGenericArguments().Select(x => x.Name))}]",
            _ => t.Name
        };
    }

    protected override string TypeKey(SchemaFieldData typeData)
    {
        return typeData switch
        {
            EnumerableData enumerableTypeData => enumerableTypeData.Element().Type.Name + "[]",
            ObjectData objectTypeData => FullKeyForObjectType(objectTypeData.Type),
            _ => ""
        };
    }

    protected override IEnumerable<GeneratedSchema> ToData(SchemaFieldData typeData)
    {
        return typeData switch
        {
            EnumerableData enumerableTypeData => CollectData(enumerableTypeData.Element()),
            ObjectData objectTypeData => ObjectDeclarations(objectTypeData),
            _ => Array.Empty<GeneratedSchema>()
        };

        IEnumerable<GeneratedSchema> ObjectDeclarations(ObjectData objectTypeData)
        {
            var type = objectTypeData.Type;
            var resolved = _options.GetResolvedSchema(type);
            var members = objectTypeData
                .Members.Where(x => x.GetAttribute<JsonExtensionDataAttribute>() == null)
                .ToList();

            var controlsInterface = new TsInterface(
                resolved.FormTypeName,
                new TsObjectType(members.Select(ControlsMember))
            );

            var deps = objectTypeData.Members.SelectMany(x => CollectData(x.Data()));

            var tsConstName = resolved.SchemaConstName;
            var tsAllName = resolved.FormTypeName;

            var baseType = objectTypeData.GetAttribute<JsonBaseTypeAttribute>();
            var subTypes = objectTypeData.Metadata.OfType<JsonSubTypeAttribute>();

            IEnumerable<TsDeclaration> declarations = new TsDeclaration[]
            {
                controlsInterface,
                new TsAssignment(
                    tsConstName,
                    new TsCallExpression(
                        BuildSchema(tsAllName),
                        new List<TsExpr>
                        {
                            new TsObjectExpr(
                                members.Select(x =>
                                    FieldForMember(x, objectTypeData, baseType, subTypes)
                                )
                            )
                        }
                    )
                ),
                CreateDefaultFormConst(resolved),
            };
            if (resolved.ApiImport != null)
            {
                declarations = declarations.Append(CreateConvertFunction(resolved));
            }

            return deps.Append(
                new GeneratedSchema(
                    declarations,
                    TsObjectField.NamedField(
                        resolved.SchemaRefNameExpr,
                        new TsRawExpr(tsConstName)
                    )
                )
            );
        }

        TsFieldType ControlsMember(SchemaFieldMember member)
        {
            return new TsFieldType(GetFieldName(member), false, FormType(member.Data()));
        }
    }

    private TsObjectField FieldForMember(
        SchemaFieldMember member,
        ObjectData parent,
        JsonBaseTypeAttribute? baseType,
        IEnumerable<JsonSubTypeAttribute> subTypes
    )
    {
        var onlyForTypes = member
            .PropertyMetadata.SelectMany(x =>
                subTypes.Where(s => s.SubType == x.Item1).Select(s => s.Discriminator)
            )
            .ToList();
        var memberData = member.Data();
        var schemaOptions = member.GetAttribute<SchemaOptionsAttribute>();
        var fieldName = GetFieldName(member);
        var tags = member.GetAttributes<SchemaTagAttribute>().Select(x => x.Tag).ToList();
        var enumType =
            member.GetAttribute<SchemaOptionsAttribute>()?.EnumType ?? GetEnumType(memberData);
        var options = enumType != null ? EnumOptions(enumType, _options.IsStringEnum(enumType)) : null;
        var (makeField, isScalar) = FieldForType(
            memberData,
            parent,
            member.PropertyMetadata.SelectMany(x => x.Item2).ToList()
        );
        var defaultValue = ConvertDefaultValue(member.GetAttribute<DefaultValueAttribute>()?.Value);
        var displayName =
            member.GetAttribute<DisplayAttribute>()?.Name
            ?? (_options.DisplayNameFromProperty ?? DefaultDisplayName).Invoke(member.PropertyName);
        var buildFieldCall = SetOptions(
            makeField,
            new Dictionary<string, object?>
            {
                {
                    "isTypeField",
                    baseType != null && baseType.TypeField == fieldName ? true : null
                },
                { "onlyForTypes", onlyForTypes.Count > 0 ? onlyForTypes : null },
                { "notNullable", memberData.Nullable ? null : true },
                { "required", memberData.Nullable || !isScalar ? null : true },
                { "defaultValue", defaultValue },
                { "singularName", schemaOptions?.SingularName },
                { "requiredText", schemaOptions?.RequiredText },
                { "displayName", displayName },
                { "tags", tags.Count > 0 ? tags : null },
                {
                    "options",
                    options != null
                        ? new TsConstExpr(
                            options.Select(x => new Dictionary<string, object>
                            {
                                { "name", x.Name },
                                { "value", x.Value }
                            })
                        )
                        : null
                }
            }
        );
        return TsObjectField.NamedField(fieldName, buildFieldCall);
    }

    private Type? GetEnumType(SchemaFieldData data)
    {
        return data switch
        {
            EnumerableData enumerableTypeData => GetEnumType(enumerableTypeData.Element()),
            { Type.IsEnum: true } => data.Type,
            _ => null
        };
    }

    public static string DefaultDisplayName(string propertyName)
    {
        var buf = new StringBuilder(propertyName.Length + 4);
        var uppers = 0;
        var i = 0;
        foreach (var c in propertyName.ToCharArray())
        {
            if (char.IsUpper(c))
            {
                uppers++;
            }
            else
            {
                if (uppers > 0)
                {
                    InsertSpace();
                    uppers = 0;
                }
                buf.Append(c);
            }
            i++;
        }

        if (uppers > 0)
            buf.Append(propertyName.AsSpan(i - uppers, uppers));
        return buf.ToString();

        void InsertSpace()
        {
            buf.Append(propertyName.AsSpan(i - uppers, uppers - 1));
            if (buf.Length > 0)
                buf.Append(' ');
            buf.Append(propertyName.AsSpan(i - 1, 1));
        }
    }

    private object? ConvertDefaultValue(object? v)
    {
        return v switch
        {
            not null when v.GetType().IsEnum => _options.IsStringEnum(v.GetType()) ? v.ToString() : (int)v,
            _ => v
        };
    }

    private TsType FormType(SchemaFieldData data)
    {
        return data switch
        {
            EnumerableData enumerableTypeData
                => new TsArrayType(FormType(enumerableTypeData.Element()), Nullable: data.Nullable),
            _ => _options.GetResolvedSchema(data.Type).FormType with { Nullable = data.Nullable }
        };
    }

    private static TsCallExpression SetOptions(
        TsCallExpression call,
        IDictionary<string, object?> options
    )
    {
        var argObject = (TsObjectExpr)call.Args.ToList()[0];
        var args = new TsExpr[]
        {
            options
                .Where(x => x.Value != null)
                .Aggregate(
                    argObject,
                    (obj, v) =>
                        obj.SetField(
                            new TsObjectField(
                                new TsRawExpr(v.Key),
                                v.Value switch
                                {
                                    TsExpr e => e,
                                    var value => new TsConstExpr(value)
                                }
                            )
                        )
                )
        };
        return call with { Args = args };
    }

    public static FieldType FieldTypeForTypeOnly(Type type, SchemaFieldsGeneratorOptions options)
    {
        return type switch
        {
            { IsEnum: true } when options.IsStringEnum(type) is var stringEnum
                => stringEnum ? FieldType.String : FieldType.Int,
            _ when type == typeof(DateTime) => FieldType.DateTime,
            _ when type == typeof(DateTimeOffset) => FieldType.DateTime,
            _ when type == typeof(DateOnly) => FieldType.Date,
            _ when type == typeof(TimeOnly) => FieldType.Time,
            _ when type == typeof(string) || type == typeof(Guid) => FieldType.String,
            _
                when type == typeof(int)
                    || type == typeof(long)
                    || type == typeof(short)
                    || type == typeof(ushort)
                => FieldType.Int,
            _ when type == typeof(double) || type == typeof(decimal) => FieldType.Double,
            _ when type == typeof(bool) => FieldType.Bool,
            _ when type == typeof(object) => FieldType.Any,
            _ => FieldType.Any
        };
    }

    private (TsCallExpression, bool) FieldForType(
        SchemaFieldData simpleType,
        ObjectData parentObject,
        ICollection<object> propertyMetadata
    )
    {
        var fieldType = _options.CustomFieldType?.Invoke(simpleType.Type);
        fieldType ??= propertyMetadata.OfType<SchemaOptionsAttribute>().FirstOrDefault()?.FieldType;
        if (fieldType != null)
        {
            if (Enum.TryParse(typeof(FieldType), fieldType, true, out var ft))
            {
                return (MakeScalar(new TsRawExpr("FieldType." + ft, FieldTypeImport)), true);
            }
            return (MakeScalar(new TsConstExpr(fieldType)), true);
        }
        return simpleType switch
        {
            EnumerableData enumerableTypeData
                => (
                    SetOption(
                        FieldForType(
                            enumerableTypeData.Element(),
                            parentObject,
                            propertyMetadata
                        ).Item1,
                        "collection",
                        true
                    ),
                    false
                ),
            ObjectData objectTypeData => (DoObject(objectTypeData), false),
            _
                => (
                    MakeScalar(
                        new TsRawExpr(
                            "FieldType." + FieldTypeForTypeOnly(simpleType.Type, _options),
                            FieldTypeImport
                        )
                    ),
                    true
                )
        };

        TsCallExpression DoObject(ObjectData objectTypeData)
        {
            var resolvedSchema = _options.GetResolvedSchema(objectTypeData.Type);
            var fields =
                objectTypeData == parentObject
                    ? new[] { TsObjectField.NamedField("treeChildren", new TsConstExpr(true)) }
                    :
                    [
                        TsObjectField.NamedField(
                            "children",
                            _options.DontResolve
                                ? new TsConstExpr(Enumerable.Empty<TsRawExpr>())
                                : resolvedSchema.SchemaRefExpr
                        ),
                        TsObjectField.NamedField(
                            "schemaRef",
                            resolvedSchema.SchemaRefNameExpr
                        )
                    ];
            return TsCallExpression.Make(MakeCompoundField, TsObjectExpr.Make(fields));
        }
    }

    private TsCallExpression MakeScalar(TsExpr fieldTypeExpr)
    {
        return TsCallExpression.Make(
            MakeScalarField,
            TsObjectExpr.Make(TsObjectField.NamedField("type", fieldTypeExpr))
        );
    }

    private static TsCallExpression SetOption(TsCallExpression call, string field, object value)
    {
        return SetOptions(call, new Dictionary<string, object?> { { field, value } });
    }
    
    private static IEnumerable<FieldOption> EnumOptions(Type type, bool stringEnum)
    {
        return type.GetFields(BindingFlags.Static | BindingFlags.Public)
            .Select(x =>
                (
                    Attribute.GetCustomAttribute(x, typeof(DisplayAttribute)),
                    Attribute.GetCustomAttribute(x, typeof(XmlEnumAttribute))
                ) switch
                {
                    (DisplayAttribute a, _) => new FieldOption(a.Name!, GetValue(x)),
                    (_, XmlEnumAttribute a) => new FieldOption(a.Name!, GetValue(x)),
                    _ => new FieldOption(x.Name, GetValue(x))
                }
            );

        object GetValue(FieldInfo info)
        {
            return stringEnum ? info.Name : (int)info.GetValue(null)!;
        }
    }

    public static string GetFieldName(SchemaFieldMember propertyInfo)
    {
        var nameAttr = propertyInfo.GetAttribute<JsonPropertyNameAttribute>();
        if (nameAttr != null)
            return nameAttr.Name;
        return JsonNamingPolicy.CamelCase.ConvertName(propertyInfo.PropertyName);
    }
}

// var formName = _options.FormTypeName(type);
// return !_options.ForEditorLib && EditorLibImports.Contains(formName)
//     ? EditorLibImport(formName).TypeRef
//     : new TsTypeRef(formName);


// TsExpr ChildSchemaExpr(Type type)
// {
//             
//     new TsConstExpr(_options.SchemaRefName(objectTypeData.Type)
//     var constName = _options.SchemaConstName(type);
//     return !_options.ForEditorLib && EditorLibImports.Contains(constName)
//         ? EditorLibImport(constName).Ref
//         : new TsRawExpr(constName);
// }

public record GeneratedSchema(IEnumerable<TsDeclaration> Declarations, TsObjectField SchemaEntry)
{
    public static IEnumerable<TsDeclaration> ToDeclarations(
        ICollection<GeneratedSchema> allSchemas,
        string schemaMapVar
    )
    {
        var allDeclarations = allSchemas.SelectMany(x => x.Declarations);
        var schemaMap = new TsAssignment(
            schemaMapVar,
            new TsObjectExpr(allSchemas.Select(x => x.SchemaEntry))
        );
        return allDeclarations.Append(schemaMap);
    }
}
