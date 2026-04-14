using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Astrolabe.FormDesigner.EF;

public static class FormDesignerModelBuilderExtensions
{
    public static ModelBuilder AddFormDesignerModel(this ModelBuilder modelBuilder)
    {
        modelBuilder
            .Entity<TableDefinition>()
            .HasMany(e => e.ExportDefinitions)
            .WithOne(e => e.TableDefinition)
            .HasForeignKey(e => e.TableDefinitionId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder
            .Entity<ExportDefinition>()
            .Property(x => x.ExportColumns)
            .WithJson(
                Enumerable.Empty<ExportColumn>(),
                new ValueComparer<IEnumerable<ExportColumn>>(
                    (c1, c2) => c1.SequenceEqual(c2),
                    c => c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                    c => c.ToList()
                )
            );

        return modelBuilder;
    }
}
