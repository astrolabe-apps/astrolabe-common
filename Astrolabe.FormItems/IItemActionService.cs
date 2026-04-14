namespace Astrolabe.FormItems;

/// <summary>
/// The single entry point driven by the CRUD endpoints. A <c>null</c> slot in
/// <paramref name="itemIds"/> indicates that a new item should be created — the
/// action list is expected to contain a <see cref="CreateItemAction"/> covering
/// each such slot.
/// </summary>
/// <remarks>
/// Returns the resolved item ids in the same order as <paramref name="itemIds"/>,
/// so <c>null</c> slots map to the ids of the newly created items.
/// </remarks>
public interface IItemActionService
{
    Task<List<Guid>> PerformActions(
        List<Guid?> itemIds,
        List<IItemAction> actions,
        ItemSecurityContext security
    );
}
