import React, {
  ComponentType,
  ElementType,
  Fragment,
  HTMLAttributes,
  Key,
  ReactElement,
  ReactNode,
} from "react";
import {
  addElement,
  Control,
  removeElement,
  RenderArrayElements,
} from "@react-typed-forms/core";
import {
  ActionStyle,
  AdornmentPlacement,
  ArrayActionOptions,
  ControlAdornment,
  ControlDefinition,
  ControlState,
  CustomDisplay,
  DataControlDefinition,
  defaultSchemaInterface,
  DisplayData,
  DisplayDataType,
  FieldOption,
  FormContextData,
  FormContextOptions,
  FormNode,
  FormState,
  GroupRenderOptions,
  isActionControl,
  isDataControl,
  isDisplayControl,
  isGroupControl,
  JsonPath,
  LengthValidator,
  lookupDataNode,
  RenderOptions,
  SchemaDataNode,
  SchemaField,
  SchemaInterface,
  ValidatorType,
} from "@astroapps/forms-core";
import {
  applyLengthRestrictions,
  ControlClasses,
  elementValueForField,
  ExternalEditAction,
  fieldDisplayName,
  getExternalEditData,
  rendererClass,
} from "./util";
import { createAction, dataControl } from "./controlBuilder";
import {
  ActionRendererProps,
  ControlActionHandler,
  ControlDataContext,
  RunExpression,
} from "./types";

export interface HtmlIconProperties {
  className?: string;
  style?: React.CSSProperties;
  iconLibrary?: string;
  iconName?: string;
}

export interface HtmlLabelProperties {
  htmlFor?: string;
  className?: string;
  textClass?: string;
  children?: ReactNode;
}

export interface HtmlDivProperties {
  id?: string;
  className?: string;
  textClass?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  text?: string;
  html?: string;
  nativeRef?: (e: HTMLElement | null) => void;
  inline?: boolean;
}

export interface HtmlInputProperties {
  id?: string;
  className?: string;
  textClass?: string;
  name?: string;
  type?: string;
  checked?: boolean;
  style?: React.CSSProperties;
  readOnly?: boolean;
  placeholder?: string;
  value?: string | number;
  onBlur?: () => void;
  disabled?: boolean;
  inputRef?: (e: HTMLElement | null) => void;
  onChangeValue?: (value: string) => void;
  onChangeChecked?: (checked: boolean) => void;
}

export interface HtmlButtonProperties {
  className?: string;
  textClass?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  inline?: boolean;
  children?: ReactNode;
  title?: string;
}
export interface HtmlComponents {
  Div: ComponentType<HtmlDivProperties>;
  Span: ElementType<HTMLAttributes<HTMLSpanElement>>;
  Button: ComponentType<HtmlButtonProperties>;
  I: ComponentType<HtmlIconProperties>;
  Label: ComponentType<HtmlLabelProperties>;
  B: ElementType<HTMLAttributes<HTMLElement>>;
  H1: ElementType<HTMLAttributes<HTMLElement>>;
  Input: ComponentType<HtmlInputProperties>;
}
/**
 * Interface for rendering different types of form controls.
 */
export interface FormRenderer {
  /**
   * Renders data control.
   * @param props - Properties for data renderer.
   * @returns A function that takes layout properties and returns layout properties.
   */
  renderData: (
    props: DataRendererProps,
  ) => (layout: ControlLayoutProps) => ControlLayoutProps;

  /**
   * Renders group control.
   * @param props - Properties for group renderer.
   * @returns A function that takes layout properties and returns layout properties.
   */
  renderGroup: (
    props: GroupRendererProps,
  ) => (layout: ControlLayoutProps) => ControlLayoutProps;

  /**
   * Renders display control.
   * @param props - Properties for display renderer.
   * @returns A React node.
   */
  renderDisplay: (props: DisplayRendererProps) => ReactNode;

  /**
   * Renders action control.
   * @param props - Properties for action renderer.
   * @returns A React node.
   */
  renderAction: (props: ActionRendererProps) => ReactNode;

