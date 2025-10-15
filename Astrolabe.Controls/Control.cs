using System.Collections;
using System.Linq.Expressions;
using System.Reflection;
using Astrolabe.Common;

namespace Astrolabe.Controls;

public class Control<T> : IControl<T>, IControlMutation
{
    private static int NextId = 1;
    private object? _value;
    private object? _initialValue;
    private ControlFlags _flags;
    private readonly IControlBehavior _behavior;
    private Dictionary<string, string>? _errors;
    private bool? _cachedChildInvalidity;

    // Parent-child tracking
    private List<ParentLink>? _parents;

    // Child control management - lazily initialized
    private Dictionary<string, IControl>? _fieldControls;
    private List<IControl>? _elementControls;

    // Static empty collections for non-object/array controls
    private static readonly IEnumerable<string> EmptyFieldNames = [];
    private static readonly IReadOnlyList<IControl> EmptyElements = new List<IControl>();
    private static readonly IReadOnlyDictionary<string, string> EmptyErrors = new Dictionary<
        string,
        string
    >().AsReadOnly();

    // Internal constructor - use factory methods instead
    internal Control(object? value, object? initialValue, ControlFlags flags = ControlFlags.None, IControlBehavior? behavior = null)
    {
        _value = value;
        _initialValue = initialValue;
        _flags = flags;
        _behavior = behavior ?? DefaultControlBehavior.Instance;
        UniqueId = Interlocked.Increment(ref NextId);
    }

    // Internal accessor methods for DefaultControlBehavior
    internal object? GetValue() => _value;
    internal object? GetInitialValue() => _initialValue;
    internal ControlFlags GetFlags() => _flags;

    public int UniqueId { get; }

    public object? ValueObject
    {
        get
        {
            if ((_flags & ControlFlags.ChildValueDirty) != 0)
            {
                ReconstructValueFromChildren();
            }
            // Return null for undefined values instead of exposing internal sentinel
            return _value is UndefinedValue ? null : _value;
        }
    }

    public object? InitialValueObject =>
        // No reconstruction needed - InitialValue only flows top-down
        // Return null for undefined values instead of exposing internal sentinel
        _initialValue is UndefinedValue ? null : _initialValue;

    // Typed property accessors for IControl<T>
    public T Value => (T) ValueObject!;
    public T InitialValue => (T)InitialValueObject!;

    public bool IsDirty => !IControl.IsEqual(ValueObject, InitialValueObject);
    public bool IsDisabled => (_flags & ControlFlags.Disabled) != 0;
    public bool IsTouched => (_flags & ControlFlags.Touched) != 0;

    // Error management
    public IReadOnlyDictionary<string, string> Errors
    {
        get
        {
            if (_errors == null)
                return EmptyErrors;

            if ((_flags & ControlFlags.ErrorsMutable) == 0) return _errors;
            // Errors are mutable (we own them), clone and freeze for external access
            _errors = _errors.ToDictionary(x => x.Key, x => x.Value);
            _flags &= ~ControlFlags.ErrorsMutable;
            return _errors;
        }
    }

    public bool HasErrors => Errors.Count > 0;
    public bool IsValid => !HasErrors && !IsAnyChildInvalid;
    public bool IsUndefined => ValueObject == null && _value is UndefinedValue;

    // Type detection
    public bool IsObject => ValueObject is IDictionary<string, object>;
    public bool IsArray =>
        ValueObject is ICollection && ValueObject is not IDictionary<string, object> && ValueObject is not string;
    
    // Internal methods for array operations
    public void AddElementInternal(object? value)
    {
        if (!IsArray)
            return;

        // Ensure element controls list is created
        if (_elementControls == null)
        {
            EnsureElementControlsCreated();
        }

        // Create child control for the new element
        var newIndex = _elementControls.Count;
        var childFlags = _flags & (ControlFlags.Disabled | ControlFlags.Touched);
        var childControl = new Control<object?>(value, value, childFlags);

        // Set up parent-child relationship and add to list
        AttachChildControl(childControl, newIndex);
        _elementControls.Add(childControl);

        // Mark parent dirty - reconstruction will build array from element controls
        _flags |= ControlFlags.ChildValueDirty;
        _subscriptions?.ApplyChange(ControlChange.Structure);
        InvalidateChildValidityCache();
    }

