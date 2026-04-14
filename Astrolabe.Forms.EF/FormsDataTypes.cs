using System.Text.Json;
using Astrolabe.SearchState;

namespace Astrolabe.Forms.EF;

public record ItemInfo(
    Guid Id,
    string FirstName,
    string LastName,
    DateTime CreatedOn,
    string Status,
    Guid FormType,
    DateTime? SubmittedOn
);

public record ItemView(
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

public record FormAndSchemas(
    IEnumerable<object> Controls,
    string SchemaName,
    IDictionary<string, IEnumerable<object>> Schemas,
    FormConfig Config
);

public record FormUpload
{
    public Guid Id { get; set; }
    public string Filename { get; set; } = "";
    public int Length { get; set; }
}

public record ExportDefinitionInfo(Guid Id, string Name);

public record ExportDefinitionGroup(
    IEnumerable<ExportDefinitionInfo> Infos,
    string TableDefinitionName,
    Guid TableDefinitionId
);

public record ItemEdit(string? Action, JsonElement Metadata);

public record ItemNoteEdit(string Message, bool Internal);

public record ExportRecordsEdit(
    IEnumerable<Guid>? RecordIds,
    Guid? DefinitionId,
    SearchOptions? All
);

public record ExportRecordsDefinitionEdit(IEnumerable<Guid>? RecordIds, SearchOptions? All);

public static class AuditEventHelper
{
    public static string EntityKeyForItemId(Guid id)
    {
        return "I" + id;
    }
}
