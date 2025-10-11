# FormStateNode Reactivity Implementation Plan

## Overview

This document outlines a phased approach to implementing reactive properties for `IFormStateNode` using the C# Controls library (`Astrolabe.Controls`). The implementation will transition from the current static property approach to a reactive system where properties automatically update based on their dependencies.

## Current State

Currently, `FormStateNode` stores most properties as immutable constructor parameters:
- `Definition`, `DataNode`, `Parent`, etc. are set once at construction
- No automatic updates when dependencies change
- Children are reactive using `Control.MakeComputedWithPrevious`

## Target State

Introduce `FormStateImpl` record containing all reactive properties:
- Properties are stored in a structured control (`IStructuredControl<FormStateImpl>`)
- Each property is backed by an `ITypedControl<T>` accessible via `.Field(x => x.PropertyName)`
- Properties automatically recompute when dependencies change using `Control.MakeComputed`
- Maintains type safety and immutability guarantees

## Core Infrastructure

### FormStateImpl Record

```csharp
namespace Astrolabe.Schemas;

/// <summary>
/// Contains all reactive state for a form state node.
/// This record is used with Control.CreateStructured to create reactive properties.
/// </summary>
public record FormStateImpl
{
    // State flags
    public bool Readonly { get; init; }
    public bool? Visible { get; init; }  // null = default, true = shown, false = hidden
    public bool Disabled { get; init; }
    public bool Busy { get; init; }

    // Data binding
    public SchemaDataNode? DataNode { get; init; }

    // Children management
    public List<IFormStateNode> Children { get; init; } = new();
    public int ChildIndex { get; init; }

    // Resolved definition & dynamic properties
    public ControlDefinition Definition { get; init; }
    public string? Display { get; init; }
    public string? StateId { get; init; }
    public object? Style { get; init; }
    public object? LayoutStyle { get; init; }
    public ICollection<FieldOption>? FieldOptions { get; init; }
    public object? AllowedOptions { get; init; }

    // Force overrides
    public bool? ForceReadonly { get; init; }
    public bool? ForceDisabled { get; init; }
    public bool? ForceHidden { get; init; }
}
```

---

## Phase 1: Visibility Implementation

**Goal**: Implement reactive visibility property as proof-of-concept for the reactive architecture.

### Reference Implementation (TypeScript)

```typescript
// formStateNode.ts:590-600
updateComputedValue(visible, () => {
  if (forceHidden.value) return false;
  if (parentNode && !parentNode.visible) return parentNode.visible;
  const dn = dataNode.value;
  if (
    dn &&
    (!validDataNode(dn) || hideDisplayOnly(dn, schemaInterface, definition))
  )
    return false;
  return definition.hidden == null ? null : !definition.hidden;
});
```

### Implementation Steps

#### 1.1 Add FormStateImpl Record
- Create `FormStateImpl.cs` with initial properties focusing on visibility needs
- Include: `Visible`, `ForceHidden`, `DataNode`, `Definition`
- Leave other properties for later phases

#### 1.2 Add Structured Control to FormStateNode
```csharp
public class FormStateNode : IFormStateNode
{
    private readonly IStructuredControl<FormStateImpl> _state;
    private readonly ControlEditor _editor;

    // Keep existing fields temporarily
    private readonly ControlDefinition _definition;

    public FormStateNode(...)
    {
        // Create structured control with initial state
        _state = Control.CreateStructured(new FormStateImpl
        {
            Visible = null,
            ForceHidden = false,
            DataNode = dataNode,
            Definition = definition,
            // ... other initial values
        });

        _editor = editor;

        // Set up reactive visibility
        InitializeVisibility();
    }
}
```