    public void RemoveElementInternal(int index)
    {
        if (_elementControls == null)
        {
            EnsureElementControlsCreated();
        }

        if (!IsArray || _elementControls == null || index < 0 || index >= _elementControls.Count)
            return;

        var removedControl = _elementControls[index];
        if (removedControl is IControlMutation childMutation)
        {
            childMutation.UpdateParentLink(this, null); // Remove parent link
        }
        _elementControls.RemoveAt(index);

        // Mark parent dirty - reconstruction will build array from remaining element controls
        _flags |= ControlFlags.ChildValueDirty;
        _subscriptions?.ApplyChange(ControlChange.Structure);
        InvalidateChildValidityCache();
    }

    public int Count =>
        IsArray
            ? ((ICollection)ValueObject!).Count
            : IsObject
                ? ((IDictionary<string, object>)ValueObject!).Count
                : 0;

    // Indexer access
    public IControl this[string propertyName]
    {
        get
        {
            // Lazy initialization indicates this should be an object type
            _fieldControls ??= new Dictionary<string, IControl>();

            // Return cached control if exists
            if (_fieldControls.TryGetValue(propertyName, out var existing))
                return existing;

            // Use behavior to create child field - pass this to access internal state
            var childControl = _behavior.CreateChildField(this, propertyName);

            // Set up parent-child relationship
            AttachChildControl(childControl, propertyName);

            // Cache and return
            _fieldControls[propertyName] = childControl;
            return childControl;
        }
    }

    public IControl? this[int index]
    {
        get
        {
            // Ensure element controls list is created
            EnsureElementControlsCreated();

            // Check bounds
            if (_elementControls == null || index < 0 || index >= _elementControls.Count)
                return null;

            return _elementControls[index];
        }
    }

    // Collection properties
    public IEnumerable<string> FieldNames => !IsObject ? EmptyFieldNames : ((IDictionary<string, object>)ValueObject!).Keys;

    public IReadOnlyList<IControl> Elements
    {
        get
        {
            if (!IsArray)
                return EmptyElements;
            EnsureElementControlsCreated();
            return _elementControls!;
        }
    }

    // Type-safe field access using expression selector
    public IControl<TField> Field<TField>(Expression<Func<T, TField>> selector)
    {
        return SubField(selector);
    }

    public IControl<TField> SubField<T2, TField>(Expression<Func<T2, TField>> selector) where T2 : T
    {
        // Get field name first
        var fieldName = _behavior.GetFieldName(selector);

        // Lazy initialization of field controls
        _fieldControls ??= new Dictionary<string, IControl>();

        // Check if we already have a cached control for this field
        if (_fieldControls.TryGetValue(fieldName, out var existing))
        {
            // Try to cast to the typed interface
            if (existing is IControl<TField> typedControl)
                return typedControl;
        }

        // Use behavior to create typed child field with type information from selector
        var childControl = _behavior.CreateTypedField(this, selector);

        // Set up parent-child relationship
        AttachChildControl(childControl, fieldName);

        // Cache and return
        _fieldControls[fieldName] = childControl;
        return childControl;
    }

    public bool HaveField<TField>(Expression<Func<T, TField>> selector)
    {
        var fieldName = _behavior.GetFieldName(selector);
        return _fieldControls?.ContainsKey(fieldName) == true;
    }

    private Subscriptions? _subscriptions;

    // Lazy reconstruction from child controls
    private void ReconstructValueFromChildren()
    {
        // Collect field controls
        if (_fieldControls != null)
        {
            _value = _behavior.CloneWithDict<T>((T)_value!, _fieldControls);
        }

        // Collect element controls
        if (_elementControls != null)
        {
            _value = _behavior.CloneWithArray<T>((T)_value!, _elementControls);
        }
        _flags &= ~ControlFlags.ChildValueDirty;
    }

