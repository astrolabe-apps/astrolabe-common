# Dynamic Title Property Implementation Plan

## Overview

This document outlines the plan to implement dynamic property evaluation for the `Title` property in the .NET `Astrolabe.Schemas` library, matching the functionality already present in the TypeScript implementation.

## Background

### Current TypeScript Implementation

The TypeScript codebase in `forms/core/src/formStateNode.ts` implements dynamic property evaluation through the `createEvaluatedDefinition` function. Key aspects:

- **Location**: `formStateNode.ts:124-299`
- **Mechanism**: Creates a proxy over `ControlDefinition` using `createOverrideProxy` that reactively overrides properties based on dynamic expressions
- **Title Evaluation**: Lines 254-262 evaluate `DynamicPropertyType.Label` expressions to override the `title` property
- **Coercion**: Uses `coerceString` (lines 305-315) to convert expression results to strings
- **Reactivity**: Automatically updates when expression dependencies change via `createScopedEffect`

### Current .NET Implementation Status

The .NET `FormStateNode` class already implements reactive evaluation for several properties:

- ✅ **DataNode** - Reactive lookup based on definition
- ✅ **Visible** - Evaluates visibility with parent tracking and data node validation
- ✅ **Readonly** - Reactive with parent propagation
- ✅ **Disabled** - Reactive with parent propagation
- ✅ **FieldOptions** - Reactive based on DataNode schema
- ❌ **Title** - Not yet implemented (static only)

**Infrastructure Available**:
- `ReactiveExpressionEvaluators` - Registry of expression evaluators by type
- `SetupReactiveExpression` - Extension method to bind expressions to controls
- `Control<T>.MakeComputed` - Creates reactive computed properties
- `ControlEditor` - Manages control updates and change tracking
- `ExpressionEvalContext` - Context for evaluating expressions with data nodes

## Problem Statement

The .NET implementation currently uses only the static `Definition.Title` property. When a `ControlDefinition` has a `DynamicProperty` with type `DynamicPropertyType.Label`, the evaluated expression should override the title value and update reactively when dependencies change.

## Goals

1. **Primary Goal**: Implement reactive Title evaluation for `DynamicPropertyType.Label`
2. **Consistency**: Match TypeScript behavior and API surface
3. **Performance**: Use existing reactive infrastructure efficiently
4. **Testability**: Ensure comprehensive test coverage
5. **Extensibility**: Create a pattern for implementing other dynamic properties

## Technical Approach

### Architecture Decision: Evaluated vs Proxy Pattern

**TypeScript Approach**: Creates a proxy over the entire ControlDefinition that intercepts property access

**Proposed .NET Approach**: Store evaluated properties directly in `FormStateImpl` and expose through `IFormStateNode`

**Rationale**:
1. .NET record types don't support dynamic proxies easily
2. Explicit properties provide better type safety and IntelliSense
3. Reactive infrastructure already works this way for Visible, Readonly, Disabled
4. Keeps the `Definition` immutable while `FormStateImpl` holds computed state
5. Clear separation between definition (immutable schema) and state (reactive values)

### Data Flow

```
ControlDefinition.Dynamic[Label]
    ↓ (expression)
EntityExpression (e.g., DataExpression("labelField"))
    ↓ (evaluator)
ReactiveExpressionEvaluators.Evaluate()
    ↓ (with change tracking)
SetupReactiveExpression()
    ↓ (updates via ControlEditor)
FormStateImpl.Title (reactive control field)
    ↓ (exposed through)
IFormStateNode.Title (public interface)
```

### Fallback Strategy

When no `DynamicPropertyType.Label` is found:
- Fall back to `Definition.Title` (static value from definition)
- This matches TypeScript behavior where the proxy returns original values when no override exists

### String Coercion Strategy

Expression results need coercion to strings (matching TypeScript `coerceString` function):

