namespace Astrolabe.SearchState;

public record SearchQueryState(
    int Page,
    int PerPage,
    string? Query,
    IEnumerable<string>? Sort,
    IDictionary<string, IEnumerable<string>>? Filters
);