    public ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask)
    {
        _subscriptions ??= new Subscriptions();
        return _subscriptions.Subscribe(listener, GetChangeState(mask), mask);
    }

    private ControlChange GetChangeState(ControlChange mask)
    {
        ControlChange changeFlags = ControlChange.None;

        if ((mask & ControlChange.Dirty) != 0 && IsDirty)
            changeFlags |= ControlChange.Dirty;
        if ((mask & ControlChange.Disabled) != 0 && IsDisabled)
            changeFlags |= ControlChange.Disabled;
        if ((mask & ControlChange.Touched) != 0 && IsTouched)
            changeFlags |= ControlChange.Touched;
        if ((mask & ControlChange.Valid) != 0 && IsValid)
            changeFlags |= ControlChange.Valid;

        return changeFlags;
    }

    // Child control management
    private void WithChildren(Action<IControl> action)
    {
        // Apply to field controls
        if (_fieldControls != null)
        {
            foreach (var child in _fieldControls.Values)
            {
                action(child);
            }
        }

        // Apply to element controls
        if (_elementControls != null)
        {
            foreach (var child in _elementControls)
            {
                action(child);
            }
        }
    }

    // Child validity calculation
    private bool CalculateIsAnyChildInvalid()
    {
        // Check field controls (object properties)
        if (_fieldControls != null)
        {
            foreach (var child in _fieldControls.Values)
            {
                if (!child.IsValid)
                    return true; // Found invalid child
            }
        }

        // Check element controls (array elements)
        if (_elementControls != null)
        {
            foreach (var child in _elementControls)
            {
                if (!child.IsValid)
                    return true; // Found invalid child
            }
        }

        return false; // No invalid children found
    }

    private bool IsAnyChildInvalid
    {
        get
        {
            _cachedChildInvalidity ??= CalculateIsAnyChildInvalid();
            return _cachedChildInvalidity.Value;
        }
    }

    // Cache invalidation methods
    private void InvalidateChildValidityCache()
    {
        // Simple version for structure changes - always invalidate cache
        _cachedChildInvalidity = null;
    }

    void IControlMutation.InvalidateChildValidityCache(ControlEditor editor, bool hasErrors)
    {
        // Only invalidate if:
        // 1. Child became valid (!hasErrors) - might affect parent validity
        // 2. Cache shows all children were valid (_cachedChildInvalidity == false) - this change matters
        if (!hasErrors || _cachedChildInvalidity == false)
        {
            _cachedChildInvalidity = null;

            editor.AddToModifiedControls(this);

            // Propagate up to parents
            NotifyParentsOfValidityChange(editor, hasErrors);
        }
        // If hasErrors && _cachedChildInvalidity == true: no invalidation needed
        // (child became invalid but we already knew some child was invalid)
    }

    private void NotifyParentsOfValidityChange(ControlEditor editor, bool hasErrors)
    {
        if (_parents == null)
            return;

        foreach (var parentLink in _parents)
        {
            // Call InvalidateChildValidityCache via IControlMutation interface
            if (parentLink.Control is IControlMutation parentMutation)
            {
                parentMutation.InvalidateChildValidityCache(editor, hasErrors);
            }
        }
    }

    private void EnsureElementControlsCreated()
    {
        if (_elementControls != null)
            return;

        // Check if this is an array type
        if (!IsArray)
            return;

        var collection = (ICollection)ValueObject!;
        _elementControls = new List<IControl>(collection.Count);

        // Use behavior to create each element control
        for (int index = 0; index < collection.Count; index++)
        {
            var childControl = _behavior.CreateChildElement(this, index);
            if (childControl != null)
            {
                AttachChildControl(childControl, index);
                _elementControls.Add(childControl);
            }
        }
    }

    // Helper to set up parent-child relationship
    private void AttachChildControl(IControl childControl, object key)
    {
        // Set up parent-child relationship
        if (childControl is IControlMutation childMutation)
        {
            childMutation.UpdateParentLink(this, key, initial: true);
        }
    }

    private void UpdateChildControlValues(ControlEditor editor, object? newValue)
    {
        // For object controls
        if (IsObject && newValue is IDictionary<string, object> newDict)
        {
            // Update existing field controls
            if (_fieldControls != null)
            {
                foreach (var kvp in _fieldControls)
                {
                    var fieldName = kvp.Key;
                    var childControl = kvp.Value;

                    // Update existing child's value
                    editor.SetValue(childControl,
                        newDict.TryGetValue(fieldName, out var newChildValue)
                            ? newChildValue
                            // Field no longer exists in new dict - set child to undefined but keep in cache
                            : UndefinedValue.Instance);
                }
            }
        }

        // For array controls
        if (IsArray && newValue is ICollection newCollection)
        {
            if (_elementControls != null)
            {
                var newList = newCollection.Cast<object?>().ToList();
                var currentCount = _elementControls.Count;
                var newCount = newList.Count;

                // Update existing elements
                for (int i = 0; i < Math.Min(currentCount, newCount); i++)
                {
                    editor.SetValue(_elementControls[i], newList[i]);
                }

                // Add new elements if array grew
                for (int i = currentCount; i < newCount; i++)
                {
                    var childControl = _behavior.CreateChildElement(this, i);
                    if (childControl != null)
                    {
                        AttachChildControl(childControl, i);
                        _elementControls.Add(childControl);
                    }
                }

                // Remove excess elements if array shrunk
                if (newCount < currentCount)
                {
                    for (int i = newCount; i < currentCount; i++)
                    {
                        if (_elementControls[i] is IControlMutation childMutation)
                        {
                            childMutation.UpdateParentLink(this, null); // Remove parent link
                        }
                    }
                    _elementControls.RemoveRange(newCount, currentCount - newCount);
                }

                // Fire Structure change and invalidate validity cache if child count changed
                if (currentCount != newCount)
                {
                    _subscriptions?.ApplyChange(ControlChange.Structure);
                    InvalidateChildValidityCache();
                }
            }
        }
    }

    private bool ShouldClearChildren(object? oldValue, object? newValue)
    {
        // Clear children if switching between different collection types
        var wasArray =
            oldValue is ICollection
            && oldValue is not IDictionary<string, object>
            && oldValue is not string;
        var wasObject = oldValue is IDictionary<string, object>;
        var isArray =
            newValue is ICollection
            && newValue is not IDictionary<string, object>
            && newValue is not string;
        var isObject = newValue is IDictionary<string, object>;

        // Special case: null/undefined to object/array should preserve children
        // since null/undefined controls can already have field children
        if ((oldValue == null || oldValue is UndefinedValue) && (isObject || isArray))
        {
            return false; // Don't clear children when promoting null/undefined to collection
        }

        return (wasArray != isArray) || (wasObject != isObject);
    }

    private void ClearAllChildControls()
    {
        // Clear field controls
        if (_fieldControls != null)
        {
            foreach (var child in _fieldControls.Values)
            {
                if (child is IControlMutation childMutation)
                {
                    childMutation.UpdateParentLink(this, null); // Remove parent link
                }
            }
            _fieldControls.Clear();
        }

        // Clear element controls
        if (_elementControls != null)
        {
            foreach (var child in _elementControls)
            {
                if (child is IControlMutation childMutation)
                {
                    childMutation.UpdateParentLink(this, null); // Remove parent link
                }
            }
            _elementControls = null;
        }

        // Invalidate validity cache since all children are gone
        InvalidateChildValidityCache();
    }

    void IControlMutation.UpdateChildValue(ControlEditor editor, object key)
    {
        // Just mark as dirty - reconstruction happens lazily
        _flags |= ControlFlags.ChildValueDirty;

        // Notify subscribers that value changed
        _subscriptions?.ApplyChange(ControlChange.Value);
        editor.AddToModifiedControls(this);

        // Propagate up to parent
        NotifyParentsOfChange(editor);
    }

    // Internal mutation interface implementation
    bool IControlMutation.SetValueInternal(ControlEditor editor, object? value)
    {
        var oldValue = ValueObject;
        var changed = !IControl.IsEqual(oldValue, value);

        if (!changed) return false;
        // Store as object? directly - no need to cast to T
        _value = value;
        _flags &= ~ControlFlags.ChildValueDirty; // Clear dirty flag - we have external value

        // Clear errors unless DontClearError flag is set
        if ((_flags & ControlFlags.DontClearError) == 0)
        {
            ((IControlMutation)this).ClearErrorsInternal(editor);
        }

        // Handle child controls based on value type change
        if (ShouldClearChildren(oldValue, value))
        {
            // Type changed (e.g., object to array) - clear all children
            ClearAllChildControls();
        }
        else
        {
            // Same type or compatible - update existing children
            UpdateChildControlValues(editor, value);
        }

        _subscriptions?.ApplyChange(ControlChange.Value);

        // Notify parents of the change
        NotifyParentsOfChange(editor);

        return true;

    }

    bool IControlMutation.SetInitialValueInternal(ControlEditor editor, object? initialValue)
    {
        if (!IControl.IsEqual(_initialValue, initialValue))
        {
            // Store as object? directly - no need to cast to T
            _initialValue = initialValue;

            // Propagate initial value changes to children
            PropagateInitialValueToChildren(editor, initialValue);

            _subscriptions?.ApplyChange(ControlChange.InitialValue);
            return true;
        }
        return false;
    }

    private void PropagateInitialValueToChildren(ControlEditor editor, object? newInitialValue)
    {
        // Update field controls
        if (
            IsObject
            && newInitialValue is IDictionary<string, object> initialDict
            && _fieldControls != null
        )
        {
            foreach (var kvp in _fieldControls)
            {
                var fieldName = kvp.Key;
                var childControl = kvp.Value;

                var childInitialValue = initialDict.TryGetValue(fieldName, out var value)
                    ? value
                    : null;
                editor.SetInitialValue(childControl, childInitialValue);
            }
        }

        // Update element controls
        if (IsArray && newInitialValue is ICollection initialCollection && _elementControls != null)
        {
            var initialArray = initialCollection.Cast<object?>().ToArray();
            for (int i = 0; i < _elementControls.Count && i < initialArray.Length; i++)
            {
                editor.SetInitialValue(_elementControls[i], initialArray[i]);
            }

            // For elements beyond the initial array length, set initial value to null
            for (int i = initialArray.Length; i < _elementControls.Count; i++)
            {
                editor.SetInitialValue(_elementControls[i], null);
            }
        }
    }

    bool IControlMutation.SetDisabledInternal(
        ControlEditor editor,
        bool disabled,
        bool childrenOnly
    )
    {
        var changed = false;

        if (!childrenOnly)
        {
            if (disabled == IsDisabled)
                return false;
            if (disabled)
                _flags |= ControlFlags.Disabled;
            else
                _flags &= ~ControlFlags.Disabled;
            changed = true;
        }

        // Propagate to children
        WithChildren(child =>
        {
            if (child is IControlMutation childMutation)
            {
                childMutation.SetDisabledInternal(editor, disabled, childrenOnly: false);
            }
        });

        return changed;
    }

    bool IControlMutation.SetTouchedInternal(ControlEditor editor, bool touched, bool childrenOnly)
    {
        var changed = false;

        if (!childrenOnly)
        {
            if (touched == IsTouched)
                return false;
            if (touched)
                _flags |= ControlFlags.Touched;
            else
                _flags &= ~ControlFlags.Touched;
            changed = true;
        }

        // Propagate to children
        WithChildren(child =>
        {
            if (child is IControlMutation childMutation)
            {
                childMutation.SetTouchedInternal(editor, touched, childrenOnly: false);
            }
        });

        return changed;
    }

    void IControlMutation.RunListeners(ControlEditor editor)
    {
        var s = _subscriptions;
        if (s != null)
        {
            var currentState = GetChangeState(s.Mask);
            s.RunListeners(this, currentState, editor);
        }
    }

    // Parent-child relationship management
    void IControlMutation.UpdateParentLink(IControl parent, object? key, bool initial)
    {
        if (key == null)
        {
            // Remove this parent
            _parents = _parents?.Where(p => p.Control != parent).ToList();
            if (_parents?.Count == 0)
                _parents = null;
            return;
        }

        var existing = _parents?.Find(p => p.Control == parent);
        if (existing != null)
        {
            existing.Key = key;
            if (initial)
                existing.OriginalKey = key;
        }
        else
        {
            var newLink = new ParentLink
            {
                Control = parent,
                Key = key,
                OriginalKey = initial ? key : null
            };
            _parents ??= new List<ParentLink>();
            _parents.Add(newLink);
        }
    }

    public void NotifyParentsOfChange(ControlEditor editor)
    {
        if (_parents == null)
            return;

        foreach (var parentLink in _parents)
        {
            // Call UpdateChildValue via IControlMutation interface
            if (parentLink.Control is IControlMutation parentMutation)
            {
                parentMutation.UpdateChildValue(editor, parentLink.Key);
            }
        }
    }

    // Error management implementation
    bool IControlMutation.SetErrorsInternal(
        ControlEditor editor,
        IDictionary<string, string> errors
    )
    {
        // Remove empty/null values from input
        var cleanedErrors = errors
            .Where(x => !string.IsNullOrEmpty(x.Value))
            .ToDictionary(x => x.Key, x => x.Value);

        if (DictionariesEqual(_errors, cleanedErrors))
            return false;

        _errors = cleanedErrors.Count > 0 ? new Dictionary<string, string>(cleanedErrors) : null;
        _flags |= ControlFlags.ErrorsMutable; // Mark as mutable since we own them

        _subscriptions?.ApplyChange(ControlChange.Error);

        // Notify parents of validity change if error state changed
        NotifyParentsOfValidityChange(editor, _errors != null);

        return true;
    }

    bool IControlMutation.SetErrorInternal(ControlEditor editor, string key, string? message)
    {
        // Check current state first to avoid unnecessary mutations
        var currentHasError = _errors?.ContainsKey(key) == true;
        var currentMessage = currentHasError ? _errors![key] : null;
        var newMessage = string.IsNullOrEmpty(message) ? null : message;

        // No change needed
        if (currentMessage == newMessage)
            return false;

        // Now we know a change is needed - ensure we own the errors dictionary
        if ((_flags & ControlFlags.ErrorsMutable) == 0)
        {
            _errors =
                _errors?.ToDictionary(x => x.Key, x => x.Value) ?? new Dictionary<string, string>();
            _flags |= ControlFlags.ErrorsMutable;
        }

        if (newMessage == null)
        {
            // Remove error (we already know it exists from the check above)
            _errors!.Remove(key);
        }
        else
        {
            // Set/update error
            _errors![key] = newMessage;
        }

        // Clean up empty dictionary
        if (_errors!.Count == 0)
        {
            _errors = null;
            _flags &= ~ControlFlags.ErrorsMutable;
        }

        _subscriptions?.ApplyChange(ControlChange.Error);

        // Notify parents of validity change if error state changed
        NotifyParentsOfValidityChange(editor, _errors != null);

        return true;
    }

    bool IControlMutation.ClearErrorsInternal(ControlEditor editor)
    {
        if (_errors == null || _errors.Count == 0)
            return false;

        _errors = null;
        _flags &= ~ControlFlags.ErrorsMutable;
        _subscriptions?.ApplyChange(ControlChange.Error);

        // Notify parents of validity change (errors cleared, so hasErrors = false)
        NotifyParentsOfValidityChange(editor, false);

        return true;
    }

    // IControlMutation validation implementation
    public void RunValidationListeners(ControlEditor editor)
    {
        // First validate all children recursively
        WithChildren(child =>
        {
            if (child is IControlMutation childMutation)
            {
                childMutation.RunValidationListeners(editor);
            }
        });

        // Then run validation listeners for this control
        _subscriptions?.RunMatchingListeners(this, ControlChange.Validate, editor);
    }

    private static bool DictionariesEqual(
        IDictionary<string, string>? dict1,
        IDictionary<string, string>? dict2
    )
    {
        if (dict1 == null && dict2 == null)
            return true;
        if (dict1 == null || dict2 == null)
            return false;
        if (dict1.Count != dict2.Count)
            return false;

        foreach (var kvp in dict1)
        {
            if (!dict2.TryGetValue(kvp.Key, out var value) || value != kvp.Value)
                return false;
        }
        return true;
    }

}