  /**
   * Renders array control.
   * @param props - Properties for array renderer.
   * @returns A React node.
   */
  renderArray: (props: ArrayRendererProps) => ReactNode;

  /**
   * Renders adornment.
   * @param props - Properties for adornment renderer.
   * @returns An adornment renderer.
   */
  renderAdornment: (props: AdornmentProps) => AdornmentRenderer;

  /**
   * Renders label.
   * @param props - Properties for label renderer.
   * @param labelStart - React node to render at the start of the label.
   * @param labelEnd - React node to render at the end of the label.
   * @returns A React node.
   */
  renderLabel: (
    props: LabelRendererProps,
    labelStart?: ReactNode,
    labelEnd?: ReactNode,
  ) => ReactNode;

  /**
   * Renders layout.
   * @param props - Properties for control layout.
   * @returns A rendered control.
   */
  renderLayout: (props: ControlLayoutProps) => RenderedControl;

  /**
   * Renders visibility control.
   * @param props - Properties for visibility renderer.
   * @returns A React node.
   */
  renderVisibility: (props: VisibilityRendererProps) => ReactNode;

  /**
   * Renders label text.
   * @param props - React node for label text.
   * @returns A React node.
   */
  renderLabelText: (props: ReactNode) => ReactNode;

  html: HtmlComponents;
}

export interface AdornmentProps {
  adornment: ControlAdornment;
  dataContext: ControlDataContext;
  runExpression?: RunExpression;
  designMode?: boolean;
  formOptions: FormContextOptions;
}

export const AppendAdornmentPriority = 0;
export const WrapAdornmentPriority = 1000;

export interface AdornmentRenderer {
  apply(children: RenderedLayout): void;
  adornment?: ControlAdornment;
  priority: number;
}

export interface ArrayRendererProps {
  addAction?: ActionRendererProps;
  required: boolean;
  removeAction?: (elemIndex: number) => ActionRendererProps;
  editAction?: (elemIndex: number) => ActionRendererProps;
  renderElement: (
    elemIndex: number,
    wrapEntry: (children: ReactNode) => ReactNode,
  ) => ReactNode;
  arrayControl: Control<any[] | undefined | null>;
  className?: string;
  style?: React.CSSProperties;
  min?: number | null;
  max?: number | null;
  disabled?: boolean;
}
export interface Visibility {
  visible: boolean;
  showing: boolean;
}

export interface RenderedLayout {
  labelStart?: ReactNode;
  labelEnd?: ReactNode;
  controlStart?: ReactNode;
  controlEnd?: ReactNode;
  label?: ReactNode;
  children?: ReactNode;
  errorControl?: Control<any>;
  className?: string;
  style?: React.CSSProperties;
  wrapLayout: (layout: ReactElement) => ReactElement;
  inline?: boolean;
}

export interface RenderedControl {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  divRef?: (cb: HTMLElement | null) => void;
  inline?: boolean;
}

export interface VisibilityRendererProps extends RenderedControl {
  visibility: Control<Visibility | undefined>;
}

export interface ControlLayoutProps {
  label?: LabelRendererProps;
  errorControl?: Control<any>;
  adornments?: AdornmentRenderer[];
  children?: ReactNode;
  processLayout?: (props: ControlLayoutProps) => ControlLayoutProps;
  className?: string | null;
  style?: React.CSSProperties;
  inline?: boolean;
}

/**
 * Enum representing the types of labels that can be rendered.
 */
export enum LabelType {
  /**
   * Label for a control.
   */
  Control,

  /**
   * Label for a group.
   */
  Group,

  /**
   * Label for text.
   */
  Text,
}

/**
 * Properties for label renderers.
 */
export interface LabelRendererProps {
  /**
   * The type of the label.
   */
  type: LabelType;

  /**
   * Whether to hide the label.
   */
  hide?: boolean | null;

  /**
   * The content of the label.
   */
  label: ReactNode;

  /**
   * Whether to show the label as being required.
   * E.g. show an asterisk next to the label.
   */
  required?: boolean | null;

  /**
   * The ID of the element the label is for.
   */
  forId?: string;

