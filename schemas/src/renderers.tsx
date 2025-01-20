import { ReactElement, ReactNode } from "react";
import {
  ActionRendererProps,
  AdornmentProps,
  AdornmentRenderer,
  ArrayRendererProps,
  ControlLayoutProps,
  DataRendererProps,
  DisplayRendererProps,
  FormRenderer,
  GroupRendererProps,
  LabelRendererProps,
  LabelType,
  RenderedControl,
  VisibilityRendererProps,
} from "./controlRender";
import {
  AccordionAdornment,
  ControlAdornment,
  ControlAdornmentType,
  IconAdornment, OptionalAdornment,
  SetFieldAdornment,
} from "./controlDefinition";

export interface DefaultRenderers {
  data: DataRendererRegistration;
  label: LabelRendererRegistration;
  action: ActionRendererRegistration;
  array: ArrayRendererRegistration;
  group: GroupRendererRegistration;
  display: DisplayRendererRegistration;
  adornment: AdornmentRendererRegistration;
  renderLayout: LayoutRendererRegistration;
  visibility: VisibilityRendererRegistration;
}

export interface LayoutRendererRegistration {
  type: "layout";
  match?: (props: ControlLayoutProps) => boolean;
  render: (
    props: ControlLayoutProps,
    renderers: FormRenderer,
  ) => RenderedControl;
}
export interface DataRendererRegistration {
  type: "data";
  schemaType?: string | string[];
  renderType?: string | string[];
  options?: boolean;
  collection?: boolean;
  match?: (props: DataRendererProps) => boolean;
  render: (
    props: DataRendererProps,
    renderers: FormRenderer,
  ) => ReactNode | ((layout: ControlLayoutProps) => ControlLayoutProps);
}

export interface LabelRendererRegistration {
  type: "label";
  labelType?: LabelType | LabelType[];
  render: (
    labelProps: LabelRendererProps,
    labelStart: ReactNode,
    labelEnd: ReactNode,
    renderers: FormRenderer,
  ) => ReactNode;
}

export interface ActionRendererRegistration {
  type: "action";
  actionType?: string | string[];
  render: (props: ActionRendererProps, renderers: FormRenderer) => ReactElement;
}

export interface ArrayRendererRegistration {
  type: "array";
  render: (props: ArrayRendererProps, renderers: FormRenderer) => ReactElement;
}

export interface GroupRendererRegistration {
  type: "group";
  renderType?: string | string[];
  render: (
    props: GroupRendererProps,
    renderers: FormRenderer,
  ) => ReactElement | ((layout: ControlLayoutProps) => ControlLayoutProps);
}

export interface DisplayRendererRegistration {
  type: "display";
  renderType?: string | string[];
  render: (
    props: DisplayRendererProps,
    renderers: FormRenderer,
  ) => ReactElement;
}

export interface AdornmentRendererRegistration {
  type: "adornment";
  adornmentType?: string | string[];
  render: (props: AdornmentProps, renderers: FormRenderer) => AdornmentRenderer;
}

export interface VisibilityRendererRegistration {
  type: "visibility";
  render: (props: VisibilityRendererProps) => ReactNode;
}

export type RendererRegistration =
  | DataRendererRegistration
  | GroupRendererRegistration
  | DisplayRendererRegistration
  | ActionRendererRegistration
  | LabelRendererRegistration
  | ArrayRendererRegistration
  | AdornmentRendererRegistration
  | LayoutRendererRegistration
  | VisibilityRendererRegistration;

export function isIconAdornment(a: ControlAdornment): a is IconAdornment {
  return a.type === ControlAdornmentType.Icon;
}

export function isAccordionAdornment(
  a: ControlAdornment,
): a is AccordionAdornment {
  return a.type === ControlAdornmentType.Accordion;
}

export function isSetFieldAdornment(
  a: ControlAdornment,
): a is SetFieldAdornment {
  return a.type === ControlAdornmentType.SetField;
}

export function isOptionalAdornment(
    a: ControlAdornment,
): a is OptionalAdornment {
  return a.type === ControlAdornmentType.Optional;
}

export function createLayoutRenderer(
  render: LayoutRendererRegistration["render"],
  options?: Partial<LayoutRendererRegistration>,
): LayoutRendererRegistration {
  return { type: "layout", render, ...options };
}

export function createActionRenderer(
  actionId: string | string[] | undefined,
  render: ActionRendererRegistration["render"],
  options?: Partial<ActionRendererRegistration>,
): ActionRendererRegistration {
  return { type: "action", actionType: actionId, render, ...options };
}

export function createArrayRenderer(
  render: ArrayRendererRegistration["render"],
  options?: Partial<ArrayRendererRegistration>,
): ArrayRendererRegistration {
  return { type: "array", render, ...options };
}

export function createDataRenderer(
  render: DataRendererRegistration["render"],
  options?: Partial<DataRendererRegistration>,
): DataRendererRegistration {
  return { type: "data", render, ...options };
}

export function createGroupRenderer(
  render: GroupRendererRegistration["render"],
  options?: Partial<GroupRendererRegistration>,
): GroupRendererRegistration {
  return { type: "group", render, ...options };
}

export function createDisplayRenderer(
  render: DisplayRendererRegistration["render"],
  options?: Partial<DisplayRendererRegistration>,
): DisplayRendererRegistration {
  return { type: "display", render, ...options };
}

export function createLabelRenderer(
  render: LabelRendererRegistration["render"],
  options?: Partial<LabelRendererRegistration>,
): LabelRendererRegistration {
  return { type: "label", render, ...options };
}

export function createVisibilityRenderer(
  render: VisibilityRendererRegistration["render"],
  options?: Partial<VisibilityRendererRegistration>,
): VisibilityRendererRegistration {
  return { type: "visibility", render, ...options };
}

export function createAdornmentRenderer(
  render: AdornmentRendererRegistration["render"],
  options?: Partial<AdornmentRendererRegistration>,
): AdornmentRendererRegistration {
  return { type: "adornment", ...options, render };
}
