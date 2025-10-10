namespace Astrolabe.Schemas;

/// <summary>
/// Represents a node in the form state tree, combining form definition with data
/// </summary>
public class FormStateNode : IFormStateNode
{
    private readonly List<IFormStateNode> _children = new();

    public FormStateNode(
        ControlDefinition definition,
        IFormNode? form,
        SchemaDataNode parent,
        IFormStateNode? parentNode,
        SchemaDataNode? dataNode,
        int childIndex,
        object childKey
    )
    {
        Definition = definition;
        Form = form;
        Parent = parent;
        ParentNode = parentNode;
        DataNode = dataNode;
        ChildIndex = childIndex;
        ChildKey = childKey;
    }

    public ControlDefinition Definition { get; }
    public IFormNode? Form { get; }
    public ICollection<IFormStateNode> Children => _children;
    public IFormStateNode? ParentNode { get; }
    public SchemaDataNode Parent { get; }
    public SchemaDataNode? DataNode { get; }
    public int ChildIndex { get; }

    internal object ChildKey { get; }

    internal void AddChild(IFormStateNode child)
    {
        _children.Add(child);
    }

    /// <summary>
    /// Builds the children for this form state node based on the form definition and data.
    /// This should be called after construction to populate the Children collection.
    /// </summary>
    internal void BuildChildren()
    {
        var childSpecs = FormStateNodeHelpers.ResolveChildren(this);
        var childIndex = 0;

        foreach (var spec in childSpecs)
        {
            var definition = spec.Definition ?? GroupedControlsDefinition.Default;
            var parent = spec.Parent ?? Parent;

            var childDataNode = FormStateNodeHelpers.LookupDataNode(definition, parent);

            var childNode = new FormStateNode(
                definition: definition,
                form: spec.Node,
                parent: parent,
                parentNode: this,
                dataNode: childDataNode,
                childIndex: childIndex,
                childKey: spec.ChildKey
            );

            AddChild(childNode);

            // Recursively build children for this child
            childNode.BuildChildren();

            childIndex++;
        }
    }
}