| Input Type | Output |
|------------|--------|
| `string` | Return as-is |
| `null` | Return empty string `""` |
| `number` | Call `.ToString()` |
| `boolean` | Call `.ToString()` |
| `object` | Serialize to JSON |

## Implementation Steps

### Step 1: Override Title in ControlDefinition within FormStateImpl

**File**: `Astrolabe.Schemas/FormStateImpl.cs`

**Current State**:
```csharp
public record FormStateImpl
{
    // Control definition
    public ControlDefinition Definition { get; init; } = null!;

    // ... other properties ...
}
```

**No Changes Needed to FormStateImpl**: The `Definition` property already exists and will be reactively updated to contain a modified `ControlDefinition` with the evaluated `Title`.

**Rationale**: Properties that exist in `ControlDefinition` (like `Title`, `Hidden`, `Disabled`, etc.) should be overridden within the `Definition` itself, not duplicated as separate properties in `FormStateImpl`. This keeps the API clean and matches the TypeScript proxy pattern where `definition.title` returns the evaluated value.

### Step 2: Create String Coercion Helper

**File**: `Astrolabe.Schemas/DynamicPropertyHelpers.cs` (new file)

**Implementation**:
```csharp
namespace Astrolabe.Schemas;

/// <summary>
/// Helper methods for dynamic property evaluation and coercion.
/// </summary>
public static class DynamicPropertyHelpers
{
    /// <summary>
    /// Coerces a value to a string for dynamic property evaluation.
    /// Matches TypeScript coerceString behavior from formStateNode.ts:305-315
    /// </summary>
    public static string? CoerceString(object? value)
    {
        return value switch
        {
            null => "",
            string s => s,
            int or long or float or double or decimal or bool => value.ToString(),
            _ => System.Text.Json.JsonSerializer.Serialize(value)
        };
    }

    /// <summary>
    /// Finds the first dynamic property of a given type in a control definition.
    /// </summary>
    public static EntityExpression? FindDynamicExpression(
        ControlDefinition definition,
        DynamicPropertyType type)
    {
        var typeString = type.ToString();
        return definition.Dynamic?
            .FirstOrDefault(x => x.Type == typeString && x.Expr.Type != null)?
            .Expr;
    }
}
```

**Rationale**: Centralizes string coercion logic for reuse across all dynamic properties.

### Step 3: Implement Title Initialization in FormStateNode

**File**: `Astrolabe.Schemas/FormStateNode.cs`

**Changes**:

1. Add initialization call in constructor (after `InitializeDataNode`):
```csharp
public FormStateNode(/* ... parameters ... */)
{
    // ... existing initialization ...

    InitializeDataNode();
    InitializeReadonly();
    InitializeDisabled();
    InitializeFieldOptions();
    InitializeTitle();      // NEW
    InitializeVisibility();

    // ... children initialization ...
}
```

2. Add `InitializeTitle` method:
```csharp
private void InitializeTitle()
{
    var definitionField = _stateControl.Field(x => x.Definition);
    var originalDefinition = Definition; // Store original from constructor

    // Look for Label dynamic property in original definition
    var labelExpression = DynamicPropertyHelpers.FindDynamicExpression(
        originalDefinition,
        DynamicPropertyType.Label);

    if (labelExpression != null && DataNode != null)
    {
        // Get a field accessor for the Title property of the definition
        var titleField = definitionField.Field(d => d.Title);

        // Set up reactive expression evaluation directly on the title field
        var context = new ExpressionEvalContext(DataNode, /* ISchemaInterface needed */);

        titleField.SetupReactiveExpression(
            labelExpression,
            context,
            _editor,
            coerce: DynamicPropertyHelpers.CoerceString);
    }
    // If no dynamic title, the original definition's static title is used
}
```

**Note**: Using `.Field()` on the definition field allows us to directly access and update the `Title` property reactively without creating intermediate controls or using record `with` expressions. The reactive system automatically creates a modified copy of the ControlDefinition with the updated Title.

### Step 4: Access Title Through Definition

