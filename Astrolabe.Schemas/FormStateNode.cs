using System.Linq.Expressions;
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
    private readonly List<IDisposable> _disposables = new();

    // Expose state control for parent-child reactive tracking
    // Not part of IFormStateNode interface - only accessible from FormStateNode
    internal IControl<FormStateImpl> State => _stateControl;

    // DataNode is calculated once from the initial definition and does not change
    public SchemaDataNode? DataNode { get; }

    public FormStateNode(
        ControlDefinition definition,
        IFormNode? form,
        SchemaDataNode parent,
        IFormStateNode? parentNode,
        int childIndex,
        object childKey,
        ControlEditor editor,
        ISchemaInterface schemaInterface
    )
    {
        _originalDefinition = definition;
        Form = form;
        Parent = parent;
        ParentNode = parentNode;
        ChildIndex = childIndex;
        ChildKey = childKey;
        _editor = editor;
        _schemaInterface = schemaInterface;
        _evalContext = new ExpressionEvalContext(Parent, _schemaInterface);

        // Calculate DataNode once from the definition - it won't change
        DataNode = FormStateNodeHelpers.LookupDataNode(definition, parent);

        // Create control with initial state
        _stateControl = Control.Create(new FormStateImpl
        {
            Visible = null,
            Readonly = false,
            Disabled = false,
            ForceHidden = false,
            ForceReadonly = null,
            ForceDisabled = null,
            Definition = definition,
            FieldOptions = null,
            AllowedOptions = null
        });
        _definitionControl = _stateControl.Field(x => x.Definition);
        _childrenControl = Control.Create(new List<IFormStateNode>());

        // Set up dynamic definition fields (updates Definition properties based on expressions)
        InitializeHiddenDynamic(definition);
        InitializeReadonlyDynamic(definition);
        InitializeDisabledDynamic(definition);
        InitializeTitle(definition);
        InitializeDisplay(definition);
        InitializeDefaultValue(definition);
        InitializeActionData(definition);
        InitializeGridColumns(definition);

        // Set up dynamic state-level properties
        InitializeStyle(definition);
        InitializeLayoutStyle(definition);
        InitializeAllowedOptions(definition);

        // Set up reactive field options (depends on DataNode and AllowedOptions)
        InitializeFieldOptions();

        // Set up computed state flags (build on top of Definition.Hidden/Readonly/Disabled)
        InitializeReadonly();
        InitializeDisabled();
        InitializeVisibility();

        // Set up reactive children that update when array data changes
        _editor.SetComputedWithPrevious<List<IFormStateNode>>(_childrenControl, (tracker, currentChildren) =>
        {
            var childSpecs = FormStateNodeHelpers.ResolveChildren(this, tracker);
            return UpdateChildren(currentChildren, childSpecs);
        });
    }

    public ControlDefinition Definition => _stateControl.Value.Definition;
    public IFormNode? Form { get; }
    public ICollection<IFormStateNode> Children => (List<IFormStateNode>)_childrenControl.ValueObject!;
    public IFormStateNode? ParentNode { get; }
    public SchemaDataNode Parent { get; }
    public int ChildIndex { get; }
    public bool? Visible => _stateControl.Value.Visible;
    public bool Readonly => _stateControl.Value.Readonly;
    public bool Disabled => _stateControl.Value.Disabled;
    public ICollection<FieldOption>? FieldOptions => _stateControl.Value.FieldOptions;
    public IDictionary<string, object?>? Style => _stateControl.Value.Style;
    public IDictionary<string, object?>? LayoutStyle => _stateControl.Value.LayoutStyle;

    private ExpressionEvalContext _evalContext;
    private readonly IControl<ControlDefinition> _definitionControl;
    private readonly ControlDefinition _originalDefinition;


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

                var childNode = new FormStateNode(
                    definition: definition,
                    form: spec.Node,
                    parent: parent,
                    parentNode: this,
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

    private void InitializeReadonly()
    {
        var readonlyField = _stateControl.Field(x => x.Readonly);

        _editor.SetComputed(readonlyField, tracker =>
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

            var definitionReadonly = tracker.TrackValue(_definitionControl, x => x.Readonly);
            return definitionReadonly == true;
        });
    }

    private void InitializeDisabled()
    {
        var disabledField = _stateControl.Field(x => x.Disabled);

        _editor.SetComputed(disabledField, tracker =>
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
        });
    }

    private void InitializeFieldOptions()
    {
        var fieldOptionsField = _stateControl.Field(x => x.FieldOptions);

        _editor.SetComputed(fieldOptionsField, tracker =>
        {
            // DataNode is now a plain property - no need to track it
            if (DataNode == null)
                return null;

            // Get field options from the schema
            var fieldOptions = DataNode.Schema.Field.Options?.ToList();
            if (fieldOptions == null)
                return null;

            // Check for AllowedOptions filter
            var allowedOptions = tracker.TrackValue(_stateControl, x => x.AllowedOptions);
            if (allowedOptions == null)
                return fieldOptions;

            // Convert allowed to array
            var allowedArray = allowedOptions switch
            {
                System.Collections.IEnumerable enumerable => enumerable.Cast<object?>().ToArray(),
                _ => new[] { allowedOptions }
            };

            if (allowedArray.Length == 0)
                return fieldOptions;

            // Filter field options by allowed values
            return allowedArray
                .Select(allowed =>
                {
                    if (allowed is FieldOption fo)
                        return fo;
                    return fieldOptions.FirstOrDefault(x => Equals(x.Value, allowed))
                        ?? new FieldOption(allowed?.ToString() ?? "", allowed);
                })
                .Where(x => x != null)
                .Cast<FieldOption>()
                .ToList();
        });
    }

    private void InitializeStyle(ControlDefinition originalDefinition)
    {
        var styleExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.Style);

        if (styleExpression == null) return;

        var styleField = _stateControl.Field(x => x.Style);
        SetupDynamic(styleField, styleExpression, DynamicPropertyHelpers.CoerceStyle);
    }

    private void InitializeLayoutStyle(ControlDefinition originalDefinition)
    {
        var layoutStyleExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.LayoutStyle);

        if (layoutStyleExpression == null) return;

        var layoutStyleField = _stateControl.Field(x => x.LayoutStyle);
        SetupDynamic(layoutStyleField, layoutStyleExpression, DynamicPropertyHelpers.CoerceStyle);
    }

    private void InitializeAllowedOptions(ControlDefinition originalDefinition)
    {
        var allowedOptionsExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.AllowedOptions);

        if (allowedOptionsExpression == null) return;

        var allowedOptionsField = _stateControl.Field(x => x.AllowedOptions);
        SetupDynamic(allowedOptionsField, allowedOptionsExpression, DynamicPropertyHelpers.CoerceIdentity);
    }

    private void InitializeHiddenDynamic(ControlDefinition originalDefinition)
    {
        var visibleExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.Visible);

        var hiddenField = _definitionControl.Field(x => x.Hidden);
        if (visibleExpression == null)
        {
            _editor.SetValue(hiddenField, DynamicPropertyHelpers.CoerceBool(originalDefinition.Hidden));
            return;
        }

        // Invert because expression is "Visible" but we're setting "Hidden"
        SetupDynamic(hiddenField, visibleExpression, result => 
            !DynamicPropertyHelpers.CoerceBool(result));
    }

    private void InitializeReadonlyDynamic(ControlDefinition originalDefinition)
    {
        var readonlyExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.Readonly);

        if (readonlyExpression == null) return;

        var readonlyField = _definitionControl.Field(x => x.Readonly);
        var disposable = readonlyField.SetupReactiveExpression(
            readonlyExpression,
            _evalContext,
            _editor,
            result => (bool?)DynamicPropertyHelpers.CoerceBool(result));
        _disposables.Add(disposable);
    }

    private void InitializeDisabledDynamic(ControlDefinition originalDefinition)
    {
        var disabledExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.Disabled);

        if (disabledExpression == null) return;

        var disabledField = _definitionControl.Field(x => x.Disabled);
        var disposable = disabledField.SetupReactiveExpression(
            disabledExpression,
            _evalContext,
            _editor,
            result => (bool?)DynamicPropertyHelpers.CoerceBool(result));
        _disposables.Add(disposable);
    }

    private void SetupDynamic(IControl field, EntityExpression expr, Func<object?, object?>? coerce = null)
    {
        var disposable = field.SetupReactiveExpression(expr, _evalContext, _editor, coerce);
        _disposables.Add(disposable);
    }
    
    private void InitializeTitle(ControlDefinition originalDefinition)
    {
        // Look for Label dynamic property in original definition
        var labelExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.Label);

        if (labelExpression == null) return;
        var titleField = _definitionControl.Field(x => x.Title);
        SetupDynamic(titleField, labelExpression, DynamicPropertyHelpers.CoerceString);
    }

    private void InitializeDefaultValue(ControlDefinition originalDefinition)
    {
        var defaultValueExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.DefaultValue);

        if (defaultValueExpression == null) return;
        var defaultValueField = _definitionControl.SubField<DataControlDefinition, object?>(x => x.DefaultValue);

        SetupDynamic(defaultValueField, defaultValueExpression, DynamicPropertyHelpers.CoerceIdentity);
    }

    private void InitializeActionData(ControlDefinition originalDefinition)
    {
        var actionDataExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.ActionData);

        if (actionDataExpression == null || originalDefinition is not ActionControlDefinition) return;
        var actionDataField = _definitionControl
            .SubField<ActionControlDefinition, string?>(x => x.ActionData);
        SetupDynamic(actionDataField, actionDataExpression, DynamicPropertyHelpers.CoerceString);
    }

    private void InitializeGridColumns(ControlDefinition originalDefinition)
    {
        var gridColumnsExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.GridColumns);

        if (gridColumnsExpression == null) return;

        switch (originalDefinition)
        {
            // For GroupedControlsDefinition with Grid renderer
            case GroupedControlsDefinition { GroupOptions: GridRenderer }:
            {
                var columnsField = _definitionControl
                    .SubField<GroupedControlsDefinition, GroupRenderOptions?>(x => x.GroupOptions)
                    .SubField<GridRenderer, int?>(x => x.Columns);

                SetupDynamic(columnsField, gridColumnsExpression, result => DynamicPropertyHelpers.CoerceInt(result));
                break;
            }
            // For DataControlDefinition with DataGroupRenderOptions
            case DataControlDefinition { RenderOptions: DataGroupRenderOptions { GroupOptions: GridRenderer } }:
            {
                var columnsField = _definitionControl
                    .SubField<DataControlDefinition, RenderOptions?>(x => x.RenderOptions)
                    .SubField<DataGroupRenderOptions, GroupRenderOptions>(x => x.GroupOptions)
                    .SubField<GridRenderer, int?>(x => x.Columns);

                SetupDynamic(columnsField, gridColumnsExpression, result => DynamicPropertyHelpers.CoerceInt(result));
                break;
            }
        }
    }

    private void InitializeDisplay(ControlDefinition originalDefinition)
    {
        var displayExpression = DynamicPropertyHelpers.FindDynamicExpression(
            originalDefinition,
            DynamicPropertyType.Display);

        if (displayExpression == null || originalDefinition is not DisplayControlDefinition displayControl)
            return;

        switch (displayControl.DisplayData)
        {
            // Handle TextDisplay
            case TextDisplay:
            {
                var textField = _definitionControl
                    .SubField<DisplayControlDefinition, DisplayData?>(x => x.DisplayData)
                    .SubField<TextDisplay, string>(x => x.Text);

                SetupDynamic(textField, displayExpression, DynamicPropertyHelpers.CoerceString);
                break;
            }
            // Handle HtmlDisplay
            case HtmlDisplay:
            {
                var htmlField = _definitionControl
                    .SubField<DisplayControlDefinition, DisplayData?>(x => x.DisplayData)
                    .SubField<HtmlDisplay, string>(x => x.Html);

                SetupDynamic(htmlField, displayExpression, DynamicPropertyHelpers.CoerceString);
                break;
            }
        }
    }

    private void InitializeVisibility()
    {
        var visibleField = _stateControl.Field(x => x.Visible);

        _editor.SetComputed(visibleField, tracker =>
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

            // DataNode is now a plain property - no need to track it
            if (DataNode != null &&
                (!FormStateNodeHelpers.ValidDataNode(DataNode) ||
                 FormStateNodeHelpers.HideDisplayOnly(DataNode, _originalDefinition, _schemaInterface)))
            {
                return false;
            }

            var hiddenVal = tracker.TrackValue(_definitionControl, x => x.Hidden);
            return !hiddenVal;
        });
    }

    public void Dispose()
    {
        // Dispose all tracked reactive expressions
        foreach (var disposable in _disposables)
        {
            disposable?.Dispose();
        }
        _disposables.Clear();

        // Dispose children
        foreach (var child in Children)
        {
            child.Dispose();
        }
    }
}
