import React, {
  ButtonHTMLAttributes,
  ComponentType,
  ElementType,
  FC,
  Fragment,
  HTMLAttributes,
  InputHTMLAttributes,
  Key,
  LabelHTMLAttributes,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import {
  addElement,
  Control,
  newControl,
  removeElement,
  RenderArrayElements,
  trackedValue,
  useComponentTracking,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  ActionStyle,
  AdornmentPlacement,
  ArrayActionOptions,
  ControlActionHandler,
  ControlAdornment,
  ControlAdornmentType,
  ControlDataContext,
  ControlDefinition,
  CustomDisplay,
  DataControlDefinition,
  DataRenderType,
  DisplayData,
  DisplayDataType,
  DynamicPropertyType,
  FormContextData,
  FormNode,
  GroupRenderOptions,
  IconReference,
  isActionControl,
  isDataControl,
  isDisplayControl,
  isGroupControl,
  legacyFormNode,
  lookupDataNode,
  RenderOptions,
} from "./controlDefinition";
import {
  applyLengthRestrictions,
  ControlClasses,
  elementValueForField,
  ExternalEditAction,
  fieldDisplayName,
  getExternalEditData,
  getGroupClassOverrides,
  isControlDisplayOnly,
  JsonPath,
  rendererClass,
  useUpdatedRef,
} from "./util";
import { createAction, dataControl } from "./controlBuilder";
import {
  defaultUseEvalExpressionHook,
  EvalExpressionHook,
  useEvalActionHook,
  useEvalAllowedOptionsHook,
  useEvalDefaultValueHook,
  useEvalDisabledHook,
  useEvalDisplayHook,
  UseEvalExpressionHook,
  useEvalLabelText,
  useEvalReadonlyHook,
  useEvalStyleHook,
  useEvalVisibilityHook,
} from "./hooks";
import { useMakeValidationHook, ValidationContext } from "./validators";
import { useDynamicHooks } from "./dynamicHooks";
import { defaultSchemaInterface } from "./defaultSchemaInterface";
import {
  LengthValidator,
  SchemaValidator,
  ValidatorType,
} from "./schemaValidator";
import {
  createSchemaLookup,
  FieldOption,
  makeSchemaDataNode,
  SchemaDataNode,
  SchemaField,
  SchemaInterface,
} from "./schemaField";

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
}

export interface HtmlComponents {
  Div: ComponentType<HtmlDivProperties>;
  Span: ElementType<HTMLAttributes<HTMLSpanElement>>;
  Button: ElementType<ButtonHTMLAttributes<HTMLButtonElement>>;
  I: ComponentType<HtmlIconProperties>;
  Label: ComponentType<HtmlLabelProperties>;
  B: ElementType<HTMLAttributes<HTMLElement>>;
  H1: ElementType<HTMLAttributes<HTMLElement>>;
  Input: ElementType<InputHTMLAttributes<HTMLInputElement>, "input">;
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
  useExpr?: UseEvalExpressionHook;
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
}

export interface RenderedControl {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  divRef?: (cb: HTMLElement | null) => void;
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
}

export type ChildVisibilityFunc = (
  child: ControlDefinition,
  parentNode?: SchemaDataNode,
  dontOverride?: boolean,
) => EvalExpressionHook<boolean>;
export interface ParentRendererProps {
  formNode: FormNode;
  renderChild: ChildRenderer;
  className?: string;
  textClass?: string;
  style?: React.CSSProperties;
  dataContext: ControlDataContext;
  useChildVisibility: ChildVisibilityFunc;
  useEvalExpression: UseEvalExpressionHook;
  designMode?: boolean;
}

export interface GroupRendererProps extends ParentRendererProps {
  definition: ControlDefinition;
  renderOptions: GroupRenderOptions;
}

export interface DataRendererProps extends ParentRendererProps {
  renderOptions: RenderOptions;
  definition: DataControlDefinition;
  field: SchemaField;
  elementIndex?: number;
  id: string;
  control: Control<any>;
  readonly: boolean;
  required: boolean;
  options: FieldOption[] | undefined | null;
  hidden: boolean;
  dataNode: SchemaDataNode;
  displayOnly: boolean;
}

