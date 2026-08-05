using System.Globalization;
using System.Linq.Expressions;
using System.Text.Json;
using System.Text.Json.Nodes;
using Astrolabe.Annotation;
using Astrolabe.Controls;
using Astrolabe.Schemas;
using Astrolabe.Schemas.PDF;
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

    private static readonly FieldGetter<CarItem> ApplyCarSort = (field, sort) => field switch
    {
        "make" => sort.Apply(x => x.Make),
        _ => null
    };


    private static readonly Searcher<CarItem, CarInfo> Searcher = SearchHelper.CreateSearcher<
        CarItem,
        CarInfo
    >(
        q => q.Select(x => new CarInfo(x.Id, x.Make, x.Model, x.Year, x.Status)).ToListAsync(),
        q => q.CountAsync(),
        sorter: SearchHelper.MakeSorter(ApplyCarSort)
    );


    /// <summary>
    /// The same filterer the searcher uses, so the options and the results agree on
    /// what a filter means.
    /// </summary>
    private static readonly QueryFilterer<CarItem> Filterer = SearchHelper.MakeFilterer<CarItem>();

    /// <summary>
    /// The free-text half of a search. Shared by the searcher and the filter options,
    /// so a query that hides rows hides their values from the funnels too.
    /// </summary>
    private IQueryable<CarItem> MatchingCars(SearchOptions search)
    {
        IQueryable<CarItem> cars = dbContext.Cars;
        var text = search.Query;
        if (!string.IsNullOrWhiteSpace(text))
            cars = cars.Where(x => x.Make.Contains(text) || x.Model.Contains(text));
        return cars;
    }

    /// <summary>
    /// One page of cars. `includeTotal` is the caller's "should I count?" — counting
    /// is a second query over the whole filtered set, so a client that already has a
    /// total for this search (paging through it) asks for rows only.
    /// </summary>
    [HttpPost("search")]
    public async Task<SearchResults<CarInfo>> SearchCars(
        SearchOptions search,
        [FromQuery] bool includeTotal = true
    )
    {
        return await Searcher(MatchingCars(search), search, includeTotal);
    }

    /// <summary>
    /// The values one field's filter should offer, with row counts, for the search in
    /// the body — so options narrow as the rest of the search narrows.
    ///
    /// The field's own selection is left out, which is what keeps a multi-select
    /// usable: having ticked one make, the others are still listed with the counts
    /// they'd have if ticked.
    /// </summary>
    [HttpPost("filterOptions")]
    public async Task<IEnumerable<FilterOptionValue>> GetFilterOptions(
        SearchOptions search,
        [FromQuery] string field
    )
    {
        var others = search.Filters?.Where(kv =>
            !string.Equals(kv.Key, field, StringComparison.OrdinalIgnoreCase)
        );
        var cars = Filterer(
            others?.ToDictionary(kv => kv.Key, kv => kv.Value),
            MatchingCars(search)
        );
        return field.ToLowerInvariant() switch
        {
            "make" => await CountBy(cars, x => x.Make),
            "model" => await CountBy(cars, x => x.Model),
            "year" => await CountBy(cars, x => x.Year),
            "status" => await CountBy(cars, x => x.Status),
            // A stale field in a URL is nothing to fail over.
            _ => []
        };
    }

    /// <summary>
    /// Distinct values of one column with their row counts, ordered and capped.
    /// </summary>
    /// <remarks>
    /// Grouped and counted in SQL, and projected into an anonymous type — a record's
    /// constructor here makes EF treat the group as a subquery it can't translate.
    /// Values come back as the strings a filter arrives as: an enum's name, a number
    /// invariantly formatted, so an option can be sent straight back as a filter.
    /// </remarks>
    private static async Task<List<FilterOptionValue>> CountBy<TKey>(
        IQueryable<CarItem> cars,
        Expression<Func<CarItem, TKey>> field,
        int maxOptions = 100
    )
    {
        var counted = await cars.GroupBy(field)
            // Ordered before it's capped, so the cap takes the first N rather than an
            // arbitrary N, and on the grouping rather than the projection, which is
            // the form EF pushes into ORDER BY.
            .OrderBy(g => g.Key)
            .Select(g => new { g.Key, Count = g.Count() })
            .Take(maxOptions)
            .ToListAsync();
        return counted
            .Select(g => new FilterOptionValue(
                Convert.ToString(g.Key, CultureInfo.InvariantCulture) ?? "",
                g.Count
            ))
            .Where(o => o.Value.Length > 0)
            .ToList();
    }

    /// <summary>
    /// Sample data for the search demos — tops the table up to `count` cars.
    /// </summary>
    [HttpPost("seed")]
    public async Task<int> Seed([FromQuery] int count = 40)
    {
        string[] makes = ["Toyota", "Mazda", "Ford", "Holden", "Subaru", "Kia", "Nissan"];
        string[] models = ["Corolla", "Hatch", "Ute", "Wagon", "Sedan", "Coupe"];
        var existing = await dbContext.Cars.CountAsync();
        for (var i = existing; i < count; i++)
        {
            dbContext.Cars.Add(
                new CarItem
                {
                    Owner = "Me",
                    Make = makes[i % makes.Length],
                    Model = models[i % models.Length],
                    Year = 2000 + i % 25,
                    Status = i % 3 == 0 ? ItemStatus.Draft : ItemStatus.Published
                }
            );
        }

        await dbContext.SaveChangesAsync();
        return await dbContext.Cars.CountAsync();
    }

    [HttpGet("all")]
    public async Task<IEnumerable<CarInfo>> ListAll()
    {
        return await dbContext
            .Cars.Select(x => new CarInfo(x.Id, x.Make, x.Model, x.Year, x.Status))
            .ToListAsync();
    }

    [HttpPost("pdf")]
    [ProducesResponseType(typeof(FileResult), 200)]
    public async Task<FileResult> GeneratePdf([FromBody] PdfData pdfData)
    {
        var rootFormNode = FormLookup.Create(_ => pdfData.Controls).GetForm("")!;
        var rootSchemaNode = carService.SchemaLookup.GetSchema(pdfData.SchemaName)!;
        var rootSchemaData = rootSchemaNode.WithData(JsonSerializer.SerializeToNode(pdfData.Data));

        // Build the FormStateNode tree once
        var editor = new ControlEditor();
        var formStateTree = FormStateNodeBuilder.CreateFormStateNode(
            rootFormNode,
            rootSchemaData,
            editor,
            DefaultSchemaInterface.Instance
        );

        var doc = Document.Create(dc =>
        {
            var pdfContext = new PdfFormContext(formStateTree);
            dc.Page(p => pdfContext.RenderContent(p.Content()));
        });
        return File(doc.GeneratePdf(), "application/pdf");
    }
}

public record CarEdit(string Make, string Model, int Year);

public record FilterOptionValue(string Value, int Count);

public record CarInfo(Guid Id, string Make, string Model, int Year, ItemStatus Status);

public record PdfData(ControlDefinition[] Controls, string SchemaName, JsonElement Data);