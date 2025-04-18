namespace Astrolabe.Controls.Internal;

internal class FieldsLogic(ControlFields fields) : ControlLogic
{
    private readonly Dictionary<string, IControl> _fields = new();
    private bool _valueSynced = true;

    public bool IsEqual(object? v1, object? v2)
    {
        return Equals(v1, v2);
    }

    public T? VisitChildren<T>(Func<IControlImpl, T?> action)
    {
        return _fields.Values.Select(v => action(v.GetControlImpl())).OfType<T>().FirstOrDefault();
    }

    public IControl GetField(IControlImpl control, string propertyName)
    {
        if (_fields.TryGetValue(propertyName, out var field))
        {
            return field;
        }
        var iv = fields.GetChildValue(control.InitialValueImpl, propertyName);
        var v = fields.GetChildValue(control.ValueImpl, propertyName);
        var newField = fields.InitChild(
            v,
            iv,
            propertyName,
            control.ValueImpl == null ? ControlFlags.Undefined : ControlFlags.None
        );
        newField.UpdateParentLink(control, propertyName);
        _fields[propertyName] = newField;
        return newField;
    }

    public IReadOnlyList<IControl> GetElements(IControlImpl control)
    {
        throw new NotImplementedException();
    }

    public void ChildValueChange(
        IControlTransactions ctx,
        IControlImpl control,
        object prop,
        object? value
    )
    {
        ctx.InTransaction(
            control,
            () =>
            {
                _valueSynced = false;
                var wasNull = control.ValueImpl == null;
                if (wasNull)
                {
                    control.ValueImpl = fields.NewValue(null, new Dictionary<string, IControl>());
                }
                control.DoValueChange(ctx, wasNull ? ControlChange.Structure : ControlChange.None);
            }
        );
    }

    public object? GetValue(IControlImpl control)
    {
        if (_valueSynced)
            return control.ValueImpl;
        return control.ValueImpl = fields.NewValue(control.ValueImpl, _fields);
    }

    public void SetValue(IControlTransactions ctx, IControlImpl control, object? value)
    {
        _valueSynced = true;
        control.ValueImpl = value;
        foreach (var child in _fields)
        {
            child
                .Value.GetControlImpl()
                .SetValueImpl(ctx, fields.GetChildValue(value, child.Key), control);
        }
    }

    public void SetInitialValue(IControlTransactions ctx, IControlImpl control, object? value)
    {
        control.InitialValueImpl = value;
        foreach (var child in _fields)
        {
            child
                .Value.GetControlImpl()
                .SetInitialValueImpl(ctx, fields.GetChildValue(value, child.Key));
        }
    }
}

internal record ControlFields(
    Func<object?, string, object?> GetChildValue,
    Func<object?, object?, string, ControlFlags, IControlImpl> InitChild,
    Func<object?, Dictionary<string, IControl>, object?> NewValue
)
{
    public static ControlFields DictionaryFields =
        new(
            (v, k) =>
                v switch
                {
                    IDictionary<string, object?> d
                        => d.TryGetValue(k, out var childValue) ? childValue : null,
                    _ => null,
                },
            (v, iv, k, flags) => new ControlImpl(v, iv, flags, new LazyControlLogic()),
            (v, children) =>
            {
                var newDict = v switch
                {
                    IDictionary<string, object?> d => new Dictionary<string, object?>(d),
                    _ => new Dictionary<string, object?>(),
                };
                foreach (var child in children)
                {
                    var childValue = child.Value.Value;
                    newDict[child.Key] = childValue;
                }
                return newDict;
            }
        );
};
