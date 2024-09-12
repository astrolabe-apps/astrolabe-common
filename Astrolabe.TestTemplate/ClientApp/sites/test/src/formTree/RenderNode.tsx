import {
  ControlAdornment,
  ControlDefinition,
  defaultValueForField,
  FieldOption,
  isDataControlDefinition,
  isGroupControlsDefinition,
  rendererClass,
} from "@react-typed-forms/schemas";
import {
  Control,
  RenderArrayElements,
  useControl,
} from "@react-typed-forms/core";
import { FormNode, schemaDataForForm, SchemaDataNode } from "./index";
import React, { FC, ReactNode } from "react";

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
  adornments?: ControlAdornment[] | null;
  options?: FieldOption[] | null;
  style?: React.CSSProperties;
  layoutId?: string;
  id?: string;
}

interface ControlRenderProps {
  state: Control<FormNodeState>;
  formNode: FormNode;
  dataNode: SchemaDataNode;
  RenderForm: FC<ControlRenderProps>;
}

interface FormLayoutProps {
  state: Control<FormNodeState>;
  children: ReactNode;
}

export interface Renderer {
  render: (props: ControlRenderProps) => ReactNode;
  LayoutControl: FC<FormLayoutProps>;
}

export function RenderLayout({ state }: FormLayoutProps): ReactNode {
  const { layoutClass, hideTitle, title } = state.fields;
  return (
    <div className={rendererClass(layoutClass.value, "flex flex-col")}>
      {!hideTitle.value && <label>{title.value}</label>}
      {mainNode}
      <RenderArrayElements array={children}>
        {([f, d]) => <RenderNode formNode={f} dataNode={d} />}
      </RenderArrayElements>
    </div>
  );
}

export function RenderNode({
  dataNode,
  formNode,
}: {
  formNode: FormNode;
  dataNode: SchemaDataNode;
}) {
  const definition = formNode.definition;
  const { schema, control } = dataNode;
  const { field } = schema;
  const dataDefinition = isDataControlDefinition(definition)
    ? definition
    : undefined;
  const state = useControl<ControlState>({
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
    options: field.options,
  }).fields;
  const children = getChildren();
  control?.setValue((x) =>
    x == null ? defaultValueForField(field, null, true) : x,
  );
  const options = state.options.value;
  let mainNode: ReactNode = <></>;
  const clp = doRender({});
  mainNode = clp.children;

  return (
    <div className={rendererClass(state.layoutClass.value, "flex flex-col")}>
      {!state.hideTitle.value && <label>{state.title.value}</label>}
      {mainNode}
      <RenderArrayElements array={children}>
        {([f, d]) => <RenderNode formNode={f} dataNode={d} />}
      </RenderArrayElements>
    </div>
  );

  function getChildren(): [FormNode, SchemaDataNode][] {
    if (
      (isGroupControlsDefinition(definition) ||
        isDataControlDefinition(definition)) &&
      dataNode.elementIndex == null
    ) {
      if (isDataControlDefinition(definition) && field.collection) {
        return Array.from(
          { length: (control as Control<unknown[]>)?.elements?.length ?? 0 },
          (_, i) => [formNode, dataNode.getChildElement(i)],
        );
      }
      return formNode
        .getChildNodes()
        .map((x) => [x, schemaDataForForm(x, dataNode)]);
    }
    return [];
  }
}
