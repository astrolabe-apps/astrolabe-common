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

    private static TsImport EditorLibImport(string type)
    {
        return new TsImport("@astrolabe/schemas-editor/schemaSchemas", type);
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
            "DateValidator"
        };

    private static readonly HashSet<string> EditorLibImports =
        new()
        {
            "SchemaFieldForm",
            "SchemaFieldSchema",
            "ControlDefinitionForm",
            "ControlDefinitionSchema"
        };

    private TsExpr BuildSchema(string schemaType)
    {
        return new TsTypeParamExpr(
            BuildSchemaFunc,
            new[] { new TsTypeRef(schemaType) }.Concat(_customFieldTypeParams)
        );
    }

    private string DefaultConstName(Type type)
    {
        return $"default{_options.FormTypeName(type)}";
    }

    private TsAssignment CreateDefaultFormConst(Type type)
    {
        return new TsAssignment(
            DefaultConstName(type),
            new TsRawExpr(
                $"defaultValueForFields({_options.SchemaConstName(type)})",
                new TsImports(new[] { DefaultValueForFields })
            ),
            new TsTypeRef(_options.FormTypeName(type))
        );
    }

    private TsRawFunction CreateConvertFunction(Type type)
    {
        return new TsRawFunction(
            $"function to{_options.FormTypeName(type)}(v: {_options.FlattenedTypeName(type)}): {_options.FormTypeName(type)} "
                + "{\n"
                + $"return applyDefaultValues(v, {_options.SchemaConstName(type)});"
                + "\n}\n",
            new TsImports(new[] { ClientImport(type), ApplyDefaultValuesImport })
        );
    }

    private TsImport ClientImport(Type type)
    {
        return FormLibTypes.Contains(type.Name)
            ? FormLibImport(type.Name)
            : _options.ImportType(type);
    }

    protected override string TypeKey(SchemaFieldData typeData)
    {
        return typeData switch
        {
            EnumerableData enumerableTypeData => enumerableTypeData.Element().Type.Name + "[]",
            ObjectData objectTypeData => objectTypeData.Type.Name,
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
            var members = objectTypeData
                .Members.Where(x => x.GetAttribute<JsonExtensionDataAttribute>() == null)
                .ToList();

            var controlsInterface = new TsInterface(
                _options.FormTypeName(type),
                new TsObjectType(members.Select(ControlsMember))
            );

            var deps = objectTypeData.Members.SelectMany(x => CollectData(x.Data()));

            var tsConstName = _options.SchemaConstName(type);
            var tsAllName = _options.FormTypeName(type);

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
                CreateDefaultFormConst(objectTypeData.Type),
            };
            if (_options.ShouldCreateConvert(objectTypeData.Type))
            {
                declarations = declarations.Append(CreateConvertFunction(objectTypeData.Type));
            }

            return deps.Append(
                new GeneratedSchema(
                    declarations,
                    TsObjectField.NamedField(
                        _options.SchemaRefName(type),
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
        var options = enumType != null ? EnumOptions(enumType, IsStringEnum(enumType)) : null;
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

    private static object? ConvertDefaultValue(object? v)
    {
        return v switch
        {
            not null when v.GetType().IsEnum => IsStringEnum(v.GetType()) ? v.ToString() : (int)v,
            _ => v
        };
    }

    private TsType FormType(SchemaFieldData data)
    {
        return data switch
        {
            EnumerableData enumerableTypeData
                => new TsArrayType(FormType(enumerableTypeData.Element()), Nullable: data.Nullable),
            _ => TsTypeOnly(data.Type) with { Nullable = data.Nullable }
        };
    }

    private TsType TsTypeOnly(Type type)
    {
        if (type.IsEnum)
        {
            return ClientImport(type).TypeRef;
        }

        if (
            type == typeof(string)
            || type == typeof(Guid)
            || type == typeof(DateTime)
            || type == typeof(DateOnly)
            || type == typeof(TimeOnly)
            || type == typeof(DateTimeOffset)
        )
            return new TsTypeRef("string");
        if (
            type == typeof(int)
            || type == typeof(double)
            || type == typeof(long)
            || type == typeof(short)
            || type == typeof(ushort)
        )
            return new TsTypeRef("number");
        if (type == typeof(bool))
            return new TsTypeRef("boolean");
        if (
            type == typeof(object)
            || (
                type.IsGenericType
                && typeof(IDictionary<,>).IsAssignableFrom(type.GetGenericTypeDefinition())
            )
        )
            return new TsTypeRef("any");
        var formName = _options.FormTypeName(type);
        return !_options.ForEditorLib && EditorLibImports.Contains(formName)
            ? EditorLibImport(formName).TypeRef
            : new TsTypeRef(formName);
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

    private static FieldType FieldTypeForTypeOnly(Type type)
    {
        return type switch
        {
            { IsEnum: true } when IsStringEnum(type) is var stringEnum
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
            _ when type == typeof(double) => FieldType.Double,
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
                            "FieldType." + FieldTypeForTypeOnly(simpleType.Type),
                            FieldTypeImport
                        )
                    ),
                    true
                )
        };

        TsCallExpression DoObject(ObjectData objectTypeData)
        {
            var fields =
                objectTypeData == parentObject
                    ? new[] { TsObjectField.NamedField("treeChildren", new TsConstExpr(true)) }
                    :
                    [
                        TsObjectField.NamedField(
                            "children",
                            _options.DontResolve
                                ? new TsConstExpr(Enumerable.Empty<TsRawExpr>())
                                : ChildSchemaExpr(objectTypeData.Type)
                        ),
                        TsObjectField.NamedField(
                            "schemaRef",
                            new TsConstExpr(_options.SchemaRefName(objectTypeData.Type))
                        )
                    ];
            return TsCallExpression.Make(MakeCompoundField, TsObjectExpr.Make(fields));
        }

        TsExpr ChildSchemaExpr(Type type)
        {
            var constName = _options.SchemaConstName(type);
            return !_options.ForEditorLib && EditorLibImports.Contains(constName)
                ? EditorLibImport(constName).Ref
                : new TsRawExpr(constName);
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

    private static bool IsStringEnum(Type type)
    {
        return type.GetCustomAttribute<JsonStringAttribute>() != null;
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

public class SchemaFieldsGeneratorOptions : BaseGeneratorOptions
{
    public Func<Type, TsImport> ImportType { get; }

    public SchemaFieldsGeneratorOptions(Func<Type, TsImport> importType)
    {
        ImportType = importType;
    }

    public SchemaFieldsGeneratorOptions(string clientModule)
    {
        ImportType = x => new TsImport(clientModule, FlattenedTypeName(x));
    }

    public Func<string, string>? DisplayNameFromProperty { get; set; }
    public Func<Type, bool>? CreateConvert { get; set; }
    public Func<Type, string?>? CustomFieldType { get; set; }

    public IEnumerable<string>? CustomFieldTypes { get; set; }

    public bool ForEditorLib { get; set; }

    public bool DontResolve { get; set; }

    public bool ShouldCreateConvert(Type type)
    {
        return CreateConvert?.Invoke(type) ?? true;
    }

    public string FlattenedTypeName(Type type)
    {
        if (type.IsGenericType)
        {
            var args = type.GetGenericArguments();
            return args[0].Name + type.Name[..type.Name.IndexOf('`')];
        }
        return type.Name;
    }

    public string FormTypeName(Type type)
    {
        return FlattenedTypeName(type) + "Form";
    }

    public string SchemaConstName(Type type)
    {
        return FlattenedTypeName(type) + "Schema";
    }

    public string SchemaRefName(Type type)
    {
        return FlattenedTypeName(type);
    }
}

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
