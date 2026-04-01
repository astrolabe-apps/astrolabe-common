namespace Astrolabe.Forms;

public interface IFormDefinition<TTableDef>
    where TTableDef : class, ITableDefinition
{
    Guid Id { get; set; }
    string? GroupId { get; set; }
    string? ShortId { get; set; }
    string? Name { get; set; }
    int Version { get; set; }
    Guid? TableId { get; set; }
    string? Definition { get; set; }
    bool Public { get; set; }

    bool Published { get; set; }

    FormConfig GetFormConfig();

    void SetFormConfig(FormConfig config);

    TTableDef? Table { get; set; }
}
