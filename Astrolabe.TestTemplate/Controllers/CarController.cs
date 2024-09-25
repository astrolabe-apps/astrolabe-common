using Astrolabe.TestTemplate.Workflow;
using Astrolabe.Workflow;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CarController(AppDbContext dbContext) : ControllerBase
{
    private static readonly CarWorkflowExecutor Workflow = new();

    [HttpPost]
    public async Task<Guid> Create([FromBody] CarEdit edit)
    {
        var contexts = await Workflow.LoadData(
            new LoadCarContext(dbContext, [], [new EditCarAction(edit)], "Me")
        );
        var carContext = contexts.Single();
        await Workflow.ApplyChanges(carContext);
        await dbContext.SaveChangesAsync();
        return carContext.CarItem.Id;
    }

    [HttpPost("{id}/actions")]
    public async Task WorkflowAction(Guid id, CarWorkflow workflowAction)
    {
        var contexts = await Workflow.LoadData(
            new LoadCarContext(dbContext, [id], [new WorkflowAction(workflowAction)], "Me")
        );
        var carContext = contexts.Single();
        await Workflow.ApplyChanges(carContext);
        await dbContext.SaveChangesAsync();
    }

    [HttpPost("actions")]
    public async Task BulkWorkflowAction(CarWorkflow workflowAction)
    {
        var ids = await dbContext.Cars.Select(x => x.Id).ToListAsync();
        var contexts = await Workflow.LoadData(
            new LoadCarContext(dbContext, ids, [new WorkflowAction(workflowAction)], "Me")
        );
        foreach (var carContext in contexts)
        {
            await Workflow.ApplyChanges(carContext);
        }
        await dbContext.SaveChangesAsync();
    }

    [HttpGet("{id:guid}/actions")]
    public async Task<IEnumerable<CarWorkflow>> GetWorkflowActions(Guid id)
    {
        var contexts = await Workflow.LoadData(new LoadCarContext(dbContext, [id], [], "Me"));
        var carContext = contexts.Single();
        return CarWorkflowRules.Rules.ActionsFor(carContext);
    }

    [HttpPut("{id:guid}")]
    public async Task Edit(Guid id, [FromBody] CarEdit edit)
    {
        var contexts = await Workflow.LoadData(
            new LoadCarContext(dbContext, [id], [new EditCarAction(edit)], "Me")
        );
        var carContext = contexts.Single();
        await Workflow.ApplyChanges(carContext);
        await dbContext.SaveChangesAsync();
    }

    [HttpGet]
    public async Task<IEnumerable<CarEdit>> ListPublished()
    {
        // list all published cars from the dbcontext
        return await dbContext
            .Cars.Where(x => x.Status == ItemStatus.Published)
            .Select(x => new CarEdit(x.Make, x.Model, x.Year))
            .ToListAsync();
    }
}

public record CarEdit(string Make, string Model, int Year);
