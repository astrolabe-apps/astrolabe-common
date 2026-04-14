using Astrolabe.Common.Exceptions;
using Astrolabe.FormDesigner.EF;
using Astrolabe.Schemas;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfFormRenderingService : IFormRenderingService
{
    private readonly DbContext _dbContext;

    public EfFormRenderingService(DbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private DbSet<FormDefinition> FormDefinitions => _dbContext.Set<FormDefinition>();

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