  /**
   * The CSS class name for the label.
   */
  className?: string;

  /**
   * The CSS class name for the label text.
   */
  textClass?: string;
}

/**
 * Properties for display renderers.
 */
export interface DisplayRendererProps {
  /**
   * The data to be displayed.
   */
  data: DisplayData;

  /**
   * A control with dynamic value for display.
   */
  display?: Control<string | undefined>;

  /**
   * The context for the control data.
   */
  dataContext: ControlDataContext;

  /**
   * The CSS class name for the display renderer.
   */
  className?: string;

  textClass?: string;

  /**
   * The CSS styles for the display renderer.
   */
  style?: React.CSSProperties;
  inline?: boolean;
}

export interface ParentRendererProps {
  formNode: FormNode;
  state: ControlState;
  renderChild: ChildRenderer;
  className?: string;
  textClass?: string;
  style?: React.CSSProperties;
  dataContext: ControlDataContext;
  getChildState(node: FormNode, parent?: SchemaDataNode): ControlState;
  runExpression: RunExpression;
  designMode?: boolean;
  actionOnClick?: ControlActionHandler;
}

export interface GroupRendererProps extends ParentRendererProps {
  definition: ControlDefinition;
  renderOptions: GroupRenderOptions;
}

export interface DataRendererProps extends ParentRendererProps {
  renderOptions: RenderOptions;
  definition: DataControlDefinition;
  field: SchemaField;
  id: string;
  control: Control<any>;
  readonly: boolean;
  required: boolean;
  options: FieldOption[] | undefined | null;
  hidden: boolean;
  dataNode: SchemaDataNode;
  displayOnly: boolean;
  inline: boolean;
}

export interface ControlRenderProps {
  control: Control<any>;
  parentPath?: JsonPath[];
}

export type CreateDataProps = (
  controlProps: RenderLayoutProps,
  definition: DataControlDefinition,
  control: Control<any>,
) => DataRendererProps;

export interface ControlRenderOptions extends ControlClasses {
  formState?: FormState;
  useDataHook?: (c: ControlDefinition) => CreateDataProps;
  actionOnClick?: ControlActionHandler;
  customDisplay?: (
    customId: string,
    displayProps: DisplayRendererProps,
  ) => ReactNode;
  runExpression?: RunExpression;
  adjustLayout?: (
    context: ControlDataContext,
    layout: ControlLayoutProps,
  ) => ControlLayoutProps;
  readonly?: boolean | null;
  hidden?: boolean | null;
  disabled?: boolean | null;
  displayOnly?: boolean;
  inline?: boolean;
  clearHidden?: boolean;
  schemaInterface?: SchemaInterface;
  formData?: FormContextData;
}

export function defaultDataProps(
  {
    formOptions,
    style,
    allowedOptions,
    schemaInterface = defaultSchemaInterface,
    styleClass,
    textClass: tc,
    ...props
  }: RenderLayoutProps,
  definition: DataControlDefinition,
  control: Control<any>,
): DataRendererProps {
  const dataNode = props.dataContext.dataNode!;
  const field = dataNode.schema.field;
  const className = rendererClass(styleClass, definition.styleClass);
  const textClass = rendererClass(tc, definition.textClass);
  const displayOnly = !!formOptions.displayOnly;
  const required = !!definition.required && !displayOnly;
  const fieldOptions = schemaInterface.getDataOptions(dataNode);
  const _allowed = allowedOptions ?? [];
  const allowed = Array.isArray(_allowed) ? _allowed : [_allowed];
  return {
    dataNode,
    definition,
    control,
    field,
    id: "c" + control.uniqueId,
    inline: !!formOptions.inline,
    options:
      allowed.length > 0
        ? allowed
            .map((x) =>
              typeof x === "object"
                ? x
                : (fieldOptions?.find((y) => y.value == x) ?? {
                    name: x.toString(),
                    value: x,
                  }),
            )
            .filter((x) => x != null)
        : fieldOptions,
    readonly: !!formOptions.readonly,
    displayOnly,
    renderOptions: definition.renderOptions ?? { type: "Standard" },
    required,
    hidden: !!formOptions.hidden,
    className,
    textClass,
    style,
    ...props,
  };
}