#### 1.3 Implement Reactive Visibility Computation
```csharp
private void InitializeVisibility()
{
    var visibleField = _state.Field(x => x.Visible);
    var forceHiddenField = _state.Field(x => x.ForceHidden);
    var dataNodeField = _state.Field(x => x.DataNode);
    var definitionField = _state.Field(x => x.Definition);

    Control.MakeComputed(visibleField, tracker =>
    {
        var forceHidden = tracker.Tracked(forceHiddenField).Value;
        if (forceHidden == true)
            return false;

        if (ParentNode != null && !ParentNode.Visible)
            return ParentNode.Visible;

        var dn = tracker.Tracked(dataNodeField).Value;
        var definition = tracker.Tracked(definitionField).Value;

        if (dn != null &&
            (!FormStateNodeHelpers.ValidDataNode(dn) ||
             FormStateNodeHelpers.HideDisplayOnly(dn, _schemaInterface, definition)))
        {
            return false;
        }

        return definition.Hidden == null ? null : !definition.Hidden;
    }, _editor);
}
```

#### 1.4 Update IFormStateNode Interface
```csharp
public interface IFormStateNode
{
    // Add visibility property
    bool? Visible { get; }

    // Existing properties
    ControlDefinition Definition { get; }
    IFormNode? Form { get; }
    // ... rest unchanged for now
}
```

#### 1.5 Expose Visible Property
```csharp
public class FormStateNode : IFormStateNode
{
    public bool? Visible => _state.Field(x => x.Visible).Value;
}
```

#### 1.6 Add Helper Methods
```csharp
// FormStateNodeHelpers.cs
public static class FormStateNodeHelpers
{
    public static bool ValidDataNode(SchemaDataNode node)
    {
        // Port from TypeScript validDataNode
        // Check if data node is in valid state
    }

    public static bool HideDisplayOnly(
        SchemaDataNode node,
        ISchemaInterface schemaInterface,
        ControlDefinition definition)
    {
        // Port from TypeScript hideDisplayOnly
        // Check if display-only controls should be hidden
    }
}
```

### Testing Phase 1

1. Test static visibility (no dynamic expressions)
2. Test `forceHidden` override
3. Test parent visibility inheritance
4. Test data node validity hiding
5. Test display-only hiding
6. Test visibility changes propagate to UI

### Success Criteria

- [ ] `Visible` property updates automatically when dependencies change
- [ ] Parent visibility inheritance works correctly
- [ ] Force hidden override works
- [ ] Data node validity correctly affects visibility
- [ ] No performance regressions
- [ ] All existing tests pass

---

## Phase 2: DataNode Reactivity

**Goal**: Make `DataNode` reactive based on definition and parent changes.

### Reference Implementation (TypeScript)

```typescript
// formStateNode.ts:588
updateComputedValue(dataNode, () => lookupDataNode(definition, parent));
```

### Implementation Steps

#### 2.1 Make DataNode Computed
```csharp
private void InitializeDataNode()
{
    var dataNodeField = _state.Field(x => x.DataNode);
    var definitionField = _state.Field(x => x.Definition);

    Control.MakeComputed(dataNodeField, tracker =>
    {
        var definition = tracker.Tracked(definitionField).Value;
        return FormStateNodeHelpers.LookupDataNode(definition, Parent);
    }, _editor);
}
```

#### 2.2 Update Visibility to Track DataNode
- Visibility computation already tracks `dataNodeField` from Phase 1
- Verify visibility updates when data node changes

### Testing Phase 2

1. Test data node lookup when definition changes
2. Test visibility updates when data node changes
3. Test field options update when data node changes (preparation for Phase 4)

---

## Phase 3: Readonly and Disabled Reactivity

**Goal**: Implement reactive readonly and disabled properties with parent inheritance.

### Reference Implementation (TypeScript)

```typescript
// formStateNode.ts:602-615
updateComputedValue(
  readonly,
  () =>
    parentNode?.readonly ||
    forceReadonly.value ||
    isControlReadonly(definition),
);

updateComputedValue(
  disabled,
  () =>
    parentNode?.disabled ||
    forceDisabled.value ||
    isControlDisabled(definition),
);
```

### Implementation Steps

