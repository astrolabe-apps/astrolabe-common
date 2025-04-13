using Astrolabe.Controls.Internal;

namespace Astrolabe.Controls;

public static class ControlContextExtensions
{
    internal static IControlImpl GetControlImpl(this IControl control)
    {
        return (IControlImpl)control;
    }

    internal static void WithChildren(this ControlLogic logic, Action<IControlImpl> action)
    {
        logic.VisitChildren(c =>
        {
            action(c);
            return (bool?) null;
        });
    }
    
    public static object? GetValue(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.Value);
        return control.Value;
    }

    public static object? GetInitialValue(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.InitialValue);
        return control.InitialValue;
    }

    public static string? GetError(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.Error);
        return control.Error;
    }

    public static IReadOnlyDictionary<string, string> GetErrors(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.Error);
        return control.Errors;
    }


    public static bool IsValid(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.Valid);
        return control.Valid;
    }

    public static bool IsDirty(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.Dirty);
        return control.Dirty;
    }

    public static bool IsDisabled(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.Disabled);
        return control.Disabled;
    }

    public static bool IsTouched(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.Touched);
        return control.Touched;
    }

    public static IReadOnlyList<IControl> GetElements(this ControlContext ctx, IControl control)
    {
        throw new NotImplementedException();
    }

    public static bool IsNull(this ControlContext ctx, IControl control)
    {
        ctx.Tracker?.Invoke(control, ControlChange.Structure);
        return control.Value == null;
    }

    public static void SetValue(this IControlTransactions ctx, IControl control, object? value)
    {
        ((IControlImpl)control).SetValueImpl(ctx, value, null);
    }

    public static void SetValueAndInitial(this IControlTransactions ctx, IControl control, object? value,
        object? initialValue)
    {
        ctx.InTransaction(() =>
        {
            ctx.SetValue(control, value);
            ctx.SetInitialValue(control, initialValue);
        });
    }

    public static void SetInitialValue(this IControlTransactions ctx, IControl control, object? value)
    {
        ((IControlImpl)control).SetInitialValueImpl(ctx, value);
    }

    public static void MarkAsClean<T>(this IControlTransactions ctx, IControl control)
    {
        ctx.SetInitialValue(control, control.Value);
    }
    
    public static void SetTouched(this IControlTransactions ctx, IControl control, bool touched, bool notChildren = false)
    {
        ctx.Transaction(control, c =>
        {
            if (touched)
                c.Flags |= ControlFlags.Touched;
            else
                c.Flags &= ~ControlFlags.Touched;
            if (!notChildren)
                c.WithChildren(child => ctx.SetTouched(child, touched));
        });
    }

    private static void Transaction(this IControlTransactions ctx, IControl control, Action<IControlImpl> action)
    {
        ctx.InTransaction(control, () =>
        {
            action((IControlImpl)control);
            return true;
        });
    }
    
    public static void SetDisabled(this IControlTransactions ctx, IControl control, bool disabled, bool notChildren = false)
    {
        ctx.Transaction(control, c=> {
            if (disabled)
                c.Flags |= ControlFlags.Disabled;
            else
                c.Flags &= ~ControlFlags.Disabled;
                
            if (!notChildren)
                c.WithChildren(child => ctx.SetDisabled(child, disabled));
        });
    }

    
    public static void SetError(this IControlTransactions ctx, IControl control, string key, string? error)
    {
        ctx.Transaction(control, (c) =>
        {
            var errors = c.ErrorMap;
            bool hadErrors = errors != null;

            if (string.IsNullOrEmpty(error))
                error = null;

            if (errors != null && errors.TryGetValue(key, out var currentError) && currentError == error)
                return;

            if (error != null)
            {
                if (errors == null)
                    errors = new Dictionary<string, string> { [key] = error };
                else
                    errors[key] = error;
            }
            else if (errors != null)
            {
                if (errors.Count == 1 && errors.ContainsKey(key))
                    errors = null;
                else
                    errors.Remove(key);
            }

            c.ErrorMap = errors;

            bool hasErrors = errors != null;
            if (hadErrors != hasErrors)
                c.ValidityChanged(ctx, hasErrors);

            c.Subscriptions?.ApplyChange(ControlChange.Error);
        });
    }

    public static void SetErrors(this IControlTransactions ctx, IControl control, Dictionary<string, string?>? errors)
    {
        if (control.Errors.Count == 0 && errors == null)
            return;

        ctx.Transaction(control, (c) =>
        {
            var realErrors = errors?
                .Where(x => !string.IsNullOrEmpty(x.Value))
                .ToDictionary(x => x.Key, x => x.Value!);

            Dictionary<string, string>? exactErrors =
                realErrors is { Count: > 0 } ? realErrors : null;

            if (!DictionaryEquals(exactErrors, c.ErrorMap))
            {
                c.ErrorMap = exactErrors;
                c.ValidityChanged(ctx, exactErrors != null);
                c.Subscriptions?.ApplyChange(ControlChange.Error);
            }
        });
    }

    public static void ClearErrors(this IControlTransactions ctx, IControl control)
    {
        ctx.Transaction(control, (c) =>
        {
            c.WithChildren(ctx.ClearErrors);
            ctx.SetErrors(c, null);
        });
    }
    
    
    // Helper method to compare dictionaries
    private static bool DictionaryEquals<TKey, TValue>(
        Dictionary<TKey, TValue>? dict1,
        Dictionary<TKey, TValue>? dict2) where TKey : notnull
    {
        if (dict1 == dict2)
            return true;
            
        if (dict1 == null || dict2 == null)
            return false;
            
        if (dict1.Count != dict2.Count)
            return false;
            
        return dict1.All(kvp => 
            dict2.TryGetValue(kvp.Key, out var value) && 
            EqualityComparer<TValue>.Default.Equals(kvp.Value, value));
    }


}