export interface ChildRendererOptions {
  parentDataNode?: SchemaDataNode;
  formData?: FormContextData;
  inline?: boolean;
  displayOnly?: boolean;
  styleClass?: string;
  layoutClass?: string;
  labelClass?: string;
  actionOnClick?: ControlActionHandler;
}

export type ChildRenderer = (
  k: Key,
  child: FormNode,
  options?: ChildRendererOptions,
) => ReactNode;

export interface RenderLayoutProps {
  formNode: FormNode;
  renderer: FormRenderer;
  state: ControlState;
  renderChild: ChildRenderer;
  createDataProps: CreateDataProps;
  formOptions: FormContextOptions;
  dataContext: ControlDataContext;
  control?: Control<any>;
  style?: React.CSSProperties;
  allowedOptions?: any[];
  getChildState(node: FormNode, parent?: SchemaDataNode): ControlState;
  runExpression: RunExpression;

  actionOnClick?: ControlActionHandler;
  schemaInterface?: SchemaInterface;
  designMode?: boolean;
  customDisplay?: (
    customId: string,
    displayProps: DisplayRendererProps,
  ) => ReactNode;
  labelClass?: string;
  labelTextClass?: string;
  styleClass?: string;
  textClass?: string;
}
export function renderControlLayout(
  props: RenderLayoutProps,
): ControlLayoutProps {
  const {
    renderer,
    renderChild,
    control,
    dataContext,
    createDataProps: dataProps,
    style,
    designMode,
    customDisplay,
    runExpression,
    labelClass,
    labelTextClass,
    styleClass,
    textClass,
    formNode,
    formOptions,
    actionOnClick,
    state,
    getChildState,
  } = props;
  const c = state.definition;
  if (isDataControl(c)) {
    return renderData(c);
  }
  if (isGroupControl(c)) {
    if (c.compoundField) {
      return renderData(
        dataControl(c.compoundField, c.title, {
          children: c.children,
          hideTitle: c.groupOptions?.hideTitle,
        }),
      );
    }

    return {
      inline: formOptions.inline,
      processLayout: renderer.renderGroup({
        formNode,
        state,
        definition: c,
        renderChild,
        runExpression,
        dataContext,
        renderOptions: c.groupOptions ?? { type: "Standard" },
        className: rendererClass(styleClass, c.styleClass),
        textClass: rendererClass(textClass, c.textClass),
        style,
        designMode,
        actionOnClick,
        getChildState,
      }),
      label: {
        label: c.title,
        className: rendererClass(labelClass, c.labelClass),
        textClass: rendererClass(labelTextClass, c.labelTextClass),
        type: LabelType.Group,
        hide: c.groupOptions?.hideTitle,
      },
    };
  }
  if (isActionControl(c)) {
    const actionData = c.actionData;
    return {
      inline: formOptions.inline,
      children: renderer.renderAction({
        actionText: c.title ?? c.actionId,
        actionId: c.actionId,
        actionData,
        actionStyle: c.actionStyle ?? ActionStyle.Button,
        textClass: rendererClass(textClass, c.textClass),
        icon: c.icon,
        inline: formOptions.inline,
        onClick:
          props.actionOnClick?.(c.actionId, actionData, dataContext) ??
          (() => {}),
        className: rendererClass(styleClass, c.styleClass),
        style,
      }),
    };
  }
  if (isDisplayControl(c)) {
    const data = c.displayData ?? {};
    const displayProps = {
      data,
      className: rendererClass(styleClass, c.styleClass),
      textClass: rendererClass(textClass, c.textClass),
      style,
      dataContext,
      inline: formOptions.inline,
    };
    if (data.type === DisplayDataType.Custom && customDisplay) {
      return {
        inline: formOptions.inline,
        children: customDisplay((data as CustomDisplay).customId, displayProps),
      };
    }
    return {
      inline: formOptions.inline,
      children: renderer.renderDisplay(displayProps),
    };
  }
  return {};

  function renderData(c: DataControlDefinition): ControlLayoutProps {
    if (!control) return { children: "No control for: " + c.field };
    const rendererProps = dataProps(props, c, control);
    const label = !c.hideTitle
      ? controlTitle(c.title, props.dataContext.dataNode!.schema.field)
      : undefined;
    return {
      inline: formOptions.inline,
      processLayout: renderer.renderData(rendererProps),
      label: {
        type:
          (c.children?.length ?? 0) > 0 ? LabelType.Group : LabelType.Control,
        label,
        forId: rendererProps.id,
        required: c.required && !props.formOptions.displayOnly,
        hide: c.hideTitle,
        className: rendererClass(labelClass, c.labelClass),
        textClass: rendererClass(labelTextClass, c.labelTextClass),
      },
      errorControl: control,
    };
  }
}

