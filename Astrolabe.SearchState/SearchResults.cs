namespace Astrolabe.SearchState;

public record SearchResults<T>(int? TotalRows, IEnumerable<T>? Entries);
