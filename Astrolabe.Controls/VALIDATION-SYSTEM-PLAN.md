# Validation System Implementation Plan

This document outlines the plan for implementing a comprehensive validation system in the Astrolabe Controls library, based on the TypeScript version patterns and requirements.

## Overview

The validation system will provide:
1. **Trigger-based validation** - `Validate()` method that notifies validation subscribers
2. **Hierarchical validity checking** - Controls are valid only if they and all children are valid
3. **Cached child validity** - Performance optimization to avoid deep tree traversals
4. **Automatic validity propagation** - Changes in child validity notify parents

## Current State

✅ **Already Implemented:**
- `ControlChange.Valid` and `ControlChange.Validate` flags exist
- Basic error management with `IReadOnlyDictionary<string, string> Errors`
- `HasErrors` and `IsValid` properties (currently only check own errors)

## Implementation Plan

### 1. Update IsValid Logic

**Current:** `bool IsValid => !HasErrors` (only checks own errors)

**New:** Check both own errors AND child validity
```csharp
public bool IsValid => !HasErrors && !IsAnyChildInvalid;
```

**Rationale:** A control should only be valid if both it has no errors AND all its children are valid.

### 2. Add Child Validity Caching

**Add field:** `private bool? _cachedChildInvalidity;`

**Purpose:** 
- Avoid expensive recursive tree traversals on every `IsValid` access
- Similar to TypeScript version's `IsAnyChildInvalid` caching
- Cache is invalidated when children change or child validity changes

**Cache invalidation triggers:**
- `_fieldControls` or `_elementControls` collections change
- Any child's 'self' error state changes (0 errors ↔ 1+ errors)
- Any child's validity cache is reset (`_cachedChildInvalidity = null`)

### 3. Implement Validate() Method

**Add to IControl interface:**
```csharp
bool Validate();
```

**Implementation:**
- Trigger `ControlChange.Validate` notification to all subscribers
- Subscribers can validate the control and set errors using `ControlEditor`
- Does NOT automatically validate children (subscribers decide)
- Returns `IsValid` after all validation subscribers have run

**Usage pattern:**
```csharp
control.Subscribe((ctrl, change) => {
    if ((change & ControlChange.Validate) != 0) {
        // Perform validation logic
        var editor = new ControlEditor();
        if (string.IsNullOrEmpty(ctrl.Value as string)) {
            editor.SetError(ctrl, "required", "Value is required");
        } else {
            editor.SetError(ctrl, "required", null); // Clear error
        }
    }
}, ControlChange.Validate);
```

### 4. Update GetChangeState Method

**Current:** Missing `ControlChange.Valid` handling

**Add:**
```csharp
if ((mask & ControlChange.Valid) != 0 && IsValid)
    changeFlags |= ControlChange.Valid;
```

**Purpose:** Subscribers to `ControlChange.Valid` should be notified when control becomes valid.

### 5. Child Validity Propagation

**When child validity changes:**
1. Parent's `_cachedChildInvalidity` is invalidated (set to `null`)
2. Parent checks if its own `IsValid` state changed
3. If changed, parent triggers `ControlChange.Valid` notification
4. Process propagates up the parent chain

**Implementation points:**
- Hook into existing parent-child notification system
- Add validity checking to `UpdateChildValue` method
- Ensure validity changes propagate through `NotifyParentsOfChange`

### 6. Child Validity Calculation

**Method:** `private bool CalculateIsAnyChildInvalid()`

**Logic:**
```csharp
private bool CalculateIsAnyChildInvalid()
{
    // Check field controls (object properties)
    if (_fieldControls != null)
    {
        foreach (var child in _fieldControls.Values)
        {
            if (!child.IsValid) return true; // Found invalid child
        }
    }
    
    // Check element controls (array elements)
    if (_elementControls != null)
    {
        foreach (var child in _elementControls)
        {
            if (!child.IsValid) return true; // Found invalid child
        }
    }
    
    return false; // No invalid children found
}
```

**Caching with Optimization:**
```csharp
private bool IsAnyChildInvalid
{
    get
    {
        if (_cachedChildInvalidity == null)
        {
            _cachedChildInvalidity = CalculateIsAnyChildInvalid();
        }
        return _cachedChildInvalidity.Value;
    }
}
```

