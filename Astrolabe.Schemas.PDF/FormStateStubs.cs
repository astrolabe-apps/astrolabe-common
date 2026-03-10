namespace Astrolabe.Schemas;

/// <summary>
/// Stub interface for form state nodes. Full implementation pending new API design.
/// </summary>
public interface IFormStateNode : IDisposable
{
    ControlDefinition Definition { get; }
    ICollection<IFormStateNode> Children { get; }
    IFormStateNode? ParentNode { get; }
    SchemaDataNode? DataNode { get; }
    bool? Visible { get; }
    bool Readonly { get; }
    bool Disabled { get; }
}

/// <summary>
/// Stub for schema data nodes. Full implementation pending new API design.
/// </summary>
public record SchemaDataNode(ISchemaNode Schema, ISchemaDataValue? Control, SchemaDataNode? Parent);

/// <summary>
/// Minimal data value interface replacing IControl for PDF rendering purposes.
/// </summary>
public interface ISchemaDataValue
{
    object? ValueObject { get; }
}
