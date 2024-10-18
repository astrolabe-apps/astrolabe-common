using Astrolabe.Annotation;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.TestTemplate.Workflow;

public class CarItem
{
    public Guid Id { get; set; }

    public string Owner { get; set; }

    public ItemStatus Status { get; set; }

    /* Editable by the user */

    public string Make { get; set; }

    public string Model { get; set; }

    public int Year { get; set; }
}

[JsonString]
public enum ItemStatus
{
    Draft,
    Published,
}

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<CarItem> Cars { get; set; }
}
