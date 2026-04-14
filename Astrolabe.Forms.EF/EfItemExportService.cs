using System.Globalization;
using Astrolabe.FormDesigner.EF;
using Astrolabe.Schemas;
using Astrolabe.Schemas.ExportCsv;
using Astrolabe.SearchState;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfItemExportService : IItemExportService
{
    private readonly DbContext _dbContext;
    private readonly EfItemService _itemService;

    public EfItemExportService(DbContext dbContext, EfItemService itemService)
    {
        _dbContext = dbContext;
        _itemService = itemService;
    }

    private DbSet<Item> Items => _dbContext.Set<Item>();
    private DbSet<ExportDefinition> ExportDefinitions => _dbContext.Set<ExportDefinition>();

    public async Task<List<Guid>> GetExportableItemIds(SearchOptions searchOptions)
    {
        var q = Items.AsQueryable();
        q = _itemService.ItemFilter(searchOptions.Filters, q);
        q = _itemService.ApplySearchQuery(q, searchOptions.Query);
        q = _itemService.ItemSort(searchOptions.Sort, q);
        return await q.Where(x => x.Status == ItemStatus.Submitted)
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

        var actions = new List<IItemAction>
        {
            new LoadMetadataAction(),
            new ExportCsvAction<ItemEditContext>(
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

        var items = await _itemService.LoadItemData(
            allIds.Cast<Guid?>(),
            actions,
            userId,
            roles,
            true
        );
        foreach (var item in items)
        {
            await _itemService.ApplyItemChanges(item);
        }

        await csvWriter.FlushAsync();
    }
}
