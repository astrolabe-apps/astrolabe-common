namespace Astrolabe.Controls;

internal interface IControlMutation
{
    bool SetValueInternal(ControlEditor editor, object? value);
    void RunListeners();
    bool SetInitialValueInternal(ControlEditor editor, object? initialValue);
    bool SetDisabledInternal(ControlEditor editor, bool disabled);
}