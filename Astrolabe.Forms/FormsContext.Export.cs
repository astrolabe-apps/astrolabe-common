using System.Globalization;
using Astrolabe.Schemas;
using Astrolabe.Schemas.ExportCsv;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem,
    TFormData,
    TPerson,
    TFormDef,
    TTableDef,
    TAuditEvent,
    TItemTag,
    TItemNote,
    TItemFile,
    TExportDef
>
{
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
            new ExportCsvAction<
                ItemEditContext<
                    TItem,
                    TFormData,
                    TPerson,
                    TFormDef,
                    TTableDef,
                    TAuditEvent,
                    TItemTag,
                    TItemNote
                >
            >(
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

        var items = await LoadItemData(allIds, actions, userId, roles, null, true);
        foreach (var item in items)
        {
            await ApplyItemChanges(item);
        }

        await csvWriter.FlushAsync();
    }
}
