using __AppName__.Models;
using Microsoft.EntityFrameworkCore;

namespace __AppName__.Data.EF;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Tea> Teas { get; set; }
}
