namespace Astrolabe.SearchState;

public record SearchResults<T>(bool Loading, int? TotalRows, IEnumerable<T>? Entries);
