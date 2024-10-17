namespace Astrolabe.SearchState;

public interface FilterAndSortOptions
{
    string? Query { get; }
    IEnumerable<string>? Sort { get; }
    IDictionary<string, IEnumerable<string>>? Filters { get; }
}

public interface SearchPagingOptions
{
    int Offset { get; }
    int Length { get; }
}

public record SearchOptions(
    int Offset,
    int Length,
    string? Query,
    IEnumerable<string>? Sort,
    IDictionary<string, IEnumerable<string>>? Filters
) : FilterAndSortOptions, SearchPagingOptions;
