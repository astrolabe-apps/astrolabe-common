using Astrolabe.FormDesigner.EF;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public static class FormsModelBuilderExtensions
{
    /// <summary>
    /// Configures all entity relationships and converters for the Forms data model.
    /// Call from <c>OnModelCreating</c> in your <see cref="DbContext"/>.
    /// </summary>
    public static ModelBuilder AddFormsModel(this ModelBuilder modelBuilder)
    {
        modelBuilder.AddFormDesignerModel();

        modelBuilder
            .Entity<Person>()
            .HasMany(x => x.Items)
            .WithOne(x => x.Person)
            .OnDelete(DeleteBehavior.NoAction);
        modelBuilder
            .Entity<Person>()
            .HasMany(x => x.Forms)
            .WithOne(x => x.Creator)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder
            .Entity<FormData>()
            .HasOne(e => e.Definition)
            .WithMany()
            .HasForeignKey(e => e.Type)
            .OnDelete(DeleteBehavior.NoAction);

        return modelBuilder;
    }
}
