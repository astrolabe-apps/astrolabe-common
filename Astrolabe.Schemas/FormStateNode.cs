using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Represents a node in the form state tree, combining form definition with data
/// </summary>
public class FormStateNode : IFormStateNode
{
    private readonly ITypedControl<List<IFormStateNode>> _childrenControl;
    private readonly ControlEditor _editor;

    public FormStateNode(
        ControlDefinition definition,
        IFormNode? form,
        SchemaDataNode parent,
        IFormStateNode? parentNode,
        SchemaDataNode? dataNode,
        int childIndex,
        object childKey,
        ControlEditor editor
    )
    {
        Definition = definition;
        Form = form;
        Parent = parent;
        ParentNode = parentNode;
        DataNode = dataNode;
        ChildIndex = childIndex;
        ChildKey = childKey;
        _editor = editor;

        _childrenControl = Control.CreateTyped<List<IFormStateNode>>(new List<IFormStateNode>());

        // Set up reactive children that update when array data changes
        Control.MakeComputedWithPrevious(_childrenControl, (tracker, currentChildren) =>
        {
            var childSpecs = FormStateNodeHelpers.ResolveChildren(this, tracker);
            return UpdateChildren(currentChildren, childSpecs);
        }, _editor);
    }

    public ControlDefinition Definition { get; }
    public IFormNode? Form { get; }
    public ICollection<IFormStateNode> Children => _childrenControl.Value;
    public IFormStateNode? ParentNode { get; }
    public SchemaDataNode Parent { get; }
    public SchemaDataNode? DataNode { get; }
    public int ChildIndex { get; }

    internal object ChildKey { get; }

    private List<IFormStateNode> UpdateChildren(
        List<IFormStateNode> currentChildren,
        IEnumerable<ChildNodeSpec> childSpecs
    )
    {
        var newChildren = new List<IFormStateNode>();
        var childIndex = 0;

        foreach (var spec in childSpecs)
        {
            var childKey = spec.ChildKey;

            // Try to reuse existing child with same key
            var existingChild = currentChildren.FirstOrDefault(c =>
                c is FormStateNode fsNode && Equals(fsNode.ChildKey, childKey)
            );

            if (existingChild != null)
            {
                // Reuse existing child
                newChildren.Add(existingChild);
            }
            else
            {
                // Create new child
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
                    childKey: childKey,
                    editor: _editor
                );

                newChildren.Add(childNode);
            }

            childIndex++;
        }

        return newChildren;
    }
}
