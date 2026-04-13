using System.Globalization;
using Astrolabe.Forms;
using Astrolabe.Schemas;
using Astrolabe.Schemas.ExportCsv;
using Astrolabe.SearchState;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfItemExportService<
    TItem,
    TFormData,
    TPerson,
    TFormDef,
    TTableDef,
    TAuditEvent,
    TItemTag,
    TItemNote,
    TExportDef
> : IItemExportService
    where TItem : class, IItemEntity<TPerson, TFormData, TItemTag, TItemNote>, new()
    where TFormData : class, IFormDataEntity<TPerson, TFormDef>, new()
    where TPerson : class, IPerson, new()
    where TFormDef : class, IFormDefinitionEntity<TTableDef>, new()
    where TTableDef : class, ITableDefinition, new()
    where TAuditEvent : class, IAuditEventEntity<TPerson>, new()
    where TItemTag : class, IItemTag, new()
    where TItemNote : class, IItemNoteEntity<TPerson>, new()
    where TExportDef : class, IExportDefinitionEntity<TTableDef>, new()
{
    private readonly DbContext _dbContext;
    private readonly EfItemService<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    > _itemService;

    public EfItemExportService(
        DbContext dbContext,
        EfItemService<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        > itemService
    )
    {
        _dbContext = dbContext;
        _itemService = itemService;
    }

    private DbSet<TItem> Items => _dbContext.Set<TItem>();
    private DbSet<TExportDef> ExportDefinitions => _dbContext.Set<TExportDef>();

    public async Task<List<Guid>> GetExportableItemIds(SearchOptions searchOptions)
    {
        var q = Items.AsQueryable();
        q = _itemService.ItemFilter(searchOptions.Filters, q);
        q = _itemService.ApplySearchQuery(q, searchOptions.Query);
        q = _itemService.ItemSort(searchOptions.Sort, q);
        return await q.Where(x => x.Status == WorkflowStatuses.Submitted)
            .Select(x => x.Id)
            .ToListAsync();
    }

    public async Task<IEnumerable<ExportDefinitionGroup>> GetExportDefinitionOfForms(
        IEnumerable<Guid> formItemIds
    )
    {
        return await Items
            .Where(x => formItemIds.Contains(x.Id) && x.FormData.Definition.Table != null)
            .Select(x => x.FormData.Definition.Table!)
            .Distinct()
            .Select(x => new ExportDefinitionGroup(
                ExportDefinitions
                    .Where(ed => ed.TableDefinitionId == x.Id)
                    .Select(ed => new ExportDefinitionInfo(ed.Id, ed.Name))
                    .ToList(),
                x.Name!,
                x.Id
            ))
            .ToListAsync();
    }

    public async Task WriteCsvText(
        IEnumerable<ExportColumn> exportColumns,
        IEnumerable<Guid> itemIds,
        Guid tableDefinitionId,
        Guid userId,
        IList<string> roles,
        Stream stream
    )
    {
        var allIds = await Items
            .Where(x =>
                x.FormData.Definition.Table != null
                && x.FormData.Definition.Table.Id == tableDefinitionId
                && itemIds.Contains(x.Id)
            )
            .Select(x => x.Id)
            .ToListAsync();

        await using var writer = new StreamWriter(stream);
        await using var csvWriter = new CsvWriter(
            writer,
            new CsvConfiguration(CultureInfo.InvariantCulture) { HasHeaderRecord = false }
        );

        var columns = exportColumns.ToList();
        await csvWriter.CreateExportHeader(columns);

        var actions = new List<ItemAction>
        {
            new LoadMetadataAction(),
            new ExportCsvAction<ItemEditContext<
                TItem,
                TFormData,
                TPerson,
                TFormDef,
                TTableDef,
                TAuditEvent,
                TItemTag,
                TItemNote
            >>(
                o =>
                    csvWriter.ExportRecord(
                        columns,
                        FormDataJson.FromString<IEnumerable<SchemaField>>(
                            o.Item.FormData.Definition.Table?.Fields ?? ""
                        ),
                        FormDataJson.SerializeToNode(o.Metadata)
                    ),
                false
            ),
        };

        var items = await _itemService.LoadItemData(allIds, actions, userId, roles, null, true);
        foreach (var item in items)
        {
            await _itemService.ApplyItemChanges(item);
        }

        await csvWriter.FlushAsync();
    }
}
