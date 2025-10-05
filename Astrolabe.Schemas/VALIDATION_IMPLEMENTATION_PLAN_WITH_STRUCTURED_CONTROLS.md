# Server-Side Validation Implementation Plan (With Structured Controls)

## Overview

With the addition of structured control support to Astrolabe.Controls, we can now implement server-side validation using the same reactive pattern as the TypeScript implementation. This document outlines the implementation plan.

## Key Achievements: Structured Controls + Computed Controls

### 1. Structured Controls
The `Control.CreateStructured<T>()` method and `Field()` extension method enable type-safe access to structured object properties:

```csharp
// TypeScript pattern:
const base = newControl<FormStateBase>({ visible: null, readonly: false });
const visible = base.fields.visible; // Control<boolean | null>

// C# equivalent (NOW POSSIBLE):
var baseCtrl = Control.CreateStructured(new FormStateBase { Visible = null, Readonly = false });
var visible = baseCtrl.Field(x => x.Visible); // ITypedControl<bool?>
```

### 2. Computed Controls (NEW!)
The `Control.CreateComputed<T>()` method enables reactive derived values that automatically update when dependencies change:

```csharp
// TypeScript pattern:
const fullName = useComputed(() => {
  const first = firstName.value;
  const last = lastName.value;
  return `${first} ${last}`;
});

// C# equivalent (NOW POSSIBLE):
var fullName = Control.CreateComputed(tracker => {
    var first = tracker.Tracked(firstName).Value;
    var last = tracker.Tracked(lastName).Value;
    return $"{first} {last}";
}, editor);
```

This primitive **eliminates** the need for manual `SetCallback()` + `UpdateSubscriptions()` boilerplate!

## Architecture Overview

### 1. FormStateBase - Structured State Record

```csharp
public record FormStateBase
{
    public bool? Visible { get; set; }
    public bool Readonly { get; set; }
    public bool Disabled { get; set; }
    public SchemaDataNode? DataNode { get; set; }
    public ResolvedDefinition? Resolved { get; set; }
    public List<IFormStateNode> Children { get; set; } = new();
}
```

### 2. FormStateNode Implementation - Reactive Pattern

