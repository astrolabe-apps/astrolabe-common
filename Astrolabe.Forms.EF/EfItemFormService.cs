using System.Text.Json;
using Astrolabe.Common.Exceptions;
using Astrolabe.FormDesigner;
using Astrolabe.FormDesigner.EF;
using Astrolabe.FormItems;
using Astrolabe.Schemas;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfItemFormService(DbContext dbContext, EfItemService itemService) : IItemFormService
{
    private DbSet<FormDefinition> FormDefinitions => dbContext.Set<FormDefinition>();

    public async Task<ItemFormView> NewItemForm(
        Guid formDefinitionId,
        ItemSecurityContext security
    )
    {
        var (controls, schemaName, schemas, layoutMode, navStyle) =
            await LoadFormSchema(formDefinitionId);

        return new ItemFormView(
            JsonSerializer.SerializeToElement(new { }, FormDataJson.Options),
            [],
            controls,
            schemaName,
            schemas,
            layoutMode,
            navStyle
        );
    }

    public async Task<ItemFormView> GetItemForm(Guid itemId, ItemSecurityContext security)
    {
        var data = (
            await itemService.LoadItemData(
                [itemId],
                [],
                security.UserId,
                security.Roles,
                true
            )
        ).FirstOrDefault();
        NotFoundException.ThrowIfNull(data);

        data = await itemService.PerformItemAction(data, new LoadMetadataAction());

        var userActions = await itemService.GetUserActions(
            itemId,
            security.UserId,
            security.Roles
        );

        var (controls, schemaName, schemas, layoutMode, navStyle) =
            await LoadFormSchema(data.Item.FormData.Type);

        var itemData = JsonSerializer.SerializeToElement(data.Metadata, FormDataJson.Options);

        return new ItemFormView(
            itemData,
            userActions.ToList(),
            controls,
            schemaName,
            schemas,
            layoutMode,
            navStyle
        );
    }

    private async Task<(
        IEnumerable<object> Controls,
        string SchemaName,
        IDictionary<string, IEnumerable<object>> Schemas,
        FormLayoutMode LayoutMode,
        PageNavigationStyle NavigationStyle
    )> LoadFormSchema(Guid formDefinitionId)
    {
        var formDef = await FormDefinitions
            .Where(x => x.Id == formDefinitionId)
            .Include(x => x.Table)
            .AsNoTracking()
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(formDef);
        var tableDef = formDef.Table;
        NotFoundException.ThrowIfNull(tableDef);

        var schemaName = tableDef.Name ?? tableDef.Id.ToString();
        var schemas = new Dictionary<string, IEnumerable<object>>
        {
            { schemaName, DbJson.FromJson<IEnumerable<SchemaField>>(tableDef.Fields) },
        };

        return (
            DbJson.FromJson<IEnumerable<object>>(formDef.Definition),
            schemaName,
            schemas,
            formDef.LayoutMode,
            formDef.NavigationStyle
        );
    }
}
