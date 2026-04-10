using Astrolabe.Common.Exceptions;
using Astrolabe.FormDesigner;
using Astrolabe.Schemas.ExportCsv;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
{
    public async Task<ExportDefinitionEdit> GetExportDefinition(Guid id)
    {
        var dbDefinition = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(dbDefinition);

        return new ExportDefinitionEdit(
            dbDefinition.TableDefinitionId,
            dbDefinition.Name,
            dbDefinition.ExportColumns.Select(x =>
                new Astrolabe.FormDesigner.ExportColumn(x.Field, x.ColumnName, x.Expression))
        );
    }

    public async Task<Guid> CreateExportDefinition(ExportDefinitionEdit edit)
    {
        var dbDefinition = new TExportDef
        {
            Id = Guid.NewGuid(),
            TableDefinitionId = edit.TableDefinitionId,
            Name = edit.Name,
            ExportColumns = edit.ExportColumns.Select(x =>
                new Astrolabe.Schemas.ExportCsv.ExportColumn(x.Field, x.ColumnName, x.Expression)),
        };
        ExportDefinitions.Add(dbDefinition);
        await SaveChanges();
        return dbDefinition.Id;
    }

    public async Task EditExportDefinition(Guid id, ExportDefinitionEdit edit)
    {
        var dbDefinition = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(dbDefinition);

        dbDefinition.TableDefinitionId = edit.TableDefinitionId;
        dbDefinition.Name = edit.Name;
        dbDefinition.ExportColumns = edit.ExportColumns.Select(x =>
            new Astrolabe.Schemas.ExportCsv.ExportColumn(x.Field, x.ColumnName, x.Expression));
        await SaveChanges();
    }

    public async Task DeleteExportDefinition(Guid id)
    {
        var dbDefinition = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(dbDefinition);

        ExportDefinitions.Remove(dbDefinition);
        await SaveChanges();
    }
}
