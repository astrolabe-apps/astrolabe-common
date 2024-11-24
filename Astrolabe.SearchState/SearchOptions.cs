namespace Astrolabe.SearchState;

public interface ISearchOptions
{
    string? Query { get; }
    IEnumerable<string>? Sort { get; }
    IDictionary<string, IEnumerable<string>>? Filters { get; }

    int Offset { get; }
    int Length { get; }
}

public class SearchOptions : ISearchOptions
{
    public int Offset { get; set; }
    public int Length { get; set; } = 10;
    public string? Query { get; set; }
    public IEnumerable<string>? Sort { get; set; }

    public IDictionary<string, IEnumerable<string>>? Filters { get; set; }
}
