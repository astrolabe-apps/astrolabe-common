namespace Astrolabe.Controls.Internal;

internal class FieldsLogic<T>(Func<T?, T?, string, IControl> initChild) : ControlLogic
{
    private Dictionary<string, IControl> _fields = new();
    public bool IsEqual(object? v1, object? v2)
    {
        throw new NotImplementedException();
    }

    public void WithChildren(Action<IControlImpl> action)
    {
        throw new NotImplementedException();
    }

    public IControl GetField(IControlImpl control, string propertyName)
    {
        throw new NotImplementedException();
    }

    public IReadOnlyList<IControl> GetElements(IControlImpl control)
    {
        throw new NotImplementedException();
    }

    public void InitialValueChanged(IControlTransactions ctx, IControlImpl control)
    {
        throw new NotImplementedException();
    }

    public void ValueChanged(IControlTransactions ctx, IControlImpl control)
    {
        throw new NotImplementedException();
    }

    public void ChildValueChange(IControlTransactions ctx, IControlImpl control, object prop, object? value)
    {
        throw new NotImplementedException();
    }

    public bool ChildrenValid()
    {
        throw new NotImplementedException();
    }

    public object? EnsureValue(IControlImpl control, object? value)
    {
        throw new NotImplementedException();
    }
}