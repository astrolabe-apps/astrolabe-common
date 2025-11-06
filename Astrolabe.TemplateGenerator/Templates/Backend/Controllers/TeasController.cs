using __AppName__.Data.EF;
using __AppName__.Exceptions;
using __AppName__.Forms;
using __AppName__.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace __AppName__.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeasController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<List<TeaInfo>> GetAll()
    {
        return await dbContext
            .Teas.Select(t => new TeaInfo(t.Id, t.Type, t.NumberOfSugars, t.MilkAmount))
            .ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<TeaView> Get(Guid id)
    {
        var tea = await dbContext.Teas.FindAsync(id);
        NotFoundException.ThrowIfNull(tea, $"Tea with ID {id} not found.");

        return new TeaView
        {
            Id = tea.Id,
            Type = tea.Type,
            NumberOfSugars = tea.NumberOfSugars,
            MilkAmount = tea.MilkAmount,
            IncludeSpoon = tea.IncludeSpoon,
            BrewNotes = tea.BrewNotes,
        };
    }

    [HttpPost]
    public async Task<TeaView> Create([FromBody] TeaEdit edit)
    {
        var tea = new Tea
        {
            Id = Guid.NewGuid(),
            Type = edit.Type,
            NumberOfSugars = edit.NumberOfSugars,
            MilkAmount = edit.MilkAmount,
            IncludeSpoon = edit.IncludeSpoon,
            BrewNotes = edit.BrewNotes,
        };

        dbContext.Teas.Add(tea);
        await dbContext.SaveChangesAsync();

        return new TeaView
        {
            Id = tea.Id,
            Type = tea.Type,
            NumberOfSugars = tea.NumberOfSugars,
            MilkAmount = tea.MilkAmount,
            IncludeSpoon = tea.IncludeSpoon,
            BrewNotes = tea.BrewNotes,
        };
    }

    [HttpPut("{id:guid}")]
    public async Task<TeaView> Update(Guid id, [FromBody] TeaEdit edit)
    {
        var tea = await dbContext.Teas.FindAsync(id);
        NotFoundException.ThrowIfNull(tea, $"Tea with ID {id} not found.");

        tea.Type = edit.Type;
        tea.NumberOfSugars = edit.NumberOfSugars;
        tea.MilkAmount = edit.MilkAmount;
        tea.IncludeSpoon = edit.IncludeSpoon;
        tea.BrewNotes = edit.BrewNotes;

        await dbContext.SaveChangesAsync();

        return new TeaView
        {
            Id = tea.Id,
            Type = tea.Type,
            NumberOfSugars = tea.NumberOfSugars,
            MilkAmount = tea.MilkAmount,
            IncludeSpoon = tea.IncludeSpoon,
            BrewNotes = tea.BrewNotes,
        };
    }

    [HttpDelete("{id:guid}")]
    public async Task Delete(Guid id)
    {
        var tea = await dbContext.Teas.FindAsync(id);
        NotFoundException.ThrowIfNull(tea, $"Tea with ID {id} not found.");

        dbContext.Teas.Remove(tea);
        await dbContext.SaveChangesAsync();
    }
}
