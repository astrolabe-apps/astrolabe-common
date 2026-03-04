using Astrolabe.Schemas.ExportCsv;
using Astrolabe.SearchState;

namespace Astrolabe.Forms;

public record ItemInfo(
    Guid Id,
    string FirstName,
    string LastName,
    DateTime CreatedOn,
    string Status,
    Guid FormType,
    DateTime? SubmittedOn
);

public record FullItem(
    IEnumerable<string> Actions,
    Guid FormType,
    object Metadata,
    string Status,
    DateTime CreatedAt,
    DateTime? SubmittedAt,
    IEnumerable<ItemEvent>? Events,
    IEnumerable<ItemNoteResult>? Notes
);

public record ItemEvent(
    string EventType,
    DateTime Timestamp,
    string Message,
    string? PersonName,
    string? OldStatus,
    string? NewStatus
);

public record ItemNoteResult(string Message, string? PersonName, DateTime Timestamp);

public record FormInfo(Guid Id, string Name, string Folder);

public record FormAndSchemas(
    IEnumerable<object> Controls,
    object? Config,
    string SchemaName,
    IDictionary<string, IEnumerable<object>> Schemas
);

public record NameId(string Name, Guid? Id);

public record ScopedNameId(string Name, Guid? Id, string Scope) : NameId(Name, Id);

public record FormUpload
{
    public Guid Id { get; set; }
    public string Filename { get; set; } = "";
    public int Length { get; set; }
}

public record ExportDefinitionInfo(Guid Id, string Name);

public record ExportDefinitionData(
    IEnumerable<ExportDefinitionInfo> Infos,
    string TableDefinitionName,
    Guid TableDefinitionId
);

public record ExportDefinitionEdit(
    Guid? Id,
    Guid TableDefinitionId,
    string Name,
    IEnumerable<ExportColumn> ExportColumns
);

public static class AuditEventHelper
{
    public static string EntityKeyForItemId(Guid id)
    {
        return "I" + id;
    }
}

public static class Scopes
{
    public static string GroupScopedId(string? groupId, string? shortId)
    {
        return string.IsNullOrEmpty(groupId) ? shortId ?? "" : groupId + "." + shortId;
    }

    public static (string, string) SplitGroupScopedId(string fullId)
    {
        var dot = fullId.IndexOf('.');
        return dot >= 0 ? (fullId[..dot], fullId[(dot + 1)..]) : ("", fullId);
    }
}