```csharp
public interface IFormStateNode
{
    string UniqueId { get; }
    SchemaDataNode Parent { get; }
    SchemaDataNode? DataNode { get; }
    IFormNode? FormNode { get; }

    bool? Visible { get; }
    bool Readonly { get; }
    bool Disabled { get; }
    bool Valid { get; }

    ControlDefinition Definition { get; }
    IReadOnlyList<IFormStateNode> Children { get; }

    bool Validate();
    void SetTouched(bool touched, bool notChildren = false);
}

public class FormStateNodeImpl : IFormStateNode
{
    private readonly IStructuredControl<FormStateBase> _base;
    private readonly ControlEditor _editor;
    private readonly ISchemaInterface _schemaInterface;
    private readonly ExpressionEvaluationService _expressionEvaluator;

    public FormStateNodeImpl(
        IFormNode? formNode,
        SchemaDataNode parent,
        ControlDefinition definition,
        ISchemaInterface schemaInterface,
        ExpressionEvaluationService expressionEvaluator,
        ControlEditor editor)
    {
        FormNode = formNode;
        Parent = parent;
        Definition = definition;
        _schemaInterface = schemaInterface;
        _expressionEvaluator = expressionEvaluator;
        _editor = editor;

        // Create structured control for reactive state
        _base = Control.CreateStructured(new FormStateBase
        {
            Visible = null,
            Readonly = false,
            Disabled = false,
            DataNode = LookupDataNode(definition, parent),
            Resolved = new ResolvedDefinition { Definition = definition },
            Children = new List<IFormStateNode>()
        });

        // Make fields computed for dynamic properties using MakeComputed!
        Control.MakeComputed(_base.Field(x => x.Visible), tracker => EvaluateVisibility(tracker), editor);
        Control.MakeComputed(_base.Field(x => x.Readonly), tracker => EvaluateReadonly(tracker), editor);
        Control.MakeComputed(_base.Field(x => x.Disabled), tracker => EvaluateDisabled(tracker), editor);

        // Resolve children after state is initialized
        ResolveChildren();
    }

    // Properties simply read from the structured control fields - no manual tracking needed!
    public bool? Visible => _base.Field(x => x.Visible).Value;
    public bool Readonly => _base.Field(x => x.Readonly).Value;
    public bool Disabled => _base.Field(x => x.Disabled).Value;
    public SchemaDataNode? DataNode => _base.Field(x => x.DataNode).Value;
    public IReadOnlyList<IFormStateNode> Children => _base.Field(x => x.Children).Value;

    public string UniqueId => DataNode?.Control.UniqueId.ToString() ?? Guid.NewGuid().ToString();
    public SchemaDataNode Parent { get; }
    public IFormNode? FormNode { get; }
    public ControlDefinition Definition { get; }
    public bool Valid => DataNode?.Control.IsValid ?? true;

    private bool? EvaluateVisibility(ChangeTracker tracker)
    {
        var dynamicProp = Definition.Dynamic?
            .FirstOrDefault(x => x.Type == DynamicPropertyType.Visible.ToString());

        if (dynamicProp?.Expr == null)
            return Definition.Hidden == null ? null : !Definition.Hidden;

        // Evaluate expression with tracking
        var context = new ExpressionEvaluationContext(
            Parent,
            _schemaInterface,
            _editor,
            tracker // Tracker is passed automatically by MakeComputed
        );

        var result = _expressionEvaluator.Evaluate(dynamicProp.Expr, context);
        return !(bool)(result ?? false);
    }

    private bool EvaluateReadonly(ChangeTracker tracker)
    {
        var dynamicProp = Definition.Dynamic?
            .FirstOrDefault(x => x.Type == DynamicPropertyType.Readonly.ToString());

        if (dynamicProp?.Expr == null)
            return Definition.Readonly ?? false;

        var context = new ExpressionEvaluationContext(Parent, _schemaInterface, _editor, tracker);
        var result = _expressionEvaluator.Evaluate(dynamicProp.Expr, context);
        return (bool)(result ?? false);
    }

    private bool EvaluateDisabled(ChangeTracker tracker)
    {
        var dynamicProp = Definition.Dynamic?
            .FirstOrDefault(x => x.Type == DynamicPropertyType.Disabled.ToString());

        if (dynamicProp?.Expr == null)
            return Definition.Disabled ?? false;

        var context = new ExpressionEvaluationContext(Parent, _schemaInterface, _editor, tracker);
        var result = _expressionEvaluator.Evaluate(dynamicProp.Expr, context);
        return (bool)(result ?? false);
    }

    private void ResolveChildren()
    {
        if (FormNode == null)
            return;

        var childNodes = FormNode.GetChildNodes();
        var children = new List<IFormStateNode>();

        foreach (var childNode in childNodes)
        {
            var childState = new FormStateNodeImpl(
                childNode,
                DataNode ?? Parent,
                childNode.Definition,
                _schemaInterface,
                _expressionEvaluator,
                _editor
            );
            children.Add(childState);
        }

        // Update children field
        _editor.SetValue(_base.Field(x => x.Children), children);
    }

    public bool Validate()
    {
        // Validate children recursively
        var childrenValid = true;
        foreach (var child in Children)
        {
            if (!child.Validate())
                childrenValid = false;
        }

        // Only validate if visible
        if (DataNode != null && Visible == true)
        {
            RunValidators();
            _editor.Validate(DataNode.Control);
        }

        return Valid && childrenValid;
    }

    private void RunValidators()
    {
        if (Definition is not DataControlDefinition dataControl)
            return;

        // Required field validation
        if (dataControl.Required == true)
        {
            var isEmpty = _schemaInterface.IsEmptyValue(
                DataNode!.Schema.Field,
                DataNode.Control.Value
            );

            if (isEmpty)
            {
                var message = dataControl.RequiredErrorText
                    ?? _schemaInterface.ValidationMessageText(
                        DataNode.Schema.Field,
                        ValidationMessageType.NotEmpty,
                        false,
                        true
                    );
                _editor.SetError(DataNode.Control, "required", message);
            }
            else
            {
                _editor.SetError(DataNode.Control, "required", null);
            }
        }

        // Run other validators
        RunLengthValidators(dataControl);
        RunPatternValidators(dataControl);
        RunCustomValidators(dataControl);
    }

    private void RunLengthValidators(DataControlDefinition dataControl)
    {
        if (dataControl.Validators == null)
            return;

        foreach (var validator in dataControl.Validators)
        {
            if (validator.Type == "length")
            {
                var length = _schemaInterface.ControlLength(
                    DataNode!.Schema.Field,
                    DataNode.Control
                );

                var minLength = validator.MinLength;
                var maxLength = validator.MaxLength;

                if (minLength.HasValue && length < minLength.Value)
                {
                    var message = validator.Message
                        ?? _schemaInterface.ValidationMessageText(
                            DataNode.Schema.Field,
                            ValidationMessageType.MinLength,
                            length,
                            minLength.Value
                        );
                    _editor.SetError(DataNode.Control, "minLength", message);
                }
                else
                {
                    _editor.SetError(DataNode.Control, "minLength", null);
                }

                if (maxLength.HasValue && length > maxLength.Value)
                {
                    var message = validator.Message
                        ?? _schemaInterface.ValidationMessageText(
                            DataNode.Schema.Field,
                            ValidationMessageType.MaxLength,
                            length,
                            maxLength.Value
                        );
                    _editor.SetError(DataNode.Control, "maxLength", message);
                }
                else
                {
                    _editor.SetError(DataNode.Control, "maxLength", null);
                }
            }
        }
    }

    private void RunPatternValidators(DataControlDefinition dataControl)
    {
        // TODO: Implement pattern validation
    }

    private void RunCustomValidators(DataControlDefinition dataControl)
    {
        // TODO: Implement custom validators (e.g., Jsonata)
    }

    public void SetTouched(bool touched, bool notChildren = false)
    {
        if (DataNode != null)
        {
            _editor.SetTouched(DataNode.Control, touched);
        }

        if (!notChildren)
        {
            foreach (var child in Children)
            {
                child.SetTouched(touched, false);
            }
        }
    }

    private SchemaDataNode? LookupDataNode(ControlDefinition definition, SchemaDataNode parent)
    {
        var fieldRef = definition switch
        {
            DataControlDefinition data => data.Field,
            GroupedControlsDefinition group => group.CompoundField,
            _ => null
        };

        return fieldRef != null ? parent.GetChildForFieldRef(fieldRef) : null;
    }
}
```

