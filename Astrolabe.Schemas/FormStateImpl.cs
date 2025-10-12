namespace Astrolabe.Schemas;

/// <summary>
/// Contains all reactive state for a form state node.
/// This record is used with Control.CreateReactive to create a reactive wrapper with type-safe property access.
/// </summary>
public record FormStateImpl
{
    // State flags
    public bool? Visible { get; init; }  // null = default, true = shown, false = hidden
    public bool Readonly { get; init; }
    public bool Disabled { get; init; }

    // Data binding
    public SchemaDataNode? DataNode { get; init; }

    // Control definition
    public ControlDefinition Definition { get; init; } = null!;

    // Field options
    public ICollection<FieldOption>? FieldOptions { get; init; }
    public object? AllowedOptions { get; init; }

    // Force overrides
    public bool? ForceHidden { get; init; }
    public bool? ForceReadonly { get; init; }
    public bool? ForceDisabled { get; init; }
}
