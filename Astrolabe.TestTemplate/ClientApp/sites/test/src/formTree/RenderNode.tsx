import {
  DisplayData,
  DisplayDataType,
  elementValueForField,
  FieldOption,
  HtmlDisplay,
  IconDisplay,
  isActionControlsDefinition,
  isDataControlDefinition,
  isDisplayControlsDefinition,
  isGroupControlsDefinition,
  TextDisplay,
} from "@react-typed-forms/schemas";
import {
  addElement,
  Control,
  removeElement,
  useControl,
} from "@react-typed-forms/core";
import { FormNode, SchemaDataNode } from "./index";
import React from "react";
import { ActionRendererProps, FormOptions } from "./render";

export interface FormNodeState {
  title: string;
  hideTitle: boolean;
  visible: boolean;
  showing: boolean;
  readonly: boolean;
  disabled: boolean;
  required: boolean;
  styleClass?: string | null;
  layoutClass?: string | null;
  labelClass?: string | null;
  options?: FieldOption[] | null;
  display?: string;
  style?: React.CSSProperties;
  layoutId?: string;
  id?: string;
  actionId: string;
  actionData?: string | null;
  addAction?: ActionRendererProps;
  removeAction?: (elemIndex: number) => ActionRendererProps;
}

function displayData(display: DisplayData) {
  switch (display.type) {
    case DisplayDataType.Text:
      return (display as TextDisplay).text;
    case DisplayDataType.Html:
      return (display as HtmlDisplay).html;
    case DisplayDataType.Icon:
      return (display as IconDisplay).iconClass;
    default:
      return undefined;
  }
}

export function RenderNode({
  dataNode,
  formNode,
  formOptions,
}: {
  formNode: FormNode;
  dataNode: SchemaDataNode;
  formOptions: FormOptions;
}) {
  const definition = formNode.definition;
  const { schema, control } = dataNode;
  const { field } = schema;
  const dataDefinition = isDataControlDefinition(definition)
    ? definition
    : undefined;
  const { renderer } = formOptions;

  const { add: defaultAdd, remove: defaultRemove } = renderer.defaultActions;
  const noun = field.displayName ?? field.field;

  const state = useControl<FormNodeState>({
    hideTitle: !!(
      dataDefinition?.hideTitle ||
      (isGroupControlsDefinition(definition) &&
        definition.groupOptions?.hideTitle)
    ),
    title: definition.title ?? field.displayName ?? "",
    visible: true,
    showing: true,
    readonly: !!dataDefinition?.readonly,
    disabled: !!dataDefinition?.disabled,
    required: !!dataDefinition?.required,
    styleClass: definition.styleClass,
    layoutClass: definition.layoutClass,
    labelClass: definition.labelClass,
    display: isDisplayControlsDefinition(definition)
      ? displayData(definition.displayData)
      : undefined,
    options: field.options,
    actionId: isActionControlsDefinition(definition) ? definition.actionId : "",
    actionData: isActionControlsDefinition(definition)
      ? definition.actionData
      : undefined,
    addAction: {
      ...defaultAdd,
      actionText: defaultAdd.actionText ? defaultAdd.actionText : "Add " + noun,
      perform: () => {
        control &&
          addElement(control as Control<any[]>, elementValueForField(field));
      },
    },
    removeAction: (i) => ({
      ...defaultRemove,
      actionText: defaultRemove.actionText
        ? defaultRemove.actionText
        : "Remove",
      perform: () => {
        control && removeElement(control as Control<any[]>, i);
      },
    }),
  });

  return renderer.render({
    formNode,
    dataNode,
    formOptions,
    state,
  });
}
