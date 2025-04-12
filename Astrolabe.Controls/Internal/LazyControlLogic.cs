namespace Astrolabe.Controls.Internal;

internal class LazyControlLogic : ControlLogic
{
    public bool IsEqual(object? v1, object? v2)
    {
        return Equals(v1, v2);
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