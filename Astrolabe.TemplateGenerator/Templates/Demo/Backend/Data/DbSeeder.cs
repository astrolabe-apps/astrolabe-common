using __ProjectName__.Data.EF;
using __ProjectName__.Models;
using Microsoft.EntityFrameworkCore;

namespace __ProjectName__.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        // Check if database already has data
        if (await context.Teas.AnyAsync())
        {
            Console.WriteLine("Database already contains data. Skipping seed.");
            return;
        }

        Console.WriteLine("Seeding database with sample data...");

        var teas = new List<Tea>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Type = TeaType.Peppermint,
                NumberOfSugars = 0,
                MilkAmount = MilkAmount.None,
                IncludeSpoon = false,
                BrewNotes = "Refreshing peppermint, no sugar"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Type = TeaType.Peppermint,
                NumberOfSugars = 1,
                MilkAmount = MilkAmount.None,
                IncludeSpoon = true,
                BrewNotes = "Peppermint with a touch of sweetness"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Type = TeaType.Rooibos,
                NumberOfSugars = 0,
                MilkAmount = MilkAmount.None,
                IncludeSpoon = true,
                BrewNotes = "Rooibos with spoon for stirring"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Type = TeaType.Purple,
                NumberOfSugars = 0,
                MilkAmount = MilkAmount.Splash,
                IncludeSpoon = false,
                BrewNotes = "Purple tea with a splash of milk"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Type = TeaType.Purple,
                NumberOfSugars = 0,
                MilkAmount = MilkAmount.Normal,
                IncludeSpoon = false,
                BrewNotes = "Purple tea with milk"
            },
            new()
            {
                Id = Guid.NewGuid(),
                Type = TeaType.Purple,
                NumberOfSugars = 2,
                MilkAmount = MilkAmount.Normal,
                IncludeSpoon = true,
                BrewNotes = "Purple tea with milk and sugar"
            }
        };

        context.Teas.AddRange(teas);
        await context.SaveChangesAsync();

        Console.WriteLine($"Seeded {teas.Count} tea records.");
    }
}