#### 3.1 Implement Readonly Computation
```csharp
private void InitializeReadonly()
{
    var readonlyField = _state.Field(x => x.Readonly);
    var forceReadonlyField = _state.Field(x => x.ForceReadonly);
    var definitionField = _state.Field(x => x.Definition);

    Control.MakeComputed(readonlyField, tracker =>
    {
        if (ParentNode?.Readonly == true)
            return true;

        var forceReadonly = tracker.Tracked(forceReadonlyField).Value;
        if (forceReadonly == true)
            return true;

        var definition = tracker.Tracked(definitionField).Value;
        return ControlDefinitionHelpers.IsControlReadonly(definition);
    }, _editor);
}
```

#### 3.2 Implement Disabled Computation
```csharp
private void InitializeDisabled()
{
    var disabledField = _state.Field(x => x.Disabled);
    var forceDisabledField = _state.Field(x => x.ForceDisabled);
    var definitionField = _state.Field(x => x.Definition);

    Control.MakeComputed(disabledField, tracker =>
    {
        if (ParentNode?.Disabled == true)
            return true;

        var forceDisabled = tracker.Tracked(forceDisabledField).Value;
        if (forceDisabled == true)
            return true;

        var definition = tracker.Tracked(definitionField).Value;
        return ControlDefinitionHelpers.IsControlDisabled(definition);
    }, _editor);
}
```

#### 3.3 Sync with DataNode Control
```csharp
// Port from TypeScript formStateNode.ts:638-643
private void SyncDisabledWithDataNode()
{
    var disabledField = _state.Field(x => x.Disabled);
    var dataNodeField = _state.Field(x => x.DataNode);

    // Set up bidirectional sync
    _state.UnderlyingControl.Subscribe((ctrl, change, editor) =>
    {
        var dn = dataNodeField.Value;
        if (dn != null && change.HasFlag(ControlChange.Value))
        {
            var disabled = disabledField.Value;
            editor.SetDisabled(dn.Control, disabled);
        }
    }, ControlChange.Value);
}
```

### Testing Phase 3

1. Test readonly inheritance from parent
2. Test disabled inheritance from parent
3. Test force overrides
4. Test definition-based readonly/disabled
5. Test sync with data node control

---

## Phase 4: FieldOptions and AllowedOptions

**Goal**: Implement reactive field options computation based on data node and allowed options.

### Reference Implementation (TypeScript)

```typescript
// formStateNode.ts:617-636
updateComputedValue(fieldOptions, () => {
  const dn = dataNode.value;
  if (!dn) return undefined;
  const fieldOptions = schemaInterface.getDataOptions(dn);
  const _allowed = allowedOptions.value ?? [];
  const allowed = Array.isArray(_allowed) ? _allowed : [_allowed];

  return allowed.length > 0
    ? allowed
        .map((x) =>
          typeof x === "object"
            ? x
            : (fieldOptions?.find((y) => y.value == x) ?? {
                name: x.toString(),
                value: x,
              }),
        )
        .filter((x) => x != null)
    : fieldOptions;
});
```

### Implementation Steps

#### 4.1 Implement FieldOptions Computation
```csharp
private void InitializeFieldOptions()
{
    var fieldOptionsField = _state.Field(x => x.FieldOptions);
    var dataNodeField = _state.Field(x => x.DataNode);
    var allowedOptionsField = _state.Field(x => x.AllowedOptions);

    Control.MakeComputed(fieldOptionsField, tracker =>
    {
        var dn = tracker.Tracked(dataNodeField).Value;
        if (dn == null) return null;

        var fieldOptions = _schemaInterface.GetDataOptions(dn);
        var allowedOptions = tracker.Tracked(allowedOptionsField).Value;

        if (allowedOptions == null)
            return fieldOptions;

        // Filter field options by allowed values
        var allowed = NormalizeAllowedOptions(allowedOptions);
        return FilterFieldOptions(fieldOptions, allowed);
    }, _editor);
}
```

---

## Phase 5: Definition Evaluation and Dynamic Properties

**Goal**: Implement dynamic property evaluation (display, style, layoutStyle) from expressions.

### Reference Implementation (TypeScript)

```typescript
// formStateNode.ts:566-580
evalDynamic(display, DynamicPropertyType.Display, undefined, coerceString);
evalDynamic(style, DynamicPropertyType.Style, undefined, coerceStyle);
evalDynamic(layoutStyle, DynamicPropertyType.LayoutStyle, undefined, coerceStyle);
```

