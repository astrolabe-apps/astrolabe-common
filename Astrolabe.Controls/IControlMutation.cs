namespace Astrolabe.Controls;

internal interface IControlMutation
{
    bool SetValueInternal(ControlEditor editor, object? value);
    void RunListeners(ControlEditor editor);
    void RunValidationListeners(ControlEditor editor);
    bool SetInitialValueInternal(ControlEditor editor, object? initialValue);
    bool SetDisabledInternal(ControlEditor editor, bool disabled, bool childrenOnly = false);
    bool SetTouchedInternal(ControlEditor editor, bool touched, bool childrenOnly = false);

    // Error management
    bool SetErrorsInternal(ControlEditor editor, IDictionary<string, string> errors);
    bool SetErrorInternal(ControlEditor editor, string key, string? message); // null or empty message = remove

    void AddElementInternal(object? value);
    void RemoveElementInternal(int index);
    bool ClearErrorsInternal(ControlEditor editor);

    // Parent-child relationship management
    void UpdateParentLink(IControl parent, object? key, bool initial = false);
    void NotifyParentsOfChange(ControlEditor editor);

    // Child control updates
    void InvalidateChildValidityCache(ControlEditor editor, bool hasErrors);
    void UpdateChildValue(ControlEditor editor, object key);
}