type MarkupKeys = keyof Omit<
  RenderedLayout,
  | "errorControl"
  | "style"
  | "className"
  | "wrapLayout"
  | "readonly"
  | "disabled"
  | "inline"
>;
export function appendMarkup(
  k: MarkupKeys,
  markup: ReactNode,
): (layout: RenderedLayout) => void {
  return (layout) =>
    (layout[k] = (
      <>
        {layout[k]}
        {markup}
      </>
    ));
}

export function wrapMarkup(
  k: MarkupKeys,
  wrap: (ex: ReactNode) => ReactNode,
): (layout: RenderedLayout) => void {
  return (layout) => (layout[k] = wrap(layout[k]));
}

export function layoutKeyForPlacement(pos: AdornmentPlacement): MarkupKeys {
  switch (pos) {
    case AdornmentPlacement.ControlEnd:
      return "controlEnd";
    case AdornmentPlacement.ControlStart:
      return "controlStart";
    case AdornmentPlacement.LabelStart:
      return "labelStart";
    case AdornmentPlacement.LabelEnd:
      return "labelEnd";
  }
}

export function wrapLayout(
  wrap: (layout: ReactElement) => ReactElement,
): (renderedLayout: RenderedLayout) => void {
  return (rl) => {
    const orig = rl.wrapLayout;
    rl.wrapLayout = (x) => wrap(orig(x));
  };
}

export function appendMarkupAt(
  pos: AdornmentPlacement,
  markup: ReactNode,
): (layout: RenderedLayout) => void {
  return appendMarkup(layoutKeyForPlacement(pos), markup);
}

export function wrapMarkupAt(
  pos: AdornmentPlacement,
  wrap: (ex: ReactNode) => ReactNode,
): (layout: RenderedLayout) => void {
  return wrapMarkup(layoutKeyForPlacement(pos), wrap);
}

export function renderLayoutParts(
  props: ControlLayoutProps,
  renderer: FormRenderer,
): RenderedLayout {
  const {
    className,
    children,
    style,
    errorControl,
    label,
    adornments,
    inline,
  } = props.processLayout?.(props) ?? props;
  const layout: RenderedLayout = {
    children,
    errorControl,
    style,
    className: className!,
    inline,
    wrapLayout: (x) => x,
  };
  (adornments ?? [])
    .sort((a, b) => a.priority - b.priority)
    .forEach((x) => x.apply(layout));
  layout.label =
    label && !label.hide
      ? renderer.renderLabel(label, layout.labelStart, layout.labelEnd)
      : undefined;
  return layout;
}

export function controlTitle(
  title: string | undefined | null,
  field: SchemaField,
) {
  return title ? title : fieldDisplayName(field);
}

export function getLengthRestrictions(definition: DataControlDefinition) {
  const lengthVal = definition.validators?.find(
    (x) => x.type === ValidatorType.Length,
  ) as LengthValidator | undefined;

  return { min: lengthVal?.min, max: lengthVal?.max };
}

export function createArrayActions(
  control: Control<any[]>,
  field: SchemaField,
  options?: ArrayActionOptions,
): Pick<
  ArrayRendererProps,
  "addAction" | "removeAction" | "editAction" | "arrayControl"