### 3. Expression Evaluation with ChangeTracker

```csharp
public record ExpressionEvaluationContext(
    SchemaDataNode DataNode,
    ISchemaInterface SchemaInterface,
    ControlEditor Editor,
    ChangeTracker? Tracker = null // Optional tracker for reactive evaluation
);

public class DataExpressionEvaluator : IExpressionEvaluator
{
    public object? Evaluate(EntityExpression expression, ExpressionEvaluationContext context)
    {
        var dataExpr = (DataExpression)expression;
        var otherField = context.DataNode.GetChildForFieldRef(dataExpr.Field);

        if (otherField == null)
            return null;

        // If tracker is provided, track the access
        if (context.Tracker != null)
        {
            var tracked = context.Tracker.Tracked(otherField.Control);
            return tracked.Value;
        }

        // Otherwise just read the value
        return otherField.Control.Value;
    }
}

public class NotEmptyExpressionEvaluator : IExpressionEvaluator
{
    public object? Evaluate(EntityExpression expression, ExpressionEvaluationContext context)
    {
        var notEmptyExpr = (NotEmptyExpression)expression;
        var valueExpr = notEmptyExpr.Expr;

        var evaluationService = new ExpressionEvaluationService();
        var value = evaluationService.Evaluate(valueExpr, context);

        if (value == null)
            return false;

        return !context.SchemaInterface.IsEmptyValue(
            context.DataNode.Schema.Field,
            value
        );
    }
}

public class DataMatchExpressionEvaluator : IExpressionEvaluator
{
    public object? Evaluate(EntityExpression expression, ExpressionEvaluationContext context)
    {
        var matchExpr = (DataMatchExpression)expression;

        var evaluationService = new ExpressionEvaluationService();
        var fieldValue = evaluationService.Evaluate(matchExpr.Field, context);
        var matchValue = evaluationService.Evaluate(matchExpr.Match, context);

        return Equals(fieldValue, matchValue);
    }
}
```

### 4. FormValidationService - Entry Point

