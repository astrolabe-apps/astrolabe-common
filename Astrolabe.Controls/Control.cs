namespace Astrolabe.Controls;

public class Control : IControl
{
    public int UniqueId { get; }
    public object? Value { get; set; }
    public object? InitialValue { get; set; }
    public string? Error { get; }
    public IReadOnlyDictionary<string, string> Errors { get; }
    public bool Valid { get; }
    public bool Dirty { get; }
    public bool Disabled { get; set; }
    public bool Touched { get; set; }

    public IControl this[string propertyName] => throw new NotImplementedException();

    public IReadOnlyList<IControl> Elements { get; }
    public bool IsNull { get; }
    public ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask)
    {
        throw new NotImplementedException();
    }

    public void Unsubscribe(ISubscription subscription)
    {
        throw new NotImplementedException();
    }

    public bool IsEqual(object? v1, object? v2)
    {
        throw new NotImplementedException();
    }

    public void SetError(string key, string? error)
    {
        throw new NotImplementedException();
    }

    public void SetErrors(Dictionary<string, string?>? errors)
    {
        throw new NotImplementedException();
    }

    public void SetValue(Func<object?, object?> updateFunc)
    {
        throw new NotImplementedException();
    }

    public void SetValueAndInitial(object? value, object? initialValue)
    {
        throw new NotImplementedException();
    }

    public void SetInitialValue(object? value)
    {
        throw new NotImplementedException();
    }

    public void SetTouched(bool touched, bool notChildren = false)
    {
        throw new NotImplementedException();
    }

    public void SetDisabled(bool disabled, bool notChildren = false)
    {
        throw new NotImplementedException();
    }

    public void MarkAsClean()
    {
        throw new NotImplementedException();
    }

    public void ClearErrors()
    {
        throw new NotImplementedException();
    }

    public IDictionary<string, object> Meta { get; }
    public bool Validate()
    {
        throw new NotImplementedException();
    }
}