namespace Astrolabe.Controls.Internal;

internal class LazyControlLogic : ControlLogic
{
    public bool IsEqual(object? v1, object? v2)
    {
        return Equals(v1, v2);
    }

    public T? VisitChildren<T>(Func<IControlImpl, T?> visitFn)
    {
        return default;
    }

    public IControl GetField(IControlImpl control, string propertyName)
    {
        var fields = new FieldsLogic(ControlFields.DictionaryFields);
        control.Logic = fields;
        return fields.GetField(control, propertyName);
    }

    public IReadOnlyList<IControl> GetElements(IControlImpl control)
    {
        throw new NotImplementedException();
    }

    public void ChildValueChange(IControlTransactions ctx, IControlImpl control, object prop, object? value)
    {
        throw new NotImplementedException();
    }

    public object? GetValue(IControlImpl control)
    {
        return control.ValueImpl;
    }

    public void SetValue(IControlTransactions ctx, IControlImpl control, object? value)
    {
        control.ValueImpl = value;
    }

    public void SetInitialValue(IControlTransactions ctx, IControlImpl control, object? value)
    {
        control.InitialValueImpl = value;
    }
}