**No Changes Needed**: Since `Title` is now overridden in the `Definition` itself, consumers can access it via:

```csharp
formStateNode.Definition.Title  // Returns evaluated title if dynamic, otherwise static title
```

**Rationale**: This matches the TypeScript API where `formStateNode.definition.title` returns the evaluated value. The `IFormStateNode` interface already exposes `Definition`, so no additional properties are needed.

**Optional Enhancement** (for convenience):
If direct property access is desired, add a convenience property to `IFormStateNode`:

```csharp
public interface IFormStateNode
{
    // ... existing properties ...

    // Convenience property - delegates to Definition.Title
    public string? Title => Definition.Title;
}
```

This would be implemented automatically as an interface default method (C# 8.0+), requiring no changes to `FormStateNode`.

### Step 5: Write Comprehensive Tests

**File**: `Astrolabe.Schemas.Tests/FormStateNode_DynamicTitleTests.cs` (new file)

**Test Cases**:

1. **Static Title Without Dynamic Property**
   - Definition with only `Title = "My Title"`
   - No `DynamicProperty` for Label
   - Assert: `formStateNode.Title == "My Title"`

2. **Dynamic Title With Data Expression**
   - Definition with `Title = "Static"` and `Dynamic = [Label -> DataExpression("labelField")]`
   - Data has `labelField = "Dynamic Title"`
   - Assert: `formStateNode.Title == "Dynamic Title"` (overrides static)

3. **Dynamic Title Updates When Source Changes**
   - Set up with `DataExpression("labelField")`
   - Initial: `labelField = "Initial"`
   - Update: `editor.SetValue(labelFieldControl, "Updated")`
   - Assert: Title updates from "Initial" to "Updated"

4. **String Coercion From Number**
   - Expression evaluates to number `123`
   - Assert: `formStateNode.Title == "123"`

5. **String Coercion From Boolean**
   - Expression evaluates to `true`
   - Assert: `formStateNode.Title == "True"`

6. **String Coercion From Null**
   - Expression evaluates to `null`
   - Assert: `formStateNode.Title == ""`

7. **String Coercion From Object**
   - Expression evaluates to `{ name: "Test" }`
   - Assert: Title is valid JSON representation

8. **Dynamic Title With Field Match Expression**
   - Use `DataMatchExpression` that evaluates to boolean
   - Assert: Title shows "True" or "False"

9. **Null DataNode Fallback**
   - Control definition has no field (no DataNode)
   - Has dynamic Label expression
   - Assert: Falls back to static title

10. **Multiple Controls Track Independently**
    - Two FormStateNodes with different label expressions
    - Change one source field
    - Assert: Only corresponding title updates

## Testing Strategy

### Unit Tests
- Test each coercion case individually
- Test static vs dynamic title resolution
- Test reactive updates
- Test fallback behavior

### Integration Tests
- Test with complex control hierarchies
- Test with nested data structures
- Test memory cleanup (subscriptions disposed)

### Test Helpers Needed
- `CreateFormStateNodeWithDynamicTitle(definition, data)` - Helper to set up test scenarios
- Reuse existing `TestHelpers.CreateParentChildSchema` pattern

## Dependencies and Prerequisites

### Required Infrastructure (Already Exists)
- ✅ `ReactiveExpressionEvaluators` - Expression evaluation system
- ✅ `SetupReactiveExpression` - Extension method for binding expressions
- ✅ `ControlEditor` - Change tracking and updates
- ✅ `ExpressionEvalContext` - Evaluation context
- ✅ `DataExpression` evaluator - For testing

### Potential Issues
1. **Schema Interface Access**: `FormStateNode` needs access to `ISchemaInterface` for `ExpressionEvalContext`
   - Current state: Not stored as field
   - Solution: May need to pass through constructor or store in `_editor` or `FormStateImpl`

2. **Tracking Inside MakeComputed**: Need to verify we can use `SetupReactiveExpression` inside `MakeComputed`
   - Fallback: Use simpler approach with direct `SetupReactiveExpression` call

3. **Lifecycle Management**: Ensure expression subscriptions are disposed when FormStateNode is cleaned up
   - Current: `Control.MakeComputed` handles cleanup via ControlEditor
   - Verify: Test cleanup in integration tests

## Success Criteria

1. ✅ Static titles work (no regression)
2. ✅ Dynamic titles evaluate from expressions
3. ✅ Dynamic titles update when dependencies change
4. ✅ String coercion matches TypeScript behavior
5. ✅ Fallback to static title works when no dynamic property
6. ✅ All tests pass
7. ✅ No memory leaks (subscriptions cleaned up)
8. ✅ Performance is acceptable (no N+1 evaluation issues)

## Future Extensions

Once Title is implemented and proven, apply the same pattern to:

### High Priority
- **DynamicPropertyType.DefaultValue** - Evaluated default values
- **DynamicPropertyType.AllowedOptions** - Dynamic field options filtering

### Medium Priority
- **DynamicPropertyType.Style** - Dynamic inline styles
- **DynamicPropertyType.LayoutStyle** - Dynamic layout styles
- **DynamicPropertyType.GridColumns** - Dynamic grid column count

### Low Priority
- **DynamicPropertyType.ActionData** - Dynamic action parameters

## References

### TypeScript Implementation
- `forms/core/src/formStateNode.ts:124-299` - `createEvaluatedDefinition`
- `forms/core/src/formStateNode.ts:254-262` - Title evaluation
- `forms/core/src/formStateNode.ts:305-315` - String coercion
- `forms/core/src/overrideProxy.ts` - Proxy mechanism

### .NET Implementation
- `Astrolabe.Schemas/FormStateNode.cs` - Main implementation
- `Astrolabe.Schemas/ReactiveExpressionEvaluator.cs` - Expression evaluation
- `Astrolabe.Schemas/FormStateImpl.cs` - State storage
- `Astrolabe.Controls/ControlEditor.cs` - Reactive control updates

### Related Types
- `Astrolabe.Schemas/ControlDefinition.cs:343-356` - `DynamicPropertyType` enum
- `Astrolabe.Schemas/ControlDefinition.cs:358-361` - `DynamicProperty` record

## Timeline and Effort Estimate

| Task | Estimated Effort | Priority |
|------|------------------|----------|
| 1. ~~Add Title to FormStateImpl~~ (not needed) | 0 minutes | N/A |
| 2. Create CoerceString helper | 15 minutes | High |
| 3. Implement InitializeTitle with Definition override | 60 minutes | High |
| 4. ~~Expose Title in interface~~ (already via Definition) | 0 minutes | N/A |
| 5. Write tests | 60 minutes | High |
| 6. Address ISchemaInterface access | 30 minutes | High |
| 7. Integration testing | 30 minutes | Medium |
| 8. Documentation | 20 minutes | Low |

**Total Estimated Effort**: 3-4 hours (unchanged, effort redistributed to Step 3)

## Open Questions

1. **ISchemaInterface Access**: How should `FormStateNode` access `ISchemaInterface` for creating `ExpressionEvalContext`?
   - Option A: Pass through constructor
   - Option B: Store in `ControlEditor`
   - Option C: Store in `FormStateImpl` or separate globals

2. **Expression Evaluation Lifecycle**: Should expression subscriptions be stored and managed separately, or rely on `MakeComputed` cleanup?

3. **Performance**: Should we cache the label expression lookup, or is the LINQ query negligible?

4. **API Design**: Should `IFormStateNode.Title` return the evaluated value or should there be both `Title` (static) and `EvaluatedTitle`?
   - **Recommendation**: Single `Title` property (matches TypeScript API)

## Approval and Sign-off

- [ ] Plan reviewed and approved
- [ ] Ready to begin implementation
- [ ] Test strategy agreed upon
- [ ] Success criteria defined and accepted