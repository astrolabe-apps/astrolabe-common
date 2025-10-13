using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Represents a node in the form state tree, combining form definition with data
/// </summary>
public class FormStateNode : IFormStateNode
{
    private readonly IReactive<FormStateImpl> _state;
    private readonly IControl _childrenControl;
    private readonly ControlEditor _editor;

    // Expose reactive state for parent-child reactive tracking
    // Not part of IFormStateNode interface - only accessible from FormStateNode
    internal IReactive<FormStateImpl> State => _state;

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
        ChildIndex = childIndex;
        ChildKey = childKey;
        _editor = editor;

        // Create reactive wrapper with initial state
        _state = Control.CreateReactive(new FormStateImpl
        {
            Visible = null,
            Readonly = false,
            Disabled = false,
            ForceHidden = false,
            ForceReadonly = null,
            ForceDisabled = null,
            DataNode = dataNode,
            Definition = definition,
            FieldOptions = null,
            AllowedOptions = null
        });

        _childrenControl = Control.Create(new List<IFormStateNode>());

        // Set up reactive DataNode (must come before visibility as visibility depends on it)
        InitializeDataNode();

        // Set up reactive readonly and disabled (independent of other properties)
        InitializeReadonly();
        InitializeDisabled();

        // Set up reactive field options (depends on DataNode)
        InitializeFieldOptions();

        // Set up reactive visibility
        InitializeVisibility();

        // Set up reactive children that update when array data changes
        Control.MakeComputedWithPrevious<List<IFormStateNode>>(_childrenControl, (tracker, currentChildren) =>
        {
            var childSpecs = FormStateNodeHelpers.ResolveChildren(this, tracker);
            return UpdateChildren(currentChildren, childSpecs);
        }, _editor);
    }

    public ControlDefinition Definition { get; }
    public IFormNode? Form { get; }
    public ICollection<IFormStateNode> Children => (List<IFormStateNode>)_childrenControl.Value!;
    public IFormStateNode? ParentNode { get; }
    public SchemaDataNode Parent { get; }
    public SchemaDataNode? DataNode => (SchemaDataNode?)_state.Field(x => x.DataNode).Value;
    public int ChildIndex { get; }
    public bool? Visible => (bool?)_state.Field(x => x.Visible).Value;
    public bool Readonly => (bool)_state.Field(x => x.Readonly).Value!;
    public bool Disabled => (bool)_state.Field(x => x.Disabled).Value!;
    public ICollection<FieldOption>? FieldOptions => (ICollection<FieldOption>?)_state.Field(x => x.FieldOptions).Value;

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

    private void InitializeDataNode()
    {
        var dataNodeField = _state.GetControl(x => x.DataNode);

        Control.MakeComputed(dataNodeField, tracker =>
        {
            var definition = tracker.TrackValue(_state, x => x.Definition);
            return FormStateNodeHelpers.LookupDataNode(definition, Parent);
        }, _editor);
    }

    private void InitializeReadonly()
    {
        var readonlyField = _state.GetControl(x => x.Readonly);

        Control.MakeComputed(readonlyField, tracker =>
        {
            // Track parent readonly reactively if parent exists
            if (ParentNode is FormStateNode parentNode)
            {
                var parentReadonly = tracker.TrackValue(parentNode.State, x => x.Readonly);
                if (parentReadonly)
                    return true;
            }

            // Track our own force override and definition
            var forceReadonly = tracker.TrackValue(_state, x => x.ForceReadonly);
            if (forceReadonly == true)
                return true;

            var definition = tracker.TrackValue(_state, x => x.Definition);
            return definition.Readonly == true;
        }, _editor);
    }

    private void InitializeDisabled()
    {
        var disabledField = _state.GetControl(x => x.Disabled);

        Control.MakeComputed(disabledField, tracker =>
        {
            // Track parent disabled reactively if parent exists
            if (ParentNode is FormStateNode parentNode)
            {
                var parentDisabled = tracker.TrackValue(parentNode.State, x => x.Disabled);
                if (parentDisabled)
                    return true;
            }

            // Track our own force override and definition
            var forceDisabled = tracker.TrackValue(_state, x => x.ForceDisabled);
            if (forceDisabled == true)
                return true;

            var definition = tracker.TrackValue(_state, x => x.Definition);
            return definition.Disabled == true;
        }, _editor);
    }

    private void InitializeFieldOptions()
    {
        var fieldOptionsField = _state.GetControl(x => x.FieldOptions);

        Control.MakeComputed(fieldOptionsField, tracker =>
        {
            // Track dataNode from our state
            var dn = tracker.TrackValue(_state, x => x.DataNode);
            if (dn == null)
                return null;

            // Get field options from the schema
            var fieldOptions = dn.Schema.Field.Options;
            if (fieldOptions == null)
                return null;

            // Convert to collection
            return fieldOptions.ToList();
        }, _editor);
    }

    private void InitializeVisibility()
    {
        var visibleField = _state.GetControl(x => x.Visible);

        Control.MakeComputed(visibleField, tracker =>
        {
            // Track forceHidden from our state
            var forceHidden = tracker.TrackValue(_state, x => x.ForceHidden);
            if (forceHidden == true)
                return false;

            // Track parent visibility reactively if parent exists
            if (ParentNode is FormStateNode parentNode)
            {
                var parentVisible = tracker.TrackValue(parentNode.State, x => x.Visible);
                if (!parentVisible.HasValue || !parentVisible.Value)
                    return parentVisible;
            }

            // Track dataNode and definition from our state
            var dn = tracker.TrackValue(_state, x => x.DataNode);
            var definition = tracker.TrackValue(_state, x => x.Definition);

            if (dn != null &&
                (!FormStateNodeHelpers.ValidDataNode(dn) ||
                 FormStateNodeHelpers.HideDisplayOnly(dn, definition)))
            {
                return false;
            }

            // Temporary: return true for null Hidden until visibility scripting is implemented
            // null means visibility hasn't been evaluated yet (async scripting), but we default to visible
            return definition.Hidden == null ? true : !definition.Hidden;
        }, _editor);
    }
}
