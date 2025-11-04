using __AppName__.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace __AppName__.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeasController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<TeaDto>> GetAll()
    {
        return await dbContext.Teas.Select(t => new TeaDto(
            t.Id,
            t.Type,
            t.NumberOfSugars,
            t.MilkAmount,
            t.IncludeSpoon,
            t.BrewNotes
        )).ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TeaDto>> Get(Guid id)
    {
        var tea = await dbContext.Teas.FindAsync(id);
        if (tea == null)
            return NotFound();

        return new TeaDto(
            tea.Id,
            tea.Type,
            tea.NumberOfSugars,
            tea.MilkAmount,
            tea.IncludeSpoon,
            tea.BrewNotes
        );
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create([FromBody] TeaEdit edit)
    {
        var tea = new Tea
        {
            Id = Guid.NewGuid(),
            Type = edit.Type,
            NumberOfSugars = edit.NumberOfSugars,
            MilkAmount = edit.MilkAmount,
            IncludeSpoon = edit.IncludeSpoon,
            BrewNotes = edit.BrewNotes
        };

        dbContext.Teas.Add(tea);
        await dbContext.SaveChangesAsync();

        return tea.Id;
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] TeaEdit edit)
    {
        var tea = await dbContext.Teas.FindAsync(id);
        if (tea == null)
            return NotFound();

        tea.Type = edit.Type;
        tea.NumberOfSugars = edit.NumberOfSugars;
        tea.MilkAmount = edit.MilkAmount;
        tea.IncludeSpoon = edit.IncludeSpoon;
        tea.BrewNotes = edit.BrewNotes;

        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var tea = await dbContext.Teas.FindAsync(id);
        if (tea == null)
            return NotFound();

        dbContext.Teas.Remove(tea);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }
}

public record TeaDto(
    Guid Id,
    TeaType Type,
    int NumberOfSugars,
    MilkAmount MilkAmount,
    bool IncludeSpoon,
    string? BrewNotes
);

public record TeaEdit(
    TeaType Type,
    int NumberOfSugars,
    MilkAmount MilkAmount,
    bool IncludeSpoon,
    string? BrewNotes
);
