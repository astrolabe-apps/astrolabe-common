namespace Astrolabe.Schemas;

public interface IFormStateNode
{
    public ControlDefinition Definition { get; }
    public IFormNode? Form { get; }
    public ICollection<IFormStateNode> Children { get; }
    public IFormStateNode? ParentNode { get; }
    public SchemaDataNode Parent { get; }
    public SchemaDataNode? DataNode { get; }
    public int ChildIndex { get; }
}
