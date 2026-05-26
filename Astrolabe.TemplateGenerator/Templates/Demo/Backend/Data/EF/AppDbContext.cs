using __ProjectName__.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace __ProjectName__.Data.EF;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Tea> Teas { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Tea entity to use string conversion for enums
        modelBuilder.Entity<Tea>().Property(t => t.Type).HasConversion<string>();

        modelBuilder.Entity<Tea>().Property(t => t.MilkAmount).HasConversion<string>();
    }
}