**Optimization Note:** When `_cachedChildInvalidity == true`, we don't need to recalculate until explicitly invalidated. If any child is already invalid, additional invalid children can't make the result "more false" - it stays true until a child becomes valid (which triggers cache invalidation).

### 7. Cache Invalidation Strategy

**Invalidate child validity cache when:**

1. **Child control structure changes:**
   - `_fieldControls` dictionary changes (child controls added/removed)
   - `_elementControls` list changes (array elements added/removed)

2. **Child error state changes:**
   - Any child's 'self' error state changes (going from having 1+ errors to 0 errors, or vice versa)
   - This affects the child's `HasErrors` property, which impacts its `IsValid` state

3. **Child validity cache resets:**
   - Any child's `_cachedChildInvalidity` is reset to `null`
   - This propagates up the parent chain as child validity may have changed

**Implementation:**
```csharp
private void InvalidateChildValidityCache()
{
    _cachedChildInvalidity = null;
    // Check if our validity changed and notify if so
    CheckAndNotifyValidityChange();
}

private void CheckAndNotifyValidityChange()
{
    var wasValid = GetPreviousValidState(); // Need to track this
    var isValid = IsValid;
    if (wasValid != isValid)
    {
        // Use RunListeners which calls GetChangeState() to determine notifications
        ((IControlMutation)this).RunListeners();
        // Notify parents that our validity changed
        ((IControlMutation)this).NotifyParentsOfChange();
    }
}
```

## API Changes Summary

### IControl Interface
```csharp
// Add
bool Validate();

// Update (implementation change, not interface)
bool IsValid => !HasErrors && !IsAnyChildInvalid;
```

### Control Class
```csharp
// Add fields
private bool? _cachedChildInvalidity;

// Add methods
public bool Validate()
private bool CalculateIsAnyChildInvalid()
private bool IsAnyChildInvalid { get; }
private void InvalidateChildValidityCache()
private void CheckAndNotifyValidityChange()

// Update existing methods
protected ControlChange GetChangeState(ControlChange mask) // Add Valid flag handling
void IControlMutation.NotifyParentsOfChange() // Add validity change notifications
```

## Testing Strategy

### Unit Tests to Add
1. **IsValid with children:**
   - Control with valid children should be valid
   - Control with invalid child should be invalid
   - Nested validity (child of child invalid)

2. **Validate() method:**
   - Triggers ControlChange.Validate notification
   - Subscribers can set/clear errors
   - Multiple subscribers all get notified
   - Returns true when control becomes valid
   - Returns false when control has errors

3. **Validity propagation:**
   - Child becoming invalid makes parent invalid
   - Child becoming valid (when all siblings valid) makes parent valid
   - Changes propagate up multiple levels

4. **Caching behavior:**
   - Child validity is cached
   - Cache invalidated on structure changes
   - Cache invalidated on child validity changes

5. **GetChangeState with Valid flag:**
   - Valid controls trigger ControlChange.Valid when subscribed
   - Invalid controls don't trigger ControlChange.Valid

## Performance Considerations

1. **Caching:** Child validity caching prevents expensive tree traversals
2. **Lazy calculation:** Validity only calculated when accessed
3. **Minimal notifications:** Only notify when validity actually changes
4. **Efficient invalidation:** Cache invalidation is targeted and minimal
5. **Optimization for invalid state:** Once `_cachedChildInvalidity == true`, no recalculation needed until explicit invalidation - invalid children can't make the result "more false"

## Migration Impact

**Breaking Changes:** None - all changes are additive or internal implementation changes

**Behavioral Changes:**
- `IsValid` now considers child validity (previously only own errors)
- New `Validate()` method available for trigger-based validation

## Implementation Order

1. ✅ Add `Validate()` to IControl interface
2. ✅ Add child validity caching fields to Control class  
3. ✅ Implement `CalculateChildValidity()` and `IsAnyChildValid`
4. ✅ Update `IsValid` property logic
5. ✅ Implement `Validate()` method
6. ✅ Update `GetChangeState()` to handle Valid flag
7. ✅ Add validity change notifications to parent-child system
8. ✅ Add cache invalidation to structure change methods
9. ✅ Write comprehensive tests
10. ✅ Update documentation

## Future Enhancements (Out of Scope)

- Async validation support
- Validation rule composition
- Cross-field validation
- Validation result caching beyond boolean valid/invalid