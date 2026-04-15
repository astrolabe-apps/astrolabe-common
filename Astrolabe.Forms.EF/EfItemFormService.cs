using System.Text.Json;
using Astrolabe.Common.Exceptions;
using Astrolabe.FormItems;

namespace Astrolabe.Forms.EF;

public class EfItemFormService(EfItemService itemService) : IItemFormService
{
    public async Task<ItemFormView> NewItemForm(Guid formDefinitionId, ItemSecurityContext security)
    {
        return new ItemFormView(
            JsonSerializer.SerializeToElement(new { }, FormDataJson.Options),
            [],
            formDefinitionId
        );
    }

    public async Task<ItemFormView> GetItemForm(Guid itemId, ItemSecurityContext security)
    {
        var data = (
            await itemService.LoadItemData([itemId], [], security.UserId, security.Roles, true)
        ).FirstOrDefault();
        NotFoundException.ThrowIfNull(data);

        data = await itemService.PerformItemAction(data, new LoadMetadataAction());

        var userActions = await itemService.GetUserActions(itemId, security.UserId, security.Roles);

        var itemData = JsonSerializer.SerializeToElement(data.Metadata, FormDataJson.Options);

        return new ItemFormView(itemData, userActions.ToList(), data.Item.FormData.Type);
    }
}
