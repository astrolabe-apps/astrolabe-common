namespace Astrolabe.FormItems;

/// <summary>
/// Returns item data and available actions for a form item.
/// Form controls and schema definitions are resolved separately.
/// </summary>
public interface IItemFormService
{
    /// <summary>
    /// Creates a new draft item for the given form definition and returns
    /// empty item data and available actions.
    /// </summary>
    Task<ItemFormView> NewItemForm(Guid formDefinitionId, ItemSecurityContext security);

    /// <summary>
    /// Loads an existing item, returning its data and available actions.
    /// </summary>
    Task<ItemFormView> GetItemForm(Guid itemId, ItemSecurityContext security);
}