This phase requires:
1. Expression evaluation system (port from TypeScript)
2. Dynamic property evaluation
3. Style/Display coercion helpers

### Implementation Steps

#### 5.1 Port Expression Evaluation
- Port `createEvalExpr` from TypeScript
- Port `ExpressionEvalContext`
- Implement dynamic property evaluation

#### 5.2 Implement Dynamic Properties
```csharp
private void InitializeDynamicProperties()
{
    var displayField = _state.Field(x => x.Display);
    var styleField = _state.Field(x => x.Style);
    var layoutStyleField = _state.Field(x => x.LayoutStyle);
    var definitionField = _state.Field(x => x.Definition);

    // Set up dynamic evaluations
    EvaluateDynamicProperty(displayField, DynamicPropertyType.Display, CoerceString);
    EvaluateDynamicProperty(styleField, DynamicPropertyType.Style, CoerceStyle);
    EvaluateDynamicProperty(layoutStyleField, DynamicPropertyType.LayoutStyle, CoerceStyle);
}
```

---

## Phase 6: Evaluated Definition with Overrides

**Goal**: Create evaluated definition with dynamic overrides (like TypeScript's `createEvaluatedDefinition`).

This is the most complex phase, involving:
1. Definition override proxy system
2. Nested property evaluation
3. Group options and render options overrides

### Implementation Deferred
This phase may require significant architecture work and should be evaluated after Phases 1-5 are complete.

---

## Phase 7: Children Reactivity Enhancement

**Goal**: Enhance children reactivity to work seamlessly with parent state changes.

Current implementation already has reactive children via `MakeComputedWithPrevious`. This phase would:
1. Ensure children respond to parent visibility/readonly/disabled changes
2. Optimize child updates
3. Handle child index updates reactively

---

## Migration Strategy

### Backward Compatibility

1. Keep existing properties on `IFormStateNode` interface
2. Implement properties as wrappers around reactive state
3. Deprecate direct construction in favor of builder pattern
4. Provide migration guide for consumers

### Performance Considerations

1. Lazy initialization of computed properties
2. Batch updates using `ControlEditor`
3. Avoid unnecessary recomputations
4. Profile before/after each phase

### Testing Strategy

1. Unit tests for each computed property
2. Integration tests for property dependencies
3. Performance benchmarks
4. Existing test suite must pass

---

## Dependencies and Order

```
Phase 1 (Visibility) - Independent, can start immediately
  ↓
Phase 2 (DataNode) - Depends on Phase 1 infrastructure
  ↓
Phase 3 (Readonly/Disabled) - Depends on Phase 1-2
  ↓
Phase 4 (FieldOptions) - Depends on Phase 2 (DataNode)
  ↓
Phase 5 (Dynamic Properties) - Depends on Phase 1-4
  ↓
Phase 6 (Evaluated Definition) - Depends on Phase 5
  ↓
Phase 7 (Children Enhancement) - Depends on Phase 1-6
```

---

## Open Questions

1. **ControlEditor sharing**: Should all computed properties share a single `ControlEditor` instance? (Likely yes)

2. **Variables function**: How to handle `VariablesFunc` in C#? Options:
   - Store as `Func<ChangeListenerFunc, Dictionary<string, object>>` on `FormStateNode` (not in state)
   - Create separate reactive context object

3. **Parent node reference**: Should parent visibility/readonly/disabled be tracked reactively?
   - Current plan: Access `ParentNode` properties directly in computed functions
   - Alternative: Subscribe to parent state changes explicitly

4. **Dynamic expression evaluation**: Should this be implemented in Phase 5 or deferred?
   - Depends on complexity of expression system port

5. **Testing approach**: Unit test each phase independently or integration test the whole system?
   - Recommendation: Both - unit tests per phase, integration tests at end

---

## Success Metrics

- All reactive properties update automatically when dependencies change
- No manual update calls needed in consumer code
- Performance equal to or better than current implementation
- Type safety maintained throughout
- All existing tests pass
- Code is more maintainable and easier to understand