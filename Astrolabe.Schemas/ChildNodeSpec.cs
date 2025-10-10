namespace Astrolabe.Schemas;

/// <summary>
/// Specification for creating a child node in the form state tree
/// </summary>
public record ChildNodeSpec(
    object ChildKey,
    ControlDefinition? Definition,
    SchemaDataNode? Parent,
    IFormNode? Node
);
