namespace Astrolabe.Schemas;

/// <summary>
/// Contains all reactive state for a form state node.
/// This record is used with Control<object?>.CreateReactive to create a reactive wrapper with type-safe property access.
/// </summary>
public record FormStateImpl
{
    // State flags
    public bool? Visible { get; init; }  // null = default, true = shown, false = hidden
    public bool Readonly { get; init; }
    public bool Disabled { get; init; }

    // Control definition
    public ControlDefinition Definition { get; init; } = null!;

    // Field options
    public ICollection<FieldOption>? FieldOptions { get; init; }
    public object? AllowedOptions { get; init; }

    // Dynamic styles
    public IDictionary<string, object?>? Style { get; init; }
    public IDictionary<string, object?>? LayoutStyle { get; init; }

    // Force overrides
    public bool? ForceHidden { get; init; }
    public bool? ForceReadonly { get; init; }
    public bool? ForceDisabled { get; init; }
}
