namespace Astrolabe.SearchState;

public interface FilterAndSortOptions
{
    string? Query { get; }
    IEnumerable<string>? Sort { get; }
    IDictionary<string, IEnumerable<string>>? Filters { get; }
}

public interface SearchPagingOptions
{
    int Page { get; }
    int PerPage { get; }
}

public record SearchOptions(
    int Page,
    int PerPage,
    string? Query,
    IEnumerable<string>? Sort,
    IDictionary<string, IEnumerable<string>>? Filters
) : FilterAndSortOptions, SearchPagingOptions;