> {
  const noun = field.displayName ?? field.field;
  const {
    addText,
    noAdd,
    removeText,
    noRemove,
    removeActionId,
    addActionId,
    editActionId,
    editText,
    disabled,
    readonly,
    designMode,
    editExternal,
  } = options ?? {};
  return {
    arrayControl: control,
    addAction:
      !readonly && !noAdd
        ? makeAdd(() => {
            if (!designMode) {
              const newValue = elementValueForField(field);

              if (editExternal) {
                const editData = getExternalEditData(control);
                editData.value = {
                  data: [elementValueForField(field)],
                  actions: [
                    makeCancel(),
                    {
                      action: makeAdd(() => {
                        const newValue = (
                          editData.fields.data.value as any[]
                        )[0];
                        addElement(control, newValue);
                        editData.value = undefined;
                      }),
                    },
                  ],
                };
              } else {
                addElement(control, newValue);
              }
            }
          })
        : undefined,
    editAction: editExternal
      ? (i: number) => ({
          actionId: editActionId ? editActionId : "edit",
          actionText: editText ? editText : "Edit",
          onClick: () => {
            if (!designMode) {
              const editData = getExternalEditData(control);
              const elementToEdit = control.as<any[]>().elements[i];
              editData.value = {
                data: [elementToEdit.current.value],
                actions: [
                  makeCancel(),
                  {
                    action: createAction(
                      "apply",
                      () => {
                        elementToEdit.value = (
                          editData.fields.data.value as any[]
                        )[0];
                        editData.value = undefined;
                      },
                      "Apply",
                    ),
                  },
                ],
              };
            }
          },
        })
      : undefined,
    removeAction:
      !readonly && !noRemove
        ? (i: number) => ({
            actionId: removeActionId ? removeActionId : "remove",
            actionText: removeText ? removeText : "Remove",
            onClick: () => {
              if (!designMode) {
                removeElement(control, i);
              }
            },
            disabled,
          })
        : undefined,
  };

  function makeAdd(onClick: () => void): ActionRendererProps {
    return createAction(
      addActionId ? addActionId : "add",
      onClick,
      addText ? addText : "Add " + noun,
      { disabled },
    );
  }

  function makeCancel(): ExternalEditAction {
    return {
      dontValidate: true,
      action: {
        actionId: "cancel",
        actionText: "Cancel",
        onClick: () => {
          getExternalEditData(control).value = undefined;
        },
        disabled,
      },
    };
  }
}

export function applyArrayLengthRestrictions(
  {
    arrayControl,
    min,
    max,
    editAction,
    addAction: aa,
    removeAction: ra,
    required,
  }: Pick<
    ArrayRendererProps,
    | "addAction"
    | "removeAction"
    | "editAction"
    | "arrayControl"
    | "min"
    | "max"
    | "required"
  >,
  disable?: boolean,
): Pick<ArrayRendererProps, "addAction" | "removeAction" | "editAction"> & {
  addDisabled: boolean;
  removeDisabled: boolean;
} {
  const [removeAllowed, addAllowed] = applyLengthRestrictions(
    arrayControl.elements?.length ?? 0,
    min == null && required ? 1 : min,
    max,
    true,
    true,
  );
  return {
    addAction: disable || addAllowed ? aa : undefined,
    removeAction: disable || removeAllowed ? ra : undefined,
    removeDisabled: !removeAllowed,
    addDisabled: !addAllowed,
    editAction,
  };
}

export function fieldOptionAdornment(p: DataRendererProps) {
  return (o: FieldOption, i: number, selected: boolean) => (
    <RenderArrayElements
      array={p.formNode.getChildNodes()}
      children={(cd, i) =>
        p.renderChild(i, cd, {
          parentDataNode: p.dataContext.parentNode,
          formData: { option: o, optionSelected: selected },
        })
      }
    />
  );
}

export function lookupChildDataContext(
  dataContext: ControlDataContext,
  c: ControlDefinition,
): ControlDataContext {
  const parentNode = dataContext.dataNode ?? dataContext.parentNode;
  const dataNode = lookupDataNode(c, parentNode);
  return { ...dataContext, parentNode, dataNode };
}
