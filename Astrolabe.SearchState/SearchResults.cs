namespace Astrolabe.SearchState;

public record SearchResults<T>(int? Total, IEnumerable<T> Entries);
