using Astrolabe.Common.Exceptions;
using Astrolabe.Schemas.ExportCsv;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
{
    public async Task<IEnumerable<ExportDefinitionGroup>> ListExportDefinitions()
    {
        return await ExportDefinitions
            .Include(x => x.TableDefinition)
            .GroupBy(x => x.TableDefinitionId)
            .Select(group => new ExportDefinitionGroup(
                group.Select(x => new ExportDefinitionInfo(x.Id, x.Name)),
                group.First().TableDefinition.Name ?? "",
                group.Key
            ))
            .ToListAsync();
    }

    public async Task CreateOrUpdateExportDefinition(ExportDefinitionEdit exportDefinitionEdit)
    {
        var dbDefinition = exportDefinitionEdit.Id.HasValue
            ? await ExportDefinitions.FindAsync(exportDefinitionEdit.Id.Value)
            : null;

        if (dbDefinition is null)
        {
            dbDefinition = new TExportDef();
            ExportDefinitions.Add(dbDefinition);
        }

        dbDefinition.TableDefinitionId = exportDefinitionEdit.TableDefinitionId;
        dbDefinition.Name = exportDefinitionEdit.Name;
        dbDefinition.ExportColumns = exportDefinitionEdit.ExportColumns;

        await SaveChanges();
    }

    public async Task<ExportDefinitionEdit> GetExportDefinition(Guid? id)
    {
        var dbDefinition = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(dbDefinition);

        return new ExportDefinitionEdit(
            dbDefinition.Id,
            dbDefinition.TableDefinitionId,
            dbDefinition.Name,
            dbDefinition.ExportColumns
        );
    }

    public async Task DeleteExportDefinition(Guid id)
    {
        var dbDefinition = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(dbDefinition);

        ExportDefinitions.Remove(dbDefinition);
        await SaveChanges();
    }
}
