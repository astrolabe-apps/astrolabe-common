namespace Astrolabe.FormItems;

/// <summary>
/// Core workflow statuses understood by the default rule list.
/// Consumers are free to introduce additional statuses; these exist so the
/// built-in rules and defaults can be written against string constants rather
/// than magic strings.
/// </summary>
public static class ItemStatus
{
    public const string Draft = "Draft";
    public const string Submitted = "Submitted";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
}