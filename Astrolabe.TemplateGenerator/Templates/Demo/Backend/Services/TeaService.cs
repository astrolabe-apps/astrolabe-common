using __Namespace__.Data.EF;
using __Namespace__.Forms;
using __Namespace__.Models;
using Astrolabe.SearchState;
using Microsoft.EntityFrameworkCore;

namespace __Namespace__.Services;

public class TeaService(AppDbContext dbContext)
{
    private static ApplyGetter<Tea>? TeaSorts(string field, ApplyGetter<Tea> apply)
    {
        switch (field)
        {
            case "type":
                return apply.Apply<TeaType>(x => x.Type);
            case "numberOfSugars":
                return apply.Apply<int>(x => x.NumberOfSugars);
            case "milkAmount":
                return apply.Apply<MilkAmount>(x => x.MilkAmount);
            case "includeSpoon":
                return apply.Apply<bool>(x => x.IncludeSpoon);
            default:
                return null;
        }
    }

    private static FieldFilter<Tea>? TeaFilterer(string field)
    {
        return field switch
        {
            "type" => (q, v) =>
            {
                var types = v.Select(Enum.Parse<TeaType>).ToList();
                return q.Where(x => types.Contains(x.Type));
            },
            "milkAmount" => (q, v) =>
            {
                var amounts = v.Select(Enum.Parse<MilkAmount>).ToList();
                return q.Where(x => amounts.Contains(x.MilkAmount));
            },
            "includeSpoon" => (q, v) =>
            {
                var include = v.Contains("yes") || v.Contains("true");
                return q.Where(x => x.IncludeSpoon == include);
            },
            "numberOfSugars" => (q, v) =>
            {
                var sugars = v.Select(int.Parse).ToList();
                return q.Where(x => sugars.Contains(x.NumberOfSugars));
            },
            _ => null,
        };
    }

    private static readonly QueryFilterer<Tea> TeaFilter = SearchHelper.MakeFilterer(TeaFilterer);

    private static readonly QuerySorter<Tea> TeaSort = SearchHelper.MakeSorter<Tea>(TeaSorts);

    private static readonly Searcher<Tea, TeaInfo> TeaSearcher = SearchHelper.CreateSearcher(
        GetSearchPage,
        q => q.CountAsync(),
        TeaSort,
        TeaFilter,
        maxLength: 100
    );

    private static async Task<List<TeaInfo>> GetSearchPage(IQueryable<Tea> query)
    {
        return await query
            .Select(t => new TeaInfo(t.Id, t.Type, t.NumberOfSugars, t.MilkAmount))
            .AsNoTracking()
            .ToListAsync();
    }

    private static IQueryable<Tea> ApplySearchQuery(IQueryable<Tea> query, string? searchQuery)
    {
        if (string.IsNullOrWhiteSpace(searchQuery))
            return query;

        var searchLower = searchQuery.ToLower();
        return query.Where(x =>
            x.Type.ToString().ToLower().Contains(searchLower)
            || x.MilkAmount.ToString().ToLower().Contains(searchLower)
            || x.NumberOfSugars.ToString().Contains(searchLower)
            || (x.BrewNotes != null && x.BrewNotes.ToLower().Contains(searchLower))
        );
    }

    public async Task<SearchResults<TeaInfo>> Search(SearchOptions options, bool includeTotal)
    {
        var query = dbContext.Teas.AsQueryable();
        query = ApplySearchQuery(query, options.Query);
        return await TeaSearcher(query, options, includeTotal);
    }

    public async Task<Dictionary<string, IEnumerable<FieldOption>>> GetFilterOptions()
    {
        var teas = await dbContext.Teas.ToListAsync();

        return new Dictionary<string, IEnumerable<FieldOption>>
        {
            {
                "type",
                Enum.GetValues<TeaType>().Select(x => new FieldOption(x.ToString(), x.ToString()))
            },
            {
                "milkAmount",
                Enum.GetValues<MilkAmount>()
                    .Select(x => new FieldOption(x.ToString(), x.ToString()))
            },
            {
                "numberOfSugars",
                teas.Select(x => x.NumberOfSugars)
                    .Distinct()
                    .OrderBy(x => x)
                    .Select(x => new FieldOption(x.ToString(), x.ToString()))
            },
            { "includeSpoon", new[] { new FieldOption("Yes", "yes") } },
        };
    }
}