[Flags]
public enum ControlFlags
{
    None = 0,
    Disabled = 1,
    Touched = 2,
    ChildValueDirty = 4,
    ErrorsMutable = 16,
    DontClearError = 32
}

public static class Control
{
        // Factory method for simple control creation (replaces old constructor behavior)
    public static Control<object?> Create(object? initialValue = null, bool dontClearError = false)
    {
        var flags = dontClearError ? ControlFlags.DontClearError : ControlFlags.None;
        return new Control<object?>(initialValue, initialValue, flags);
    }

    /// <summary>
    /// Creates a structured control from a POCO/record object.
    /// The object's properties become child controls accessible via the Field() extension method.
    /// </summary>
    /// <typeparam name="T">The type of the structured object</typeparam>
    /// <param name="initialValue">The initial value object</param>
    /// <param name="dontClearError">If true, errors won't be cleared when value changes</param>
    /// <returns>A control with the object's properties stored as a dictionary</returns>
    /// <example>
    /// <code>
    /// record FormState(bool? Visible, bool Readonly);
    /// var control = Control.CreateStructured(new FormState(null, false));
    /// var visibleControl = control["Visible"]; // Access child control via indexer
    /// </code>
    /// </example>
    public static IControl<IDictionary<string, object?>> CreateStructured<T>(T initialValue, bool dontClearError = false)
        where T : class
    {
        // Convert the structured object to a dictionary for internal storage
        var dict = ObjectToDictionary(initialValue);
        var flags = dontClearError ? ControlFlags.DontClearError : ControlFlags.None;
        return new Control<IDictionary<string, object?>>(dict, dict, flags);
    }

