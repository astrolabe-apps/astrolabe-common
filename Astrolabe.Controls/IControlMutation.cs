namespace Astrolabe.Controls;

internal interface IControlMutation
{
    bool SetValueInternal(ControlEditor? editor, object? value);
    void RunListeners();
    bool SetInitialValueInternal(ControlEditor? editor, object? initialValue);
    bool SetDisabledInternal(ControlEditor? editor, bool disabled, bool childrenOnly = false);
    bool SetTouchedInternal(ControlEditor? editor, bool touched, bool childrenOnly = false);

    // Parent-child relationship management
    void UpdateParentLink(IControl parent, object? key, bool initial = false);
    void NotifyParentsOfChange();
}