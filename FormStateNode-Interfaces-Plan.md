# FormStateNode C# Interfaces Planning Document

## Overview
This document outlines the C# interface equivalents for the TypeScript FormStateNode implementation.

## Core Interfaces

### 1. `IFormNodeOptions`
Configuration options for individual form nodes.

**TypeScript Source:** `FormNodeOptions` (lines 60-65)

**Properties:**
- `bool? ForceReadonly { get; }`
- `bool? ForceDisabled { get; }`
- `bool? ForceHidden { get; }`
- `VariablesFunc? Variables { get; }`

**Supporting Types:**
- `VariablesFunc` delegate: `IReadOnlyDictionary<string, object?>` (simplified from TypeScript's `ChangeListenerFunc` parameter)

---

### 2. `IFormGlobalOptions`
Global options shared across all form nodes in a form tree.

**TypeScript Source:** `FormGlobalOptions` (lines 66-72)

**Properties:**
- `ISchemaInterface SchemaInterface { get; }`
- `bool ClearHidden { get; }`

**Deferred Properties (implementation-specific):**
- Expression evaluator function
- `resolveChildren` function (will be in implementation)
- `runAsync` function (will be in implementation)

---

### 3. `IResolvedDefinition`
Represents a control definition with all dynamic properties evaluated.

**TypeScript Source:** `ResolvedDefinition` (lines 74-81)

**Properties:**
- `ControlDefinition Definition { get; }`
- `string? Display { get; }`
- `string? StateId { get; }`
- `object? Style { get; }`
- `object? LayoutStyle { get; }`
- `IReadOnlyList<FieldOption>? FieldOptions { get; }`

---

### 4. `IFormStateBase`
Core state properties for a form node.

**TypeScript Source:** `FormStateBase` (lines 83-92)

**Properties:**
- `SchemaDataNode Parent { get; }`
- `SchemaDataNode? DataNode { get; }`
- `bool Readonly { get; }`
- `bool? Visible { get; }` (nullable to represent tri-state: true/false/null=default)
- `bool Disabled { get; }`
- `IResolvedDefinition Resolved { get; }`
- `int ChildIndex { get; }`
- `bool Busy { get; }`

**Existing C# Types:**
- `SchemaDataNode` - already exists in `Astrolabe.Schemas`

---

### 5. `IFormNodeUi`
UI interaction methods for a form node.

**TypeScript Source:** `FormNodeUi` (lines 94-98)

**Methods:**
- `void EnsureVisible()`
- `void EnsureChildVisible(int childIndex)`
- `Func<Action> GetDisabler(ControlDisableType type)` (TBD based on ControlDisableType)

**Notes:**
- Default implementation: `noopUi` (lines 351-357)
- Allows UI layer to attach visibility/scroll behaviors

---

### 6. `IFormStateNode` (Main Interface)
Complete form state node with all functionality.

**TypeScript Source:** `FormStateNode` (lines 100-123)

**Inheritance:**
- `IFormStateBase`
- `IFormNodeOptions`
- `IDisposable` (replaces `cleanup()` method)

**Properties:**
- `object ChildKey { get; }` (object to allow string | number)
- `string UniqueId { get; }`
- `ControlDefinition Definition { get; }`
- `ISchemaInterface SchemaInterface { get; }`
- `bool Valid { get; }`
- `bool Touched { get; }`
- `bool ClearHidden { get; }`
- `IFormNode? Form { get; }` (nullable, can be null)
- `IReadOnlyList<IFormStateNode> Children { get; }`
- `IFormStateNode? ParentNode { get; }`
- `IFormNodeUi Ui { get; }`

**Methods:**
- `void SetTouched(bool touched, bool notChildren = false)`
- `bool Validate()`
- `int GetChildCount()`
- `IFormStateNode? GetChild(int index)`
- `void AttachUi(IFormNodeUi ui)`
- `void SetBusy(bool busy)`
- `void SetForceDisabled(bool forceDisable)`

**Omitted (Meta Storage):**
- `ensureMeta<A>()` method - excluded per requirements
- `meta: Record<string, any>` - excluded per requirements

**Existing C# Types:**
- `ControlDefinition` - already exists in `Astrolabe.Schemas`
- `ISchemaInterface` - already exists
- `IFormNode` - already exists in `Astrolabe.Schemas`

---

### 7. `IFormContextData`
Context data for form options/selection state.

**TypeScript Source:** `FormContextData` (lines 790-793)

**Properties:**
- `FieldOption? Option { get; }`
- `bool? OptionSelected { get; }`

**Existing C# Types:**
- `FieldOption` - already exists in `Astrolabe.Schemas`

---

## Supporting Enums/Types

### `ControlDisableType`
Referenced in `IFormNodeUi.GetDisabler()` - needs to be defined or imported.

**TypeScript Source:** Referenced in `controlDefinition.ts`

---

## Implementation Notes

### 1. Control/Reactive System
- TypeScript uses `Control<T>` from `@astroapps/controls`
- C# will use `IStructuredControl<T>` from `Astrolabe.Controls`
- Internal implementation will use `Control` class from `Astrolabe.Controls`

### 2. Children Management
- TypeScript: Uses `updateElements()` for reactive child array (line 751)
- C# will need similar mechanism in implementation
- Interface exposes `IReadOnlyList<IFormStateNode>` for consumers

### 3. Disposal Pattern
- TypeScript: `cleanup()` method (line 512)
- C#: Implement `IDisposable` pattern
- Implementation will clean up control subscriptions and child nodes

### 4. Dynamic Properties
- TypeScript creates evaluated definitions with `createEvaluatedDefinition()` (lines 124-299)
- C# implementation will need similar expression evaluation
- Deferred to implementation phase

### 5. Validation
- TypeScript: `setupValidation()` called in `initFormState()` (lines 664-673)
- C# interface exposes `Validate()` method
- Implementation details deferred

### 6. Variables Function
- TypeScript: `VariablesFunc = (changes: ChangeListenerFunc<any>) => Record<string, any>`
- C# simplified: `delegate IReadOnlyDictionary<string, object?> VariablesFunc()`
- Change listener mechanism handled by implementation

---

## File Structure Recommendation

```
Astrolabe.Schemas/
  IFormStateNode.cs          # Main interfaces file
    - IFormNodeOptions
    - IFormGlobalOptions
    - IResolvedDefinition
    - IFormStateBase
    - IFormNodeUi
    - IFormStateNode
    - IFormContextData
    - VariablesFunc delegate
```

---

## Dependencies

**Already Existing:**
- `Astrolabe.Controls.IStructuredControl<T>`
- `Astrolabe.Controls.IControl`
- `Astrolabe.Schemas.SchemaDataNode`
- `Astrolabe.Schemas.ControlDefinition`
- `Astrolabe.Schemas.ISchemaInterface`
- `Astrolabe.Schemas.IFormNode`
- `Astrolabe.Schemas.FieldOption`

**To Be Defined Later (Implementation):**
- `ControlDisableType` enum (if not already exists)
- Expression evaluation infrastructure
- Child resolution mechanism
- Async execution mechanism

---

## Next Steps

1. ✅ Define interfaces (this document)
2. ⬜ Create `IFormStateNode.cs` with all interfaces
3. ⬜ Define `ControlDisableType` if needed
4. ⬜ Implement `FormStateNodeImpl` class
5. ⬜ Implement expression evaluation for dynamic properties
6. ⬜ Implement child resolution mechanism
7. ⬜ Implement validation setup
8. ⬜ Add tests