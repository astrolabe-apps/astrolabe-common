namespace Astrolabe.SearchState;

public record SortField(string Field, bool Descending)
{
    public static SortField Parse(string s)
    {
        return new SortField(s[1..], s[0] == 'd');
    }
}
