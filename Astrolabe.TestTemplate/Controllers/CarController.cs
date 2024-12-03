using System.Text.Json;
using Astrolabe.Annotation;
using Astrolabe.Schemas;
using Astrolabe.SearchState;
using Astrolabe.TestTemplate.Forms;
using Astrolabe.TestTemplate.Service;
using Astrolabe.TestTemplate.Workflow;
using Astrolabe.Workflow;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace Astrolabe.TestTemplate.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CarController(AppDbContext dbContext, CarService carService) : ControllerBase
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

    private static readonly Searcher<CarItem, CarInfo> Searcher = SearchHelper.CreateSearcher<
        CarItem,
        CarInfo
    >(
        q => q.Select(x => new CarInfo(x.Make, x.Model, x.Year, x.Status)).ToListAsync(),
        q => q.CountAsync()
    );

    [HttpPost("search")]
    public async Task<SearchResults<CarInfo>> SearchCars(SearchOptions search)
    {
        return await Searcher(
            dbContext.Cars.Where(x => x.Make.Contains(search.Query)),
            search,
            search.Offset == 0
        );
    }

    [HttpGet("all")]
    public async Task<IEnumerable<CarInfo>> ListAll()
    {
        return await dbContext
            .Cars.Select(x => new CarInfo(x.Make, x.Model, x.Year, x.Status))
            .ToListAsync();
    }

    [HttpPost("pdf")]
    [ProducesResponseType(typeof(FileResult), 200)]
    public async Task<FileResult> GeneratePdf([FromBody] ControlDefinition[] controls)
    {
        var rootFormNode = FormNode.Create(
            new GroupedControlsDefinition { Children = controls },
            null
        );
        var carInfo = await dbContext
            .Cars.Select(x => new CarInfo(x.Make, x.Model, x.Year, x.Status))
            .ToListAsync();
        var carArray = JsonSerializer.SerializeToNode(carInfo)!.AsArray();
        var carInfoNode = carService.SchemaLookup.GetSchema("CarInfo")!;
        var doc = Document.Create(dc =>
        {
            dc.Page(page =>
            {
                page.Header()
                    .Column(c =>
                    {
                        carArray
                            .ToList()
                            .ForEach(x =>
                            {
                                rootFormNode.VisitFormWithData(
                                    SchemaDataNode.Root(carInfoNode, x!),
                                    (fn, pd, d) =>
                                    {
                                        c.Item().Text((d ?? pd).Schema.Field.Field);
                                    }
                                );
                            });
                    });
            });
        });
        return File(doc.GeneratePdf(), "application/pdf");
    }
}

public record CarEdit(string Make, string Model, int Year);

public record CarInfo(string Make, string Model, int Year, ItemStatus Status);