export interface ActionRendererProps {
  actionId: string;
  actionText: string;
  actionData?: any;
  actionStyle?: ActionStyle;
  icon?: IconReference;
  onClick: () => void;
  className?: string | null;
  textClass?: string | null;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export interface ControlRenderProps {
  control: Control<any>;
  parentPath?: JsonPath[];
}

export interface FormContextOptions {
  readonly?: boolean | null;
  hidden?: boolean | null;
  disabled?: boolean | null;
  displayOnly?: boolean;
}

export interface DataControlProps {
  formNode: FormNode;
  definition: DataControlDefinition;
  dataContext: ControlDataContext;
  control: Control<any>;
  formOptions: FormContextOptions;
  style?: React.CSSProperties | undefined;
  renderChild: ChildRenderer;
  elementIndex?: number;
  allowedOptions?: Control<any[] | undefined>;
  useChildVisibility: ChildVisibilityFunc;
  useEvalExpression: UseEvalExpressionHook;
  schemaInterface?: SchemaInterface;
  designMode?: boolean;
  styleClass?: string;
  layoutClass?: string;
}

export type CreateDataProps = (
  controlProps: DataControlProps,
) => DataRendererProps;

export interface ControlRenderOptions
  extends FormContextOptions,
    ControlClasses {
  useDataHook?: (c: ControlDefinition) => CreateDataProps;
  actionOnClick?: ControlActionHandler;
  customDisplay?: (
    customId: string,
    displayProps: DisplayRendererProps,
  ) => ReactNode;
  useValidationHook?: (
    validator: SchemaValidator,
    ctx: ValidationContext,
  ) => void;
  useEvalExpressionHook?: UseEvalExpressionHook;
  adjustLayout?: (
    context: ControlDataContext,
    layout: ControlLayoutProps,
  ) => ControlLayoutProps;
  clearHidden?: boolean;
  schemaInterface?: SchemaInterface;
  elementIndex?: number;
  formData?: FormContextData;
}

export function useControlRenderer(
  definition: ControlDefinition,
  fields: SchemaField[],
  renderer: FormRenderer,
  options: ControlRenderOptions = {},
): FC<ControlRenderProps> {
  const r = useUpdatedRef({ definition, fields, renderer, options });
  return useCallback(
    ({ control, parentPath }) => {
      return (
        <ControlRenderer
          {...r.current}
          control={control}
          parentPath={parentPath}
        />
      );
    },
    [r],
  );
}
export function useControlRendererComponent(
  controlOrFormNode: ControlDefinition | FormNode,
  renderer: FormRenderer,
  options: ControlRenderOptions = {},
  parentDataNode: SchemaDataNode,
): FC<{}> {
  const [definition, formNode] =
    "definition" in controlOrFormNode
      ? [controlOrFormNode.definition, controlOrFormNode]
      : [controlOrFormNode, legacyFormNode(controlOrFormNode)];
  const dataProps = options.useDataHook?.(definition) ?? defaultDataProps;
  const elementIndex = options.elementIndex;
  const schemaInterface = options.schemaInterface ?? defaultSchemaInterface;
  const useExpr = options.useEvalExpressionHook ?? defaultUseEvalExpressionHook;

  let dataNode: SchemaDataNode | undefined;
  if (elementIndex != null) {
    dataNode = parentDataNode.getChildElement(elementIndex);
  } else {
    dataNode = lookupDataNode(definition, parentDataNode);
  }
  const useValidation = useMakeValidationHook(
    definition,
    options.useValidationHook,
  );
  const dynamicHooks = useDynamicHooks({
    defaultValueControl: useEvalDefaultValueHook(useExpr, definition),
    visibleControl: useEvalVisibilityHook(useExpr, definition),
    readonlyControl: useEvalReadonlyHook(useExpr, definition),
    disabledControl: useEvalDisabledHook(useExpr, definition),
    allowedOptions: useEvalAllowedOptionsHook(useExpr, definition),
    labelText: useEvalLabelText(useExpr, definition),
    actionData: useEvalActionHook(useExpr, definition),
    customStyle: useEvalStyleHook(
      useExpr,
      DynamicPropertyType.Style,
      definition,
    ),
    layoutStyle: useEvalStyleHook(
      useExpr,
      DynamicPropertyType.LayoutStyle,
      definition,
    ),
    displayControl: useEvalDisplayHook(useExpr, definition),
  });

  const r = useUpdatedRef({
    options,
    definition,
    elementIndex,
    parentDataNode,
    dataNode,
    formNode,
  });

  if (formNode == null) debugger;
  const Component = useCallback(() => {
    const stopTracking = useComponentTracking();

    try {
      const {
        definition: c,
        options,
        elementIndex,
        parentDataNode: pdn,
        dataNode: dn,
        formNode,
      } = r.current;
      const formData = options.formData ?? {};
      const dataContext: ControlDataContext = {
        schemaInterface,
        dataNode: dn,
        parentNode: pdn,
        formData,
      };
      const {
        readonlyControl,
        disabledControl,
        visibleControl,
        displayControl,
        layoutStyle,
        labelText,
        customStyle,
        allowedOptions,
        defaultValueControl,
        actionData,
      } = dynamicHooks(dataContext);

      const visible = visibleControl.current.value;
      const visibility = useControl<Visibility | undefined>(() =>
        visible != null
          ? {
              visible,
              showing: visible,
            }
          : undefined,
      );
      useControlEffect(
        () => visibleControl.value,
        (visible) => {
          if (visible != null)
            visibility.setValue((ex) => ({
              visible,
              showing: ex ? ex.showing : visible,
            }));
        },
      );

      const parentControl = parentDataNode.control!;
      const control = dataNode?.control;
      useControlEffect(
        () => [
          visibility.value,
          defaultValueControl.value,
          control?.isNull,
          isDataControl(definition) && definition.dontClearHidden,
          definition.adornments?.some(
            (x) => x.type === ControlAdornmentType.Optional,
          ) ||
            (isDataControl(definition) &&
              definition.renderOptions?.type == DataRenderType.NullToggle),
          parentControl.isNull,
          options.hidden,
          readonlyControl.value,
        ],
        ([vc, dv, _, dontClear, dontDefault, parentNull, hidden, ro]) => {
          if (!ro) {
            if (control) {
              if (vc && vc.visible === vc.showing) {
                if (hidden || !vc.visible) {
                  control.setValue((x) =>
                    options.clearHidden && !dontClear
                      ? undefined
                      : x == null && dontClear && !dontDefault
                        ? dv
                        : x,
                  );
                } else if (!dontDefault)
                  control.setValue((x) => (x != null ? x : dv));
              }
            } else if (parentNull) {
              parentControl.setValue((x) => x ?? {});
            }
          }
        },
        true,
      );
      const myOptionsControl = useComputed<FormContextOptions>(() => ({
        hidden: options.hidden || !visibility.fields?.showing.value,
        readonly: options.readonly || readonlyControl.value,
        disabled: options.disabled || disabledControl.value,
        displayOnly: options.displayOnly || isControlDisplayOnly(c),
      }));
      const myOptions = trackedValue(myOptionsControl);
      useValidation({
        control: control ?? newControl(null),
        hiddenControl: myOptionsControl.fields.hidden,
        dataContext,
      });
      const {
        styleClass,
        labelClass,
        layoutClass,
        labelTextClass,
        textClass,
        ...inheritableOptions
      } = options;
      const childOptions: ControlRenderOptions = {
        ...inheritableOptions,
        ...myOptions,
        elementIndex: undefined,
      };

      useEffect(() => {
        if (
          control &&
          typeof myOptions.disabled === "boolean" &&
          control.disabled != myOptions.disabled
        )
          control.disabled = myOptions.disabled;
      }, [control, myOptions.disabled]);
      if (parentControl.isNull) return <></>;

      const adornments =
        definition.adornments?.map((x) =>
          renderer.renderAdornment({
            adornment: x,
            dataContext,
            useExpr,
            formOptions: myOptions,
          }),
        ) ?? [];
      const otherChildNodes =
        definition.childRefId &&
        formNode.tree.getByRefId(definition.childRefId)?.getChildNodes();

      const labelAndChildren = renderControlLayout({
        formNode: otherChildNodes
          ? formNode.tree.createTempNode(
              formNode.id,
              definition,
              otherChildNodes,
            )
          : formNode,
        definition: c,
        renderer,
        renderChild: (k, child, options) => {
          const overrideClasses = getGroupClassOverrides(c);
          const { parentDataNode, ...renderOptions } = options ?? {};
          const dContext =
            parentDataNode ?? dataContext.dataNode ?? dataContext.parentNode;
          const allChildOptions = {
            ...childOptions,
            ...overrideClasses,
            ...renderOptions,
          };
          return (
            <NewControlRenderer
              key={k}
              definition={child}
              renderer={renderer}
              parentDataNode={dContext}
              options={allChildOptions}
            />
          );
        },
        createDataProps: dataProps,
        formOptions: myOptions,
        dataContext,
        control: displayControl ?? control,
        elementIndex,
        schemaInterface,
        labelText,
        displayControl,
        style: customStyle.value,
        allowedOptions,
        customDisplay: options.customDisplay,
        actionDataControl: actionData,
        actionOnClick: options.actionOnClick,
        styleClass: options.styleClass,
        labelClass: options.labelClass,
        textClass: options.textClass,
        useEvalExpression: useExpr,
        useChildVisibility: (childDef, parentNode, dontOverride) => {
          return useEvalVisibilityHook(
            useExpr,
            childDef,
            !dontOverride
              ? lookupDataNode(
                  childDef,
                  parentNode ?? dataNode ?? parentDataNode,
                )
              : undefined,
          );
        },
      });
      const layoutProps: ControlLayoutProps = {
        ...labelAndChildren,
        adornments,
        className: rendererClass(options.layoutClass, c.layoutClass),
        style: layoutStyle.value,
      };
      const renderedControl = renderer.renderLayout(
        options.adjustLayout?.(dataContext, layoutProps) ?? layoutProps,
      );
      return renderer.renderVisibility({ visibility, ...renderedControl });
    } finally {
      stopTracking();
    }
  }, [r, dataProps, useValidation, renderer, schemaInterface, dynamicHooks]);
  (Component as any).displayName = "RenderControl";
  return Component;
}

export function ControlRenderer({
  definition,
  fields,
  renderer,
  options,
  control,
  parentPath,
}: {
  definition: ControlDefinition;
  fields: SchemaField[];
  renderer: FormRenderer;
  options?: ControlRenderOptions;
  control: Control<any>;
  parentPath?: JsonPath[];
}) {
  const schemaDataNode = makeSchemaDataNode(
    createSchemaLookup({ "": fields }).getSchema("")!,
    control,
  );
  const Render = useControlRendererComponent(
    definition,
    renderer,
    options,
    schemaDataNode,
  );
  return <Render />;
}

export function NewControlRenderer({
  definition,
  renderer,
  options,
  parentDataNode,
}: {
  definition: ControlDefinition | FormNode;
  renderer: FormRenderer;
  options?: ControlRenderOptions;
  parentDataNode: SchemaDataNode;
}) {
  const Render = useControlRendererComponent(
    definition,
    renderer,
    options,
    parentDataNode,
  );
  return <Render />;
}

export function defaultDataProps({
  definition,
  control,
  formOptions,
  style,
  allowedOptions,
  schemaInterface = defaultSchemaInterface,
  styleClass,
  ...props
}: DataControlProps): DataRendererProps {
  const dataNode = props.dataContext.dataNode!;
  const field = dataNode.schema.field;
  const className = rendererClass(styleClass, definition.styleClass);
  const displayOnly = !!formOptions.displayOnly;
  const required = !!definition.required && !displayOnly;
  const fieldOptions = schemaInterface.getDataOptions(dataNode);
  const _allowed = allowedOptions?.value ?? [];
  const allowed = Array.isArray(_allowed) ? _allowed : [_allowed];
  return {
    dataNode,
    definition,
    control,
    field,
    id: "c" + control.uniqueId,
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
    style,
    ...props,
  };
}

export interface ChildRendererOptions {
  elementIndex?: number;
  parentDataNode?: SchemaDataNode;
  formData?: FormContextData;
  displayOnly?: boolean;
  styleClass?: string;
  layoutClass?: string;
  labelClass?: string;
}

export type ChildRenderer = (
  k: Key,
  child: FormNode,
  options?: ChildRendererOptions,
) => ReactNode;

export interface RenderControlProps {
  definition: ControlDefinition;
  formNode: FormNode;
  renderer: FormRenderer;
  renderChild: ChildRenderer;
  createDataProps: CreateDataProps;
  formOptions: FormContextOptions;
  dataContext: ControlDataContext;
  control?: Control<any>;
  labelText?: Control<string | null | undefined>;
  elementIndex?: number;
  displayControl?: Control<string | undefined>;
  style?: React.CSSProperties;
  allowedOptions?: Control<any[] | undefined>;
  actionDataControl?: Control<any | undefined | null>;
  useChildVisibility: ChildVisibilityFunc;
  useEvalExpression: UseEvalExpressionHook;
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
  props: RenderControlProps,
): ControlLayoutProps {
  const {
    definition: c,
    renderer,
    renderChild,
    control,
    dataContext,
    createDataProps: dataProps,
    displayControl,
    style,
    labelText,
    useChildVisibility,
    designMode,
    customDisplay,
    useEvalExpression,
    labelClass,
    labelTextClass,
    styleClass,
    textClass,
    formNode,
  } = props;

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
      processLayout: renderer.renderGroup({
        formNode,
        definition: c,
        renderChild,
        useEvalExpression,
        dataContext,
        renderOptions: c.groupOptions ?? { type: "Standard" },
        className: rendererClass(styleClass, c.styleClass),
        useChildVisibility,
        style,
        designMode,
      }),
      label: {
        label: labelText?.value ?? c.title,
        className: rendererClass(labelClass, c.labelClass),
        textClass: rendererClass(labelTextClass, c.labelTextClass),
        type: LabelType.Group,
        hide: c.groupOptions?.hideTitle,
      },
    };
  }
  if (isActionControl(c)) {
    const actionData = props.actionDataControl?.value ?? c.actionData;
    return {
      children: renderer.renderAction({
        actionText: labelText?.value ?? c.title ?? c.actionId,
        actionId: c.actionId,
        actionData,
        actionStyle: c.actionStyle ?? ActionStyle.Button,
        textClass: rendererClass(textClass, c.textClass),
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
      display: displayControl,
      dataContext,
    };
    if (data.type === DisplayDataType.Custom && customDisplay) {
      return {
        children: customDisplay((data as CustomDisplay).customId, displayProps),
      };
    }
    return {
      children: renderer.renderDisplay(displayProps),
    };
  }
  return {};

  function renderData(c: DataControlDefinition): ControlLayoutProps {
    if (!control) return { children: "No control for: " + c.field };
    const rendererProps = dataProps(
      props as RenderControlProps & {
        definition: DataControlDefinition;
        control: Control<any>;
      },
    );

    const label = !c.hideTitle
      ? controlTitle(
          labelText?.value ?? c.title,
          props.dataContext.dataNode!.schema.field,
        )
      : undefined;
    return {
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
  const { className, children, style, errorControl, label, adornments } =
    props.processLayout?.(props) ?? props;
  const layout: RenderedLayout = {
    children,
    errorControl,
    style,
    className: className!,
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
    <RenderArrayElements array={p.formNode.getChildNodes()}>
      {(cd, i) =>
        p.renderChild(i, cd, {
          parentDataNode: p.dataContext.parentNode,
          formData: { option: o, optionSelected: selected },
        })
      }
    </RenderArrayElements>
  );
}
