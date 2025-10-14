using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Represents a node in the form state tree, combining form definition with data
/// </summary>
public class FormStateNode : IFormStateNode
{
    private readonly IControl<FormStateImpl> _stateControl;
    private readonly IControl _childrenControl;
    private readonly ControlEditor _editor;
    private readonly ISchemaInterface _schemaInterface;

    // Expose state control for parent-child reactive tracking
    // Not part of IFormStateNode interface - only accessible from FormStateNode
    internal IControl<FormStateImpl> State => _stateControl;

    public FormStateNode(
        ControlDefinition definition,
        IFormNode? form,
        SchemaDataNode parent,
        IFormStateNode? parentNode,
        SchemaDataNode? dataNode,
        int childIndex,
        object childKey,
        ControlEditor editor,
        ISchemaInterface schemaInterface
    )
    {
        Form = form;
        Parent = parent;
        ParentNode = parentNode;
        ChildIndex = childIndex;
        ChildKey = childKey;
        _editor = editor;
        _schemaInterface = schemaInterface;

        // Create control with initial state
        _stateControl = Control.Create(new FormStateImpl
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

        // Set up reactive title evaluation (depends on DataNode)
        InitializeTitle(definition);

        // Set up reactive display evaluation (depends on DataNode)
        InitializeDisplay(definition);

        // Set up reactive visibility
        InitializeVisibility();

        // Set up reactive children that update when array data changes
        Control<object?>.MakeComputedWithPrevious<List<IFormStateNode>>(_childrenControl, (tracker, currentChildren) =>
        {
            var childSpecs = FormStateNodeHelpers.ResolveChildren(this, tracker);
            return UpdateChildren(currentChildren, childSpecs);
        }, _editor);
    }

    public ControlDefinition Definition => _stateControl.Value.Definition;
    public IFormNode? Form { get; }
    public ICollection<IFormStateNode> Children => (List<IFormStateNode>)_childrenControl.ValueObject!;
    public IFormStateNode? ParentNode { get; }
    public SchemaDataNode Parent { get; }
    public SchemaDataNode? DataNode => _stateControl.Value.DataNode;
    public int ChildIndex { get; }
    public bool? Visible => _stateControl.Value.Visible;
    public bool Readonly => _stateControl.Value.Readonly;
    public bool Disabled => _stateControl.Value.Disabled;
    public ICollection<FieldOption>? FieldOptions => _stateControl.Value.FieldOptions;

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
                    editor: _editor,
                    schemaInterface: _schemaInterface
                );

