using Astrolabe.Common.Exceptions;
using Astrolabe.FormDesigner.EF;
using Astrolabe.Forms;
using Astrolabe.Schemas;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfFormRenderingService<TFormDef, TTableDef> : IFormRenderingService
    where TFormDef : class, IFormDefinitionEntity<TTableDef>, new()
    where TTableDef : class, ITableDefinition, new()
{
    private readonly DbContext _dbContext;

    public EfFormRenderingService(DbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private DbSet<TFormDef> FormDefinitions => _dbContext.Set<TFormDef>();

    public async Task<FormAndSchemas> GetFormAndSchemas(Guid formId)
    {
        var formDef = await FormDefinitions
            .Where(x => x.Id == formId)
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
        return new FormAndSchemas(
            DbJson.FromJson<IEnumerable<object>>(formDef.Definition),
            schemaName,
            schemas,
            new FormConfig(
                formDef.Public,
                formDef.Published,
                formDef.LayoutMode,
                formDef.NavigationStyle
            )
        );
    }
}
