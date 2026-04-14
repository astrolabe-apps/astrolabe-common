namespace Astrolabe.FormItems;

/// <summary>
/// Returns everything needed to render a form for an item in a single call:
/// item data, available actions, form controls, and schema definitions.
/// </summary>
public interface IItemFormService
{
    /// <summary>
    /// Creates a new draft item for the given form definition and returns
    /// the render data (empty item data + form schema + available actions).
    /// </summary>
    Task<ItemFormView> NewItemForm(Guid formDefinitionId, ItemSecurityContext security);

    /// <summary>
    /// Loads an existing item and its form definition, returning everything
    /// needed to render the form (item data + form schema + available actions).
    /// </summary>
    Task<ItemFormView> GetItemForm(Guid itemId, ItemSecurityContext security);
}