    /// <summary>
    /// Converts a POCO/record object to a dictionary for internal control storage.
    /// Uses reflection to read all public readable properties.
    /// </summary>
    private static Dictionary<string, object?> ObjectToDictionary<T>(T obj) where T : class
    {
        if (obj == null)
            throw new ArgumentNullException(nameof(obj));

        var dict = new Dictionary<string, object?>();
        var properties = typeof(T).GetProperties(
            System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance
        );

        foreach (var property in properties)
        {
            // Only include readable properties
            if (property.CanRead)
            {
                var value = property.GetValue(obj);
                dict[property.Name] = value;
            }
        }

        return dict;
    }

    /// <summary>
    /// Creates a typed control with full configuration options.
    /// Use this when you need separate value and initialValue instances or custom behavior.
    /// </summary>
    /// <typeparam name="T">The type of value held by the control</typeparam>
    /// <param name="value">The current value</param>
    /// <param name="initialValue">The initial value (can be different from value)</param>
    /// <param name="flags">Control flags for configuration</param>
    /// <param name="behavior">Custom behavior for the control (optional)</param>
    public static Control<T> Create<T>(
        T value,
        T initialValue,
        ControlFlags flags = ControlFlags.None,
        IControlBehavior? behavior = null)
    {
        return new Control<T>(value, initialValue, flags, behavior);
    }

