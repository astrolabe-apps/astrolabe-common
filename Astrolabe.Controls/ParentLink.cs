namespace Astrolabe.Controls;

public class ParentLink
{
    public required IControl Control { get; init; }
    public required object Key { get; set; } // string or int
    public object? OriginalKey { get; set; }
}