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
    NotEmpty
}

[JsonBaseType("type", typeof(SimpleExpression))]
[JsonSubType("FieldValue", typeof(DataMatchExpression))]
[JsonSubType("Jsonata", typeof(JsonataExpression))]
[JsonSubType("UserMatch", typeof(UserMatchExpression))]
[JsonSubType("Data", typeof(DataExpression))]
[JsonSubType("NotEmpty", typeof(NotEmptyExpression))]
public abstract record EntityExpression(
    [property: SchemaOptions(typeof(ExpressionType))] string Type
)
{
    [JsonExtensionData]
    public IDictionary<string, object?>? Extensions { get; set; }
}

public record SimpleExpression(string Type) : EntityExpression(Type);

public record JsonataExpression(string Expression)
    : EntityExpression(ExpressionType.Jsonata.ToString());

public record DataMatchExpression(
    [property: SchemaTag(SchemaTags.SchemaField)] string Field,
    [property: SchemaTag("_ValuesOf:field")] object Value
) : EntityExpression(ExpressionType.FieldValue.ToString());

public record NotEmptyExpression([property: SchemaTag(SchemaTags.SchemaField)] string Field)
    : EntityExpression(ExpressionType.NotEmpty.ToString());

public record DataExpression([property: SchemaTag(SchemaTags.SchemaField)] string Field)
    : EntityExpression(ExpressionType.Data.ToString());

public record UserMatchExpression(string UserMatch)
    : EntityExpression(ExpressionType.UserMatch.ToString());
