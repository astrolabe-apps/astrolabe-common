using Astrolabe.Annotation;
using Astrolabe.Schemas;

namespace Astrolabe.Forms;

public record FormDefinitionEdit(
    string ShortId,
    string Name,
    string GroupId,
    [property: SchemaTag(SchemaTags.TableList)] Guid? TableId,
    IEnumerable<object> Controls,
    FormConfig Config
);