```csharp
public class FormValidationService
{
    private readonly ISchemaInterface _schemaInterface;
    private readonly ExpressionEvaluationService _expressionEvaluator;

    public FormValidationService()
    {
        _schemaInterface = new DefaultSchemaInterface();
        _expressionEvaluator = new ExpressionEvaluationService();
    }

    public ValidationResult Validate(
        ControlDefinition controlDefinition,
        SchemaField[] schemaFields,
        object formData)
    {
        var editor = new ControlEditor();

        // 1. Create schema tree
        var schemaTree = CreateSchemaTree(schemaFields);

        // 2. Create control from data
        var rootControl = _schemaInterface.CreateControlFromData(formData, schemaTree);

        // 3. Create SchemaDataNode
        var dataNode = new SchemaDataNode(schemaTree, rootControl, null);

        // 4. Create FormNode
        var formNode = new FormNode(controlDefinition, null, EmptyFormLookup);

        // 5. Create FormStateNode (with reactive evaluation)
        var formState = new FormStateNodeImpl(
            formNode,
            dataNode,
            controlDefinition,
            _schemaInterface,
            _expressionEvaluator,
            editor
        );

        // 6. Run validation
        var isValid = formState.Validate();

        // 7. Collect errors
        var errors = CollectErrors(formState);

        return new ValidationResult(isValid, errors);
    }

    private ISchemaNode CreateSchemaTree(SchemaField[] fields)
    {
        var rootField = new CompoundField("$root", fields, false);
        return new SchemaNode(rootField, EmptyLookup, null);
    }

    private Dictionary<string, string[]> CollectErrors(IFormStateNode node)
    {
        var errors = new Dictionary<string, string[]>();

        void Collect(IFormStateNode n, string path = "")
        {
            if (n.DataNode?.Control != null && n.DataNode.Control.HasErrors)
            {
                var fieldPath = string.IsNullOrEmpty(path)
                    ? n.DataNode.Schema.Field.Field
                    : $"{path}.{n.DataNode.Schema.Field.Field}";

                errors[fieldPath] = n.DataNode.Control.Errors.Values.ToArray();
            }

            foreach (var child in n.Children)
            {
                var childPath = string.IsNullOrEmpty(path)
                    ? n.DataNode?.Schema.Field.Field ?? ""
                    : $"{path}.{n.DataNode?.Schema.Field.Field}";

                Collect(child, childPath);
            }
        }

        Collect(node);
        return errors;
    }
}

public record ValidationResult(bool IsValid, Dictionary<string, string[]> Errors);
```

## Comparison to TypeScript

### TypeScript (forms-core)
```typescript
const base = newControl<FormStateBase>({ visible: null, readonly: false });
const visible = base.fields.visible; // Control<boolean | null>

// Reactive computation
createEffect(() => {
  const newVisible = evaluateVisibility();
  visible.value = newVisible;
});
```

### C# (With Structured Controls + MakeComputed)
```csharp
var baseCtrl = Control.CreateStructured(new FormStateBase { Visible = null, Readonly = false });
var visibleField = baseCtrl.Field(x => x.Visible); // ITypedControl<bool?>

// Reactive computation using MakeComputed - even cleaner!
Control.MakeComputed(visibleField, tracker => EvaluateVisibility(tracker), editor);
```

**Even better than TypeScript - one line instead of a whole effect block!**

## Benefits

1. ✅ **Type Safety**: Compile-time checking via `Field(x => x.Property)`
2. ✅ **Reactive Programming**: ChangeTracker enables reactive computations
3. ✅ **Identical Logic**: Same visibility/validation rules as TypeScript
4. ✅ **Change Tracking**: Automatic dependency tracking via `_tracker.Tracked()`
5. ✅ **Structured State**: Clean record-based state management
6. ✅ **Expression Evaluation**: Dynamic properties evaluated with reactive tracking
7. ✅ **Nested Validation**: Recursive validation respecting visibility rules

## Implementation Phases

### Phase 1: Core Infrastructure (COMPLETED ✅)
- ✅ Structured control support in Astrolabe.Controls
- ✅ `Control.CreateStructured<T>()`
- ✅ `Field()` extension method
- ✅ Comprehensive tests

### Phase 2: SchemaDataNode + ISchemaInterface
- Implement SchemaDataNode with IControl integration
- Implement ISchemaInterface for validation messages, options, control creation
- Add field reference navigation (GetChildForFieldRef)

### Phase 3: Expression Evaluation
- Implement IExpressionEvaluator interface
- DataExpressionEvaluator with ChangeTracker support
- NotEmptyExpressionEvaluator
- DataMatchExpressionEvaluator
- ExpressionEvaluationService

### Phase 4: FormStateNode
- Implement FormStateNodeImpl with structured controls
- Setup reactive computations for visibility/readonly/disabled
- Implement Validate() with recursive validation
- Respect visibility rules during validation

### Phase 5: Validators
- Required field validator
- Length validators (min/max)
- Pattern validators
- Date validators
- Custom validators (Jsonata)

### Phase 6: FormValidationService
- Entry point for validation
- Schema tree creation
- Control creation from data
- Error collection

### Phase 7: Testing
- Unit tests for each component
- Integration tests
- Validation against TypeScript test cases

## Next Steps

1. Implement SchemaDataNode with IControl integration
2. Create ISchemaInterface implementation
3. Implement expression evaluators with ChangeTracker support
4. Build FormStateNodeImpl using structured controls
5. Add validator implementations
6. Create FormValidationService
7. Write comprehensive tests

## Conclusion

With structured control support, we can now implement server-side validation using the **exact same reactive pattern** as the TypeScript implementation. This ensures:

- ✅ Identical validation logic
- ✅ Identical visibility rules
- ✅ Type-safe field access
- ✅ Reactive computations
- ✅ Maintainable, testable code

The C# implementation will produce identical validation results to the TypeScript version!
