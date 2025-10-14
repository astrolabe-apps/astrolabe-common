import { newControl, Control } from '@react-typed-forms/core';
import { EditableForm } from '../../src/types';
import { FormRenderer, ControlDefinition } from '@react-typed-forms/schemas';
import { EditorFormTree } from '../../src/EditorFormTree';

export type MockEditableForm = EditableForm;

export function createMockEditableForm(
  initialState: Partial<MockEditableForm> = {},
): Control<MockEditableForm> {
  const initialDefinitions = (initialState.formTree?.rootNode.definition as any)?.children ?? [];
  return newControl<MockEditableForm>({
    formTree: new EditorFormTree(initialDefinitions),
    config: initialState.config ?? {},
    formSchema: initialState.formSchema ?? [],
    renderer: initialState.renderer ?? ({} as FormRenderer),
    schemaName: initialState.schemaName ?? '',
    hideFields: initialState.hideFields ?? false,
    formId: initialState.formId ?? '',
    name: initialState.name ?? '',
    ...initialState,
  });
}