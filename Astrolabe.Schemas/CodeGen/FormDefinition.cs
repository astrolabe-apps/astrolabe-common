using Astrolabe.CodeGen.Typescript;

namespace Astrolabe.Schemas.CodeGen;

public interface FormDefinition<out TConfig>
{
    string Value { get; }

    string Name { get; }

    Type GetSchema();

    TConfig Config { get; }
}

public record FormDefinition<TSchema, TConfig>(string Value, string Name, TConfig Config)
    : FormDefinition<TConfig>
{
    public Type GetSchema()
    {
        return typeof(TSchema);
    }
}

public class FormBuilder<TConfig>
{
    public static FormDefinition<TSchema, TConfig> Form<TSchema>(
        string value,
        string name,
        TConfig config
    )
    {
        return new FormDefinition<TSchema, TConfig>(value, name, config);
    }
}

public static class FormDefinition
{
    public static string DefaultFormDefFilename<T>(FormDefinition<T> definition)
    {
        return definition.Value + ".json";
    }

    public static TsFile GenerateFormModule<T>(
        string formsVariable,
        IEnumerable<FormDefinition<T>> definitions,
        string schemaModule,
        string formModuleDir,
        Func<FormDefinition<T>, string>? formDefFilename = null,
        SchemaFieldsGeneratorOptions? options = null
    )
    {
        options ??= new SchemaFieldsGeneratorOptions("");
        var formVars = definitions.Select(MakeAssignment).ToList();
        var formsAssignment = new TsAssignment(
            formsVariable,
            new TsObjectExpr(formVars.Select(x => TsObjectField.ForVariable(new TsRawExpr(x.Name))))
        );
        return TsFile.FromDeclarations([.. formVars, formsAssignment]);

        TsAssignment MakeAssignment(FormDefinition<T> x)
        {
            var jsonFile = new TsImport(
                formModuleDir + (formDefFilename?.Invoke(x) ?? DefaultFormDefFilename(x)),
                x.Value + "Json",
                true
            ).Ref;

            return new TsAssignment(
                x.Value,
                new TsObjectExpr(
                    [
                        TsObjectField.NamedField("value", new TsConstExpr(x.Value)),
                        TsObjectField.NamedField("name", new TsConstExpr(x.Name)),
                        TsObjectField.NamedField(
                            "schema",
                            new TsImport(schemaModule, options.SchemaConstName(x.GetSchema())).Ref
                        ),
                        TsObjectField.NamedField(
                            "schemaName",
                            new TsConstExpr(options.SchemaRefName(x.GetSchema()))
                        ),
                        TsObjectField.NamedField("defaultConfig", new TsConstExpr(x.Config)),
                        TsObjectField.NamedField(
                            "controls",
                            new TsAsExpr(
                                new TsPropertyExpr(jsonFile, new TsRawExpr("controls")),
                                new TsArrayType(
                                    SchemaFieldsGenerator.FormLibImport("ControlDefinition").TypeRef
                                )
                            )
                        ),
                        TsObjectField.NamedField(
                            "config",
                            new TsPropertyExpr(jsonFile, new TsRawExpr("config"))
                        ),
                    ]
                )
            );
        }
    }
}
