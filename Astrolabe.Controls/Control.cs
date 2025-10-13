using System.Collections;
using System.Linq.Expressions;
using System.Reflection;
using Astrolabe.Common;

namespace Astrolabe.Controls;

public class Control<T>(T value, T initialValue, ControlFlags flags = ControlFlags.None, ControlBehavior<T>? behavior = null)
    : IControl<T>, IControlMutation
{
    private static int NextId = 1;
    private T _value = value;
    private T _initialValue = initialValue;
    private ControlFlags _flags = flags;
    private readonly ControlBehavior<T> _behavior = behavior ?? DefaultBehavior;
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

    // Default behavior for Control<T>
    private static readonly ControlBehavior<T> DefaultBehavior = new()
    {
        CloneWith = DefaultClone,
        CreateChildField = DefaultCreateChildField,
        CreateChildElement = DefaultCreateChildElement,
        GetFieldName = DefaultGetFieldName
    };

    public int UniqueId { get; } = Interlocked.Increment(ref NextId);

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

    // Typed property accessors for IControl<T>
    public T ValueT => _value;
    public T InitialValueT => _initialValue;

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
    public bool IsUndefined => Value is UndefinedValue;

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
                var childControl = _behavior.CreateChildElement(this, newIndex);
                if (childControl != null)
                {
                    AttachChildControl(childControl, newIndex);
                    _elementControls.Add(childControl);
                }
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

    // Type-safe field access using expression selector
    public IControl<TField> Field<TField>(Expression<Func<T, TField>> selector)
    {
        var fieldName = _behavior.GetFieldName(selector);
        var child = this[fieldName];

        // Try to cast to the typed interface
        if (child is IControl<TField> typedControl)
            return typedControl;

        // If cast fails (e.g., child is undefined Control<object?> but we need Control<TField>),
        // create an undefined control of the correct type
        if (child.IsUndefined)
            return (IControl<TField>)(object)new Control<object?>(UndefinedValue.Instance, UndefinedValue.Instance);

        // Fallback: create undefined control
        return (IControl<TField>)(object)new Control<object?>(UndefinedValue.Instance, UndefinedValue.Instance);
    }

    private Subscriptions? _subscriptions;

    // Factory method for simple control creation (replaces old constructor behavior)
    public static Control<object?> Create(object? initialValue = null, bool dontClearError = false)
    {
        var flags = dontClearError ? ControlFlags.DontClearError : ControlFlags.None;
        return new Control<object?>(initialValue, initialValue, flags);
    }

    /// <summary>
    /// Creates a new reactive wrapper with a typed value.
    /// </summary>
    public static IReactive<T> CreateReactive<T>(T? initialValue = default)
    {
        return new Reactive<T>(initialValue!);
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
    public static IControl CreateStructured<TValue>(TValue initialValue, bool dontClearError = false)
        where TValue : class
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

    // Generic factory method with automatic validator setup
    public static Control<T> Create<T>(T? initialValue, Func<T?, string?> validator)
    {
        // Always set DontClearError for controls with validators
        var control = new Control<T>(initialValue, initialValue, ControlFlags.DontClearError);

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

    /// <summary>
    /// Makes an existing control computed by setting up a reactive computation that updates its value.
    /// The compute function is called initially and whenever any tracked dependencies change.
    /// This is useful for overriding fields in structured controls with computed values.
    /// </summary>
    /// <typeparam name="T">The type of the control value</typeparam>
    /// <param name="control">The control to make computed</param>
    /// <param name="compute">Function that computes the value, receiving a ChangeTracker to track dependencies</param>
    /// <param name="editor">ControlEditor instance to use for updates</param>
    /// <example>
    /// <code>
    /// var baseCtrl = Control.CreateStructured(new FormStateBase { Visible = null, Readonly = false });
    /// var visibleField = baseCtrl.Field(x => x.Visible);
    /// var editor = new ControlEditor();
    ///
    /// // Make the Visible field computed based on other controls
    /// Control.MakeComputed(visibleField, tracker => {
    ///     var someCondition = (bool?)otherControl.Value;
    ///     return someCondition ? true : null;
    /// }, editor);
    ///
    /// // Now visibleField.Value is automatically computed
    /// </code>
    /// </example>
    public static void MakeComputed<T>(
        IControl control,
        Func<ChangeTracker, T> compute,
        ControlEditor editor)
    {
        var tracker = new ChangeTracker();

        // Set up reactive callback
        tracker.SetCallback(() =>
        {
            var newValue = compute(tracker);
            editor.SetValue(control, newValue);
            tracker.UpdateSubscriptions();
        });

        // Initial computation and subscription setup
        var initialValue = compute(tracker);
        editor.SetValue(control, initialValue);
        tracker.UpdateSubscriptions();
    }

    /// <summary>
    /// Makes an existing control computed by setting up a reactive computation that updates its value.
    /// Unlike MakeComputed, this version passes the current value to the compute function,
    /// allowing you to reuse or transform the existing value rather than creating a new one from scratch.
    /// </summary>
    /// <typeparam name="T">The type of the control value</typeparam>
    /// <param name="control">The control to make computed</param>
    /// <param name="compute">Function that computes the value, receiving a ChangeTracker and current value</param>
    /// <param name="editor">ControlEditor instance to use for updates</param>
    /// <example>
    /// <code>
    /// var listControl = Control.Create(new List&lt;Item&gt;());
    /// var editor = new ControlEditor();
    ///
    /// // Reuse existing items when source changes, only add/remove as needed
    /// Control.MakeComputedWithPrevious&lt;List&lt;Item&gt;&gt;(listControl, (tracker, currentList) => {
    ///     var source = (List&lt;Source&gt;)sourceControl.Value;
    ///     return UpdateList(currentList, source); // Reuses items from currentList
    /// }, editor);
    /// </code>
    /// </example>
    public static void MakeComputedWithPrevious<T>(
        IControl control,
        Func<ChangeTracker, T, T> compute,
        ControlEditor editor)
    {
        var tracker = new ChangeTracker();

        // Set up reactive callback
        tracker.SetCallback(() =>
        {
            var currentValue = (T)control.Value!;
            var newValue = compute(tracker, currentValue);
            editor.SetValue(control, newValue);
            tracker.UpdateSubscriptions();
        });

        // Initial computation and subscription setup
        var initialValue = compute(tracker, (T)control.Value!);
        editor.SetValue(control, initialValue);
        tracker.UpdateSubscriptions();
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

    // Default behavior implementations
    private static T DefaultClone(T? original, IDictionary<string, object?> overrides)
    {
        // Handle null - create new instance from overrides
        if (original == null)
        {
            // Dictionary: create from overrides
            if (typeof(T) == typeof(IDictionary<string, object?>) ||
                typeof(IDictionary<string, object?>).IsAssignableFrom(typeof(T)))
            {
                var newDict = new Dictionary<string, object?>();
                foreach (var (key, value) in overrides)
                {
                    newDict[key] = value;
                }
                return (T)(object)newDict;
            }

            // List: create empty list
            if (typeof(T) == typeof(List<object?>) ||
                typeof(IList).IsAssignableFrom(typeof(T)))
            {
                return (T)(object)new List<object?>();
            }

            // Records/classes: create using Activator then apply overrides
            var instance = Activator.CreateInstance<T>();
            if (instance is null)
                throw new InvalidOperationException($"Cannot create instance of type {typeof(T)}");
            // Only call CloneWithOverrides if T is a reference type - use reflection to avoid compile-time constraint
            if (typeof(T).IsClass && !typeof(T).IsAbstract)
            {
                var method = typeof(RecordExtensions).GetMethod(nameof(RecordExtensions.CloneWithOverrides))!;
                var genericMethod = method.MakeGenericMethod(typeof(T));
                return (T)genericMethod.Invoke(null, new object?[] { instance, overrides })!;
            }
            return instance;
        }

        // Handle non-null - merge with overrides
        if (original is IDictionary<string, object?> dict)
        {
            var newDict = new Dictionary<string, object?>(dict);
            foreach (var (key, value) in overrides)
            {
                newDict[key] = value;
            }
            return (T)(object)newDict;
        }

        if (original is IList list)
        {
            var newList = new List<object?>();
            for (int i = 0; i < list.Count; i++)
            {
                newList.Add(overrides.TryGetValue(i.ToString(), out var value)
                    ? value
                    : list[i]);
            }
            return (T)(object)newList;
        }

        // Fallback: use CloneWithOverrides for records/classes (if T is a reference type)
        if (typeof(T).IsClass && !typeof(T).IsAbstract)
        {
            // Use reflection to avoid compile-time constraint
            var method = typeof(RecordExtensions).GetMethod(nameof(RecordExtensions.CloneWithOverrides))!;
            var genericMethod = method.MakeGenericMethod(typeof(T));
            return (T)genericMethod.Invoke(null, new object?[] { original, overrides })!;
        }

        // For value types or unsupported types, return the original
        return original;
    }

    private static IControl DefaultCreateChildField(Control<T> parent, string fieldName)
    {
        var currentValue = parent._value;
        var initialValue = parent._initialValue;

        // Only inherit disabled, touched, and dontClearError flags, not all flags
        var childFlags = parent._flags & (ControlFlags.Disabled | ControlFlags.Touched | ControlFlags.DontClearError);

        if (currentValue == null)
            return new Control<object?>(UndefinedValue.Instance, UndefinedValue.Instance, childFlags);

        // Dictionary: get value for key
        if (currentValue is IDictionary<string, object?> currentDict)
        {
            if (!currentDict.TryGetValue(fieldName, out var value))
                return new Control<object?>(UndefinedValue.Instance, UndefinedValue.Instance, childFlags);

            // Get initial value from parent's initial value
            var initialDict = initialValue as IDictionary<string, object?>;
            var childInitialValue = initialDict?.TryGetValue(fieldName, out var iv) == true
                ? iv
                : value;

            return new Control<object?>(value, childInitialValue, childFlags);
        }

        // Records/Classes: use reflection to get property type and value
        var propInfo = typeof(T).GetProperty(fieldName);
        if (propInfo == null)
            return new Control<object?>(UndefinedValue.Instance, UndefinedValue.Instance, childFlags);

        var propValue = propInfo.GetValue(currentValue);

        // Get initial property value from parent's initial value
        var initialPropValue = initialValue != null
            ? propInfo.GetValue(initialValue)
            : propValue;

        // Create Control<TProperty> using reflection
        var controlType = typeof(Control<>).MakeGenericType(propInfo.PropertyType);
        var control = Activator.CreateInstance(controlType, propValue, initialPropValue, childFlags, null);
        return (IControl)control!;
    }

    private static IControl? DefaultCreateChildElement(Control<T> parent, int index)
    {
        var currentValue = parent._value;
        var initialValue = parent._initialValue;

        if (currentValue == null)
            return null;

        // Array/List: get element at index
        if (currentValue is IList currentList)
        {
            if (index < 0 || index >= currentList.Count)
                return null;

            var value = currentList[index];

            // Get initial value from parent's initial array/list
            var initialList = initialValue as IList;
            var childInitialValue = initialList != null && index < initialList.Count
                ? initialList[index]
                : value;

            // Only inherit disabled, touched, and dontClearError flags, not all flags
            var childFlags = parent._flags & (ControlFlags.Disabled | ControlFlags.Touched | ControlFlags.DontClearError);
            return new Control<object?>(value, childInitialValue, childFlags);
        }

        // Not an array/list type
        return null;
    }

    private static string DefaultGetFieldName(Expression expression)
    {
        // Handle Expression<Func<T, TField>> - extract the member name
        if (expression is LambdaExpression lambda)
        {
            if (lambda.Body is MemberExpression member)
            {
                return member.Member.Name;
            }
            // Handle unary expressions (e.g., boxing conversions)
            if (lambda.Body is UnaryExpression unary && unary.Operand is MemberExpression unaryMember)
            {
                return unaryMember.Member.Name;
            }
        }

        throw new ArgumentException($"Expression must be a member access expression, got: {expression}");
    }

    public static IControl CreateUndefined()
    {
        return new Control<object?>(UndefinedValue.Instance, UndefinedValue.Instance);
    }

    // Immutability support - generic version for T
    private static T DeepClone(T value)
    {
        if (value == null)
            return value;

        return value switch
        {
            IDictionary<string, object> dict => (T)(object)CloneDictionary(dict),
            IList list => (T)CloneList(list),
            _ => value // Primitive types and other objects are treated as immutable
        };
    }

    private static Dictionary<string, object> CloneDictionary(IDictionary<string, object> original)
    {
        var cloned = new Dictionary<string, object>(original.Count);
        foreach (var kvp in original)
        {
            cloned[kvp.Key] = DeepCloneObject(kvp.Value)!;
        }
        return cloned;
    }

    private static object CloneList(IList original)
    {
        // Check if this is a generic List<T> where T is a reference type that shouldn't be deep cloned
        var listType = original.GetType();
        if (listType.IsGenericType && listType.GetGenericTypeDefinition() == typeof(List<>))
        {
            var elementType = listType.GetGenericArguments()[0];

            // If element type is a reference type (class/interface), preserve the typed list
            // This avoids converting List<IFormStateNode> to List<object?>
            if (!elementType.IsValueType && elementType != typeof(string))
            {
                // Create a new list of the same type
                var newList = (IList)Activator.CreateInstance(listType, original.Count)!;
                foreach (var item in original)
                {
                    // Don't deep clone reference type elements - treat them as immutable references
                    newList.Add(item);
                }
                return newList;
            }
        }

        // For non-generic lists or lists of value types, use the original deep clone logic
        var cloned = new List<object?>(original.Count);
        foreach (var item in original)
        {
            cloned.Add(DeepCloneObject(item));
        }
        return cloned;
    }

    // Non-generic helper for cloning object values
    private static object? DeepCloneObject(object? value)
    {
        return value switch
        {
            null => null,
            IDictionary<string, object> dict => CloneDictionary(dict),
            IList list => CloneList(list),
            _ => value // Primitive types and other objects are treated as immutable
        };
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

        var collection = (ICollection)Value!;
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

    void IControlMutation.UpdateChildValue(object key, object? value)
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
                _value = (T)(object)new Dictionary<string, object>();
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
            // Cast value to T - this should be safe if the value is the correct type
            _value = (T)value!; // Direct assignment, no cloning needed for external values from ControlEditor
            _flags &= ~ControlFlags.ValueMutable; // External value, we don't own it yet

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
            // Cast initialValue to T - this should be safe if the value is the correct type
            _initialValue = (T)initialValue!; // Direct assignment, no cloning needed for external values
            _flags &= ~ControlFlags.InitialValueMutable; // External value, we don't own it yet

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
            // Call UpdateChildValue via IControlMutation interface
            if (parentLink.Control is IControlMutation parentMutation)
            {
                parentMutation.UpdateChildValue(parentLink.Key, Value);
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
    ValueMutable = 4,
    InitialValueMutable = 8,
    ErrorsMutable = 16,
    DontClearError = 32
}
