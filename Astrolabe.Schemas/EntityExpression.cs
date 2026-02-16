using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Astrolabe.Annotation;

namespace Astrolabe.Schemas;

[JsonString]
public enum ExpressionType
{
    Jsonata,

    [Display(Name = "Data Match")]
    FieldValue,

    [Display(Name = "User Match")]
    UserMatch,
    Data,

    [Display(Name = "Not Empty")]
    NotEmpty,

    UUID,
    Not
}

[JsonBaseType("type", typeof(SimpleExpression))]
[JsonSubType("FieldValue", typeof(DataMatchExpression))]
[JsonSubType("Jsonata", typeof(JsonataExpression))]
[JsonSubType("UserMatch", typeof(UserMatchExpression))]
[JsonSubType("Data", typeof(DataExpression))]
[JsonSubType("NotEmpty", typeof(NotEmptyExpression))]
[JsonSubType("UUID", typeof(SimpleExpression))]
[JsonSubType("Not", typeof(NotExpression))]
public abstract record EntityExpression(
    [property: SchemaOptions(typeof(ExpressionType))] string Type
)
{
    [JsonExtensionData]
    public IDictionary<string, object?>? Extensions { get; set; }
}

public record SimpleExpression(string Type) : EntityExpression(Type);

public record JsonataExpression(string Expression)
    : EntityExpression(nameof(ExpressionType.Jsonata));

public record DataMatchExpression(
    [property: SchemaTag(SchemaTags.SchemaField)] string Field,
    [property: SchemaTag("_ValuesOf:field")] object Value
) : EntityExpression(nameof(ExpressionType.FieldValue));

public record NotEmptyExpression([property: SchemaTag(SchemaTags.SchemaField)] string Field, bool? Empty)
    : EntityExpression(nameof(ExpressionType.NotEmpty));

public record DataExpression([property: SchemaTag(SchemaTags.SchemaField)] string Field)
    : EntityExpression(nameof(ExpressionType.Data));

public record UserMatchExpression(string UserMatch)
    : EntityExpression(nameof(ExpressionType.UserMatch));

public record NotExpression(    [property: SchemaTag(SchemaTags.ControlRef + "/ExpressionForm")] EntityExpression InnerExpression)
    : EntityExpression(nameof(ExpressionType.Not));