    // Generic factory method with automatic validator setup
    public static Control<T> Create<T>(T initialValue, Func<T, string?>? validator = null)
    {
        // Always set DontClearError for controls with validators
        var control = new Control<T>(initialValue, initialValue, validator == null ? ControlFlags.None : ControlFlags.DontClearError);

        if (validator == null) return control;
        control.Subscribe(
            (ctrl, change, editor) =>
            {
                // No need to check change flags - subscription mask ensures we only get Value or Validate changes
                var typedValue = control.Value;
                var errorMessage = validator(typedValue);
                editor.SetError(ctrl, "default", errorMessage);
            },
            ControlChange.Value | ControlChange.Validate
        );

        // Run initial validation
        var editor = new ControlEditor();
        var initialErrorMessage = validator(initialValue);
        editor.SetError(control, "default", initialErrorMessage);
        return control;
    }

    /// <summary>
    /// Creates a computed control whose value is automatically derived from other controls.
    /// The compute function is called initially and whenever any tracked dependencies change.
    /// </summary>
    /// <typeparam name="T">The type of the computed value</typeparam>
    /// <param name="compute">Function that computes the value, receiving a ChangeTracker to track dependencies</param>
    /// <param name="editor">ControlEditor instance to use for updates</param>
    /// <returns>A control that automatically updates when dependencies change</returns>
    /// <example>
    /// <code>
    /// var firstName = Control.Create("John");
    /// var lastName = Control.Create("Doe");
    /// var editor = new ControlEditor();
    ///
    /// var fullName = Control.CreateComputed(tracker => {
    ///     // Track dependencies using extension methods
    ///     return $"{firstName.Value} {lastName.Value}";
    /// }, editor);
    ///
    /// // fullName.Value is "John Doe"
    /// editor.SetValue(firstName, "Jane");
    /// // fullName.Value automatically becomes "Jane Doe"
    /// </code>
    /// </example>
    public static IControl CreateComputed<T>(
        Func<ChangeTracker, T> compute,
        ControlEditor editor)
    {
        var tracker = new ChangeTracker();

        // Initial computation
        var initialValue = compute(tracker);
        var control = new Control<T>(initialValue, initialValue);

        // Set up reactive callback
        tracker.SetCallback(() =>
        {
            var newValue = compute(tracker);
            editor.SetValue(control, newValue);
            tracker.UpdateSubscriptions();
        });

        // Establish initial subscriptions
        tracker.UpdateSubscriptions();

        return control;
    }
    
    public static Control<T> CreateUndefined<T>()
    {
        return new Control<T>(UndefinedValue.Instance, UndefinedValue.Instance);
    }


}