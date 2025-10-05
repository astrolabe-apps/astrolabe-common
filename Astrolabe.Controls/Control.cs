using System.Collections;

namespace Astrolabe.Controls;

public class Control(object? value, object? initialValue, ControlFlags flags = ControlFlags.None)
    : IControl, IControlMutation
{
    private static int NextId = 1;
    private object? _value = value;
    private object? _initialValue = initialValue;
    private ControlFlags _flags = flags;
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

    public int UniqueId { get; } = Interlocked.Increment(ref NextId);

    public IControl UnderlyingControl => this;

    public object? Value
    {
        get
        {
            if ((_flags & ControlFlags.ValueMutable) != 0)
            {
                // Value was mutable (we own it), clone and freeze for external access
                _value = DeepClone(_value);
                _flags &= ~ControlFlags.ValueMutable;
            }
            return _value;
        }
    }

    public object? InitialValue
    {
        get
        {
            if ((_flags & ControlFlags.InitialValueMutable) != 0)
            {
                // InitialValue was mutable (we own it), clone and freeze for external access
                _initialValue = DeepClone(_initialValue);
                _flags &= ~ControlFlags.InitialValueMutable;
            }
            return _initialValue;
        }
    }
    public bool IsDirty => !IControl.IsEqual(_value, _initialValue);
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

    // Type detection
    public bool IsObject => Value is IDictionary<string, object>;
    public bool IsArray =>
        Value is ICollection && Value is not IDictionary<string, object> && Value is not string;

    // Internal access to mutable values (for parent-child updates)
    private object? InternalValue => _value;
    private object? InternalInitialValue => _initialValue;

    // Internal methods for array operations
    internal void AddElementInternal(object? value)
    {
        if (!IsArray)
            return;

        // If value isn't mutable, we need to take ownership by cloning
        if ((_flags & ControlFlags.ValueMutable) == 0)
        {
            _value = DeepClone(_value);
            _flags |= ControlFlags.ValueMutable;
        }

        if (InternalValue is IList list)
        {
            list.Add(value);

            // Also add to element controls if they exist
            if (_elementControls != null)
            {
                var newIndex = list.Count - 1;
                var childControl = CreateChildControl(value, newIndex);
                _elementControls.Add(childControl);
            }

            _subscriptions?.ApplyChange(ControlChange.Structure);

            // Invalidate parent validity cache since children changed
            InvalidateChildValidityCache();
        }
    }

    internal void RemoveElementInternal(int index)
    {
        if (!IsArray)
            return;

        // If value isn't mutable, we need to take ownership by cloning
        if ((_flags & ControlFlags.ValueMutable) == 0)
        {
            _value = DeepClone(_value);
            _flags |= ControlFlags.ValueMutable;
        }

        if (InternalValue is System.Collections.IList list && index >= 0 && index < list.Count)
        {
            list.RemoveAt(index);

            // Also remove from element controls if they exist
            if (_elementControls != null && index < _elementControls.Count)
            {
                var removedControl = _elementControls[index];
                if (removedControl is IControlMutation childMutation)
                {
                    childMutation.UpdateParentLink(this, null); // Remove parent link
                }
                _elementControls.RemoveAt(index);
            }

            _subscriptions?.ApplyChange(ControlChange.Structure);

            // Invalidate parent validity cache since children changed
            InvalidateChildValidityCache();
        }
    }

    public int Count =>
        IsArray
            ? ((ICollection)Value!).Count
            : IsObject
                ? ((IDictionary<string, object>)Value!).Count
                : 0;

    // Indexer access
    public IControl? this[string propertyName]
    {
        get
        {
            // Lazy initialization indicates this should be an object type
            _fieldControls ??= new Dictionary<string, IControl>();

            // Return cached control if exists
            if (_fieldControls.TryGetValue(propertyName, out var existing))
                return existing;

            // For null or undefined parent values, create child control with null value
            if (Value is null or UndefinedValue)
            {
                var childControl = CreateChildControl(null, propertyName);
                _fieldControls[propertyName] = childControl;
                return childControl;
            }

            // Check if we have an object type
            if (Value is not IDictionary<string, object> dict)
                return null;

            // Check if property exists in dictionary - return undefined control for missing properties
            if (!dict.TryGetValue(propertyName, out var value))
            {
                var undefinedChild = CreateChildControl(UndefinedValue.Instance, propertyName);
                _fieldControls[propertyName] = undefinedChild;
                return undefinedChild;
            }

            // Create and cache child control
            var child = CreateChildControl(value, propertyName);
            _fieldControls[propertyName] = child;
            return child;
        }
    }

    public IControl? this[int index]
    {
        get
        {
            // For null parent values, we can't create array children without knowing the length
            // Return null - arrays need to be explicitly created first
            if (Value == null)
                return null;

            // Only allow array indexing for actual arrays, not objects (which also implement ICollection)
            if (Value is not ICollection collection || Value is IDictionary<string, object>)
                return null;

            // Also exclude strings since they implement ICollection but aren't arrays in our context
            if (Value is string)
                return null;

            if (index < 0 || index >= collection.Count)
                return null;

            // Ensure element controls list is created
            EnsureElementControlsCreated();

            return index < _elementControls!.Count ? _elementControls[index] : null;
        }
    }

    // Collection properties
    public IEnumerable<string> FieldNames => !IsObject ? EmptyFieldNames : ((IDictionary<string, object>)Value!).Keys;

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

    private Subscriptions? _subscriptions;

    // Factory method for simple control creation (replaces old constructor behavior)
    public static Control Create(object? initialValue = null, bool dontClearError = false)
    {
        var flags = dontClearError ? ControlFlags.DontClearError : ControlFlags.None;
        return new Control(initialValue, initialValue, flags);
    }

    /// <summary>
    /// Creates a new control with a typed value, returning a typed control wrapper.
    /// </summary>
    public static ITypedControl<T> CreateTyped<T>(T? initialValue = default, bool dontClearError = false)
    {
        var flags = dontClearError ? ControlFlags.DontClearError : ControlFlags.None;
        var control = new Control(initialValue, initialValue, flags);
        return control.AsTyped<T>();
    }

    /// <summary>
    /// Creates a structured control from a POCO/record object.
    /// The object's properties become child controls accessible via the Field() extension method.
    /// </summary>
    /// <typeparam name="T">The type of the structured object</typeparam>
    /// <param name="initialValue">The initial value object</param>
    /// <param name="dontClearError">If true, errors won't be cleared when value changes</param>
    /// <returns>A typed control wrapping the structured object with accessible child controls</returns>
    /// <example>
    /// <code>
    /// record FormState(bool? Visible, bool Readonly);
    /// var control = Control.CreateStructured(new FormState(null, false));
    /// var visibleControl = control.Field(x => x.Visible); // Access child control
    /// </code>
    /// </example>
    public static ITypedControl<T> CreateStructured<T>(T initialValue, bool dontClearError = false)
        where T : class
    {
        // Convert the structured object to a dictionary for internal storage
        var dict = ObjectToDictionary(initialValue);
        var flags = dontClearError ? ControlFlags.DontClearError : ControlFlags.None;
        var control = new Control(dict, dict, flags);
        // Use StructuredControlView instead of AsTyped since the value is a Dictionary
        return new StructuredControlView<T>(control);
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

    // Generic factory method with automatic validator setup
    public static Control Create<T>(T? initialValue, Func<T?, string?> validator)
    {
        // Always set DontClearError for controls with validators
        var control = new Control(initialValue, initialValue, ControlFlags.DontClearError);

        control.Subscribe(
            (ctrl, change, editor) =>
            {
                // No need to check change flags - subscription mask ensures we only get Value or Validate changes
                var typedValue = (T?)ctrl.Value;
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

    public ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask)
    {
        _subscriptions ??= new Subscriptions();
        return _subscriptions.Subscribe(listener, GetChangeState(mask), mask);
    }

    public ITypedControl<T> AsTyped<T>()
    {
        // Allow null and undefined for any T
        if (Value == null || Value is UndefinedValue)
            return new TypedControlView<T>(this);

        // Check if value is compatible with T
        if (Value is not T)
        {
            throw new InvalidCastException(
                $"Cannot cast control value of type {Value.GetType().Name} to {typeof(T).Name}"
            );
        }

        return new TypedControlView<T>(this);
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

    // Immutability support
    private static object? DeepClone(object? value)
    {
        return value switch
        {
            null => null,
            IDictionary<string, object> dict => CloneDictionary(dict),
            IList list => CloneList(list),
            _ => value // Primitive types and other objects are treated as immutable
        };
    }

    private static Dictionary<string, object> CloneDictionary(IDictionary<string, object> original)
    {
        var cloned = new Dictionary<string, object>(original.Count);
        foreach (var kvp in original)
        {
            cloned[kvp.Key] = DeepClone(kvp.Value)!;
        }
        return cloned;
    }

    private static List<object?> CloneList(IList original)
    {
        var cloned = new List<object?>(original.Count);
        foreach (var item in original)
        {
            cloned.Add(DeepClone(item));
        }
        return cloned;
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

    private void InvalidateChildValidityCache(ControlEditor editor, bool hasErrors)
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
            if (parentLink.Control is Control parentControl)
            {
                parentControl.InvalidateChildValidityCache(editor, hasErrors);
            }
        }
    }

    private IControl CreateChildControl(object? value, object key)
    {
        // Inherit parent flags (disabled, touched, dontClearError)
        var inheritedFlags = _flags & (ControlFlags.Disabled | ControlFlags.Touched | ControlFlags.DontClearError);

        // Determine child's initial value from parent's initial value
        object? childInitialValue = value; // fallback

        if (
            InternalInitialValue is IDictionary<string, object> initialDict
            && key is string stringKey
        )
        {
            // Object case: use parent's initial value for this field
            if (!initialDict.TryGetValue(stringKey, out childInitialValue))
            {
                childInitialValue = value; // fallback to current value
            }
        }
        else if (InternalInitialValue is ICollection initialCollection && key is int index)
        {
            // Array case: use parent's initial value for this index
            var initialArray = initialCollection.Cast<object?>().ToArray();
            if (index >= 0 && index < initialArray.Length)
            {
                childInitialValue = initialArray[index];
            }
            else
            {
                childInitialValue = value; // fallback to current value
            }
        }

        var child = new Control(value, childInitialValue, inheritedFlags);

        // Set up parent-child relationship
        if (child is IControlMutation childMutation)
        {
            childMutation.UpdateParentLink(this, key, initial: true);
        }

        return child;
    }

    private void EnsureElementControlsCreated()
    {
        if (_elementControls != null)
            return;

        var collection = (ICollection)Value!;
        _elementControls = new List<IControl>(collection.Count);

        int index = 0;
        foreach (var item in collection)
        {
            var childControl = CreateChildControl(item, index);
            _elementControls.Add(childControl);
            index++;
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
                    var childControl = CreateChildControl(newList[i], i);
                    _elementControls.Add(childControl);
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

                // Invalidate validity cache if child count changed
                if (currentCount != newCount)
                {
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

    private void UpdateChildValue(object key, object? value)
    {
        bool structureChanged = false;

        // Handle undefined values - remove from parent dictionary
        if (value is UndefinedValue)
        {
            // If value isn't mutable, we need to take ownership by cloning
            if ((_flags & ControlFlags.ValueMutable) == 0)
            {
                _value = DeepClone(_value);
                _flags |= ControlFlags.ValueMutable;
            }

            if (IsObject && key is string fieldKey)
            {
                var dict = (IDictionary<string, object>)InternalValue!;
                if (dict.Remove(fieldKey))
                {
                    structureChanged = true;
                }
            }
            // Arrays can't have undefined elements - they'd just shrink instead

            if (structureChanged)
            {
                _subscriptions?.ApplyChange(ControlChange.Structure);
            }
            return;
        }

        // Create parent object if it's null or undefined and we can determine the type
        bool wasPromoted = false;
        if (_value == null || _value is UndefinedValue)
        {
            if (_fieldControls != null && key is string)
            {
                // Field access indicates this should be an object
                _value = new Dictionary<string, object>();
                _flags |= ControlFlags.ValueMutable;
                structureChanged = true;
                wasPromoted = true;
            }
            else if (_elementControls != null && key is int)
            {
                // Element access indicates this should be an array, but we can't create one without knowing size
                // This shouldn't happen in practice as array indexer returns null for null parent
                throw new InvalidOperationException(
                    "Cannot create array parent from null - arrays must be explicitly initialized"
                );
            }
        }

        // If value isn't mutable, we need to take ownership by cloning
        if ((_flags & ControlFlags.ValueMutable) == 0)
        {
            _value = DeepClone(_value);
            _flags |= ControlFlags.ValueMutable;
        }

        if (InternalValue is IDictionary<string, object> objDict && key is string stringKey)
        {
            if (!objDict.ContainsKey(stringKey) || !IControl.IsEqual(objDict[stringKey], value))
            {
                objDict[stringKey] = value!;
                structureChanged = true;
            }
        }
        else if (InternalValue is IList arrayList && key is int index)
        {
            if (index >= 0 && index < arrayList.Count && !IControl.IsEqual(arrayList[index], value))
            {
                arrayList[index] = value;
                structureChanged = true;
            }
        }

        if (structureChanged)
        {
            _subscriptions?.ApplyChange(ControlChange.Structure);
        }

        // Notify parents if this control was promoted from null/undefined to object
        if (wasPromoted)
        {
            ((IControlMutation)this).NotifyParentsOfChange();
        }
    }

    // Internal mutation interface implementation
    bool IControlMutation.SetValueInternal(ControlEditor editor, object? value)
    {
        var oldValue = _value;
        var changed = !IControl.IsEqual(_value, value);

        if (changed)
        {
            _value = DeepClone(value); // Take ownership by cloning
            _flags |= ControlFlags.ValueMutable; // Mark as mutable since we own it

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
            ((IControlMutation)this).NotifyParentsOfChange();

            return true;
        }

        return false;
    }

    bool IControlMutation.SetInitialValueInternal(ControlEditor editor, object? initialValue)
    {
        if (!IControl.IsEqual(_initialValue, initialValue))
        {
            _initialValue = DeepClone(initialValue); // Take ownership by cloning
            _flags |= ControlFlags.InitialValueMutable; // Mark as mutable since we own it

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

    void IControlMutation.NotifyParentsOfChange()
    {
        if (_parents == null)
            return;

        foreach (var parentLink in _parents)
        {
            if (parentLink.Control is Control parentControl)
            {
                parentControl.UpdateChildValue(parentLink.Key, Value);
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

    // Typed control view wrapper
    private class TypedControlView<T>(Control control) : ITypedControl<T>
    {
        public int UniqueId => control.UniqueId;

        public T Value => (T)control.Value!;
        public T InitialValue => (T)control.InitialValue!;

        public bool IsDirty => control.IsDirty;
        public bool IsDisabled => control.IsDisabled;
        public bool IsTouched => control.IsTouched;
        public bool IsValid => control.IsValid;

        // Explicitly implement IsUndefined to check underlying control's value
        // (avoids trying to cast UndefinedValue to T)
        public bool IsUndefined => control.Value is UndefinedValue;

        public IReadOnlyDictionary<string, string> Errors => control.Errors;

        public IControl UnderlyingControl => control;
    }

    // Structured control view wrapper - for controls created with CreateStructured
    // The value is stored as Dictionary<string, object?> internally, so we don't expose Value/InitialValue
    private class StructuredControlView<T>(Control control) : ITypedControl<T>
    {
        public int UniqueId => control.UniqueId;

        // Structured controls store values as Dictionary - accessing Value/InitialValue would throw
        // Users should access child controls via Field() extension method instead
        public T Value => throw new InvalidOperationException(
            $"Cannot access Value on structured control of type {typeof(T).Name}. " +
            "Use the Field() extension method to access individual fields.");

        public T InitialValue => throw new InvalidOperationException(
            $"Cannot access InitialValue on structured control of type {typeof(T).Name}. " +
            "Use the Field() extension method to access individual fields.");

        public bool IsDirty => control.IsDirty;
        public bool IsDisabled => control.IsDisabled;
        public bool IsTouched => control.IsTouched;
        public bool IsValid => control.IsValid;
        public bool IsUndefined => control.Value is UndefinedValue;

        public IReadOnlyDictionary<string, string> Errors => control.Errors;

        public IControl UnderlyingControl => control;
    }
}

[Flags]
public enum ControlFlags
{
    None = 0,
    Disabled = 1,
    Touched = 2,
    ValueMutable = 4,
    InitialValueMutable = 8,
    ErrorsMutable = 16,
    DontClearError = 32
}
