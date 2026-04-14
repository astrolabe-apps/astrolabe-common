namespace Astrolabe.Forms.EF;

/// <summary>
/// No-op metadata edit used on the read path (GetItemView / GetUserItem) to run
/// form rules against the loaded metadata without mutating it or emitting audit
/// events. Not part of the minimal item API — lives here because form rules are
/// a Forms-layer concern.
/// </summary>
public record LoadMetadataAction : IItemAction;

/// <summary>
/// Dispatches a CSV export against the item's metadata. Remains in Forms since
/// export is out of scope for the minimal item library.
/// </summary>
public record ExportCsvAction<TContext>(Func<TContext, Task> Export, bool AddEvent) : IItemAction;
