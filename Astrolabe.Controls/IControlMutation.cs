namespace Astrolabe.Controls;

internal interface IControlMutation
{
    bool SetValueInternal(object? value);
    void RunListeners();
}