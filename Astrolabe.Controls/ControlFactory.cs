using Astrolabe.Controls.Internal;

namespace Astrolabe.Controls;

public static class ControlFactory
{
    public static IControl Create(object? initialValue)
    {
        return new ControlImpl(initialValue, initialValue, ControlFlags.None, new LazyControlLogic());
    }
}