                newChildren.Add(childNode);
            }

            childIndex++;
        }

        return newChildren;
    }

    private void InitializeDataNode()
    {
        var dataNodeField = _stateControl.Field(x => x.DataNode);

        Control<object?>.MakeComputed(dataNodeField, tracker =>
        {
            var definition = tracker.TrackValue(_stateControl, x => x.Definition);
            return FormStateNodeHelpers.LookupDataNode(definition, Parent);
        }, _editor);
    }

    private void InitializeReadonly()
    {
        var readonlyField = _stateControl.Field(x => x.Readonly);

        Control<object?>.MakeComputed(readonlyField, tracker =>
        {
            // Track parent readonly reactively if parent exists
            if (ParentNode is FormStateNode parentNode)
            {
                var parentReadonly = tracker.TrackValue(parentNode.State, x => x.Readonly);
                if (parentReadonly)
                    return true;
            }

            // Track our own force override and definition
            var forceReadonly = tracker.TrackValue(_stateControl, x => x.ForceReadonly);
            if (forceReadonly == true)
                return true;

            var definition = tracker.TrackValue(_stateControl, x => x.Definition);
            return definition.Readonly == true;
        }, _editor);
    }

    private void InitializeDisabled()
    {
        var disabledField = _stateControl.Field(x => x.Disabled);

        Control<object?>.MakeComputed(disabledField, tracker =>
        {
            // Track parent disabled reactively if parent exists
            if (ParentNode is FormStateNode parentNode)
            {
                var parentDisabled = tracker.TrackValue(parentNode.State, x => x.Disabled);
                if (parentDisabled)
                    return true;
            }

            // Track our own force override and definition
            var forceDisabled = tracker.TrackValue(_stateControl, x => x.ForceDisabled);
            if (forceDisabled == true)
                return true;

            var definition = tracker.TrackValue(_stateControl, x => x.Definition);
            return definition.Disabled == true;
        }, _editor);
    }

    private void InitializeFieldOptions()
    {
        var fieldOptionsField = _stateControl.Field(x => x.FieldOptions);

        Control<object?>.MakeComputed(fieldOptionsField, tracker =>
        {
            // Track dataNode from our state
            var dn = tracker.TrackValue(_stateControl, x => x.DataNode);
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

    private void InitializeTitle(ControlDefinition originalDefinition)
    {
        var definitionField = _stateControl.Field(x => x.Definition);

        // Look for Label dynamic property in original definition
        var labelExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.Label);

        if (labelExpression != null)
        {
            // Reactively update the Definition with the evaluated title
            Control<object?>.MakeComputed(definitionField, tracker =>
            {
                // Evaluate the expression relative to the Parent node
                // (not the control's own DataNode, which might be null)
                var (success, result) = TryEvaluateExpression(labelExpression, Parent, tracker);

                if (!success)
                {
                    // Field not found or evaluation failed - keep original title
                    return originalDefinition;
                }

                // Coerce to string
                var evaluatedTitle = DynamicPropertyHelpers.CoerceString(result);

                // Create a modified definition with the evaluated title
                return originalDefinition with { Title = evaluatedTitle };
            }, _editor);
        }
        // If no dynamic title, the original definition is already set and doesn't need updates
    }

    private void InitializeDisplay(ControlDefinition originalDefinition)
    {
        var definitionField = _stateControl.Field(x => x.Definition);

        // Look for Display dynamic property in original definition
        var displayExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.Display);

        if (displayExpression != null && originalDefinition is DisplayControlDefinition displayControl)
        {
            // Reactively update the Definition with the evaluated display
            Control<object?>.MakeComputed(definitionField, tracker =>
            {
                // Evaluate the expression relative to the Parent node
                var (success, result) = TryEvaluateExpression(displayExpression, Parent, tracker);

                if (!success)
                {
                    // Field not found or evaluation failed - keep original display
                    return originalDefinition;
                }

                // Coerce to string
                var evaluatedDisplay = DynamicPropertyHelpers.CoerceString(result);

                // Create a modified definition with the evaluated display
                return displayControl.DisplayData switch
                {
                    TextDisplay textDisplay => displayControl with
                    {
                        DisplayData = textDisplay with { Text = evaluatedDisplay ?? "" }
                    },
                    HtmlDisplay htmlDisplay => displayControl with
                    {
                        DisplayData = htmlDisplay with { Html = evaluatedDisplay ?? "" }
                    },
                    _ => originalDefinition // For other display types, don't modify
                };
            }, _editor);
        }
        // If no dynamic display, the original definition is already set and doesn't need updates
    }

    private (bool success, object? result) TryEvaluateExpression(EntityExpression expression, SchemaDataNode dataNode, ChangeTracker tracker)
    {
        // Handle DataExpression (field reference)
        if (expression is DataExpression dataExpr)
        {
            var fieldNode = dataNode.GetChildForFieldRef(dataExpr.Field);
            if (fieldNode == null)
                return (false, null);  // Field not found
            var value = tracker.GetValue(fieldNode.Control);
            return (true, value);
        }

        // Handle DataMatchExpression (field value matching)
        if (expression is DataMatchExpression matchExpr)
        {
            var fieldNode = dataNode.GetChildForFieldRef(matchExpr.Field);
            if (fieldNode == null)
                return (false, null);  // Field not found

            var fieldValue = tracker.GetValue(fieldNode.Control);

            // Check if it's an array/collection
            if (fieldValue is System.Collections.IEnumerable enumerable && fieldValue is not string)
            {
                foreach (var item in enumerable)
                {
                    if (Equals(item, matchExpr.Value))
                        return (true, true);
                }
                return (true, false);
            }

            return (true, Equals(fieldValue, matchExpr.Value));
        }

        // For other expression types, fail
        return (false, null);
    }

    private void InitializeVisibility()
    {
        var visibleField = _stateControl.Field(x => x.Visible);

        Control<object?>.MakeComputed(visibleField, tracker =>
        {
            // Track forceHidden from our state
            var forceHidden = tracker.TrackValue(_stateControl, x => x.ForceHidden);
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
            var dn = tracker.TrackValue(_stateControl, x => x.DataNode);
            var definition = tracker.TrackValue(_stateControl, x => x.Definition);

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
