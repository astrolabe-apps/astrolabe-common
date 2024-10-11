import React, {
  FC,
  Fragment,
  Key,
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
  useCalculatedControl,
  useComponentTracking,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  AdornmentPlacement,
  ArrayActionOptions,
  ControlAdornment,
  ControlDefinition,
  CustomDisplay,
  DataControlDefinition,
  DataRenderType,
  DisplayData,
  DisplayDataType,
  DynamicPropertyType,
  FieldOption,
  GroupRenderOptions,
  isActionControlsDefinition,
  isDataControlDefinition,
  isDisplayControlsDefinition,
  isGroupControlsDefinition,
  LengthValidator,
  RenderOptions,
  SchemaField,
  SchemaInterface,
  SchemaValidator,
  ValidatorType,
} from "./types";
import {
  applyLengthRestrictions,
  ControlDataContext,
  elementValueForField,
  fieldDisplayName,
  FormContextData,
  JsonPath,
  useDynamicHooks,
  useUpdatedRef,
} from "./util";
import { dataControl } from "./controlBuilder";
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
import { cc } from "./internal";
import { defaultSchemaInterface } from "./schemaInterface";
import {
  createSchemaLookup,
  lookupDataNode,
  makeSchemaDataNode,
  SchemaDataNode,
} from "./treeNodes";

export interface FormRenderer {
  renderData: (
    props: DataRendererProps,
  ) => (layout: ControlLayoutProps) => ControlLayoutProps;
  renderGroup: (
    props: GroupRendererProps,
  ) => (layout: ControlLayoutProps) => ControlLayoutProps;
  renderDisplay: (props: DisplayRendererProps) => ReactNode;
  renderAction: (props: ActionRendererProps) => ReactNode;
  renderArray: (props: ArrayRendererProps) => ReactNode;
  renderAdornment: (props: AdornmentProps) => AdornmentRenderer;
  renderLabel: (
    props: LabelRendererProps,
    labelStart: ReactNode,
    labelEnd: ReactNode,
  ) => ReactNode;
  renderLayout: (props: ControlLayoutProps) => RenderedControl;
  renderVisibility: (props: VisibilityRendererProps) => ReactNode;
  renderLabelText: (props: ReactNode) => ReactNode;
}

export interface AdornmentProps {
  adornment: ControlAdornment;
  dataContext: ControlDataContext;
  useExpr?: UseEvalExpressionHook;
  designMode?: boolean;
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

export enum LabelType {
  Control,
  Group,
  Text,
}
export interface LabelRendererProps {
  type: LabelType;
  hide?: boolean | null;
  label: ReactNode;
  required?: boolean | null;
  forId?: string;
  className?: string;
}
export interface DisplayRendererProps {
  data: DisplayData;
  display?: Control<string | undefined>;
  dataContext: ControlDataContext;
  className?: string;
  style?: React.CSSProperties;
}

export type ChildVisibilityFunc = (
  child: ControlDefinition,
  parentNode?: SchemaDataNode,
  dontOverride?: boolean,
) => EvalExpressionHook<boolean>;
export interface ParentRendererProps {
  childDefinitions: ControlDefinition[];
  renderChild: ChildRenderer;
  className?: string;
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
}

export interface ActionRendererProps {
  actionId: string;
  actionText: string;
  actionData?: any;
  onClick: () => void;
  className?: string | null;
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
}

export interface DataControlProps {
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
}

export type CreateDataProps = (
  controlProps: DataControlProps,
) => DataRendererProps;

export interface ControlRenderOptions extends FormContextOptions {
  useDataHook?: (c: ControlDefinition) => CreateDataProps;
  actionOnClick?: (actionId: string, actionData: any) => () => void;
  customDisplay?: (
    customId: string,
    displayProps: DisplayRendererProps,
  ) => ReactNode;
  useValidationHook?: (
    validator: SchemaValidator,
    ctx: ValidationContext,
  ) => void;
  useEvalExpressionHook?: UseEvalExpressionHook;
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
  definition: ControlDefinition,
  renderer: FormRenderer,
  options: ControlRenderOptions = {},
  parentDataNode: SchemaDataNode,
): FC<{}> {
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
  });

  const Component = useCallback(() => {
    const stopTracking = useComponentTracking();

    try {
      const {
        definition: c,
        options,
        elementIndex,
        parentDataNode: pdn,
        dataNode: dn,
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
          isDataControlDefinition(definition) && definition.dontClearHidden,
          isDataControlDefinition(definition) &&
            definition.renderOptions?.type == DataRenderType.NullToggle,
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
      const myOptionsControl = useCalculatedControl<FormContextOptions>(() => ({
        hidden: options.hidden || !visibility.fields?.showing.value,
        readonly: options.readonly || readonlyControl.value,
        disabled: options.disabled || disabledControl.value,
      }));
      const myOptions = trackedValue(myOptionsControl);
      useValidation({
        control: control ?? newControl(null),
        hiddenControl: myOptionsControl.fields.hidden,
        dataContext,
      });
      const childOptions: ControlRenderOptions = {
        ...options,
        ...myOptions,
        elementIndex: undefined,
        formData,
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
          }),
        ) ?? [];
      const labelAndChildren = renderControlLayout({
        definition: c,
        renderer,
        renderChild: (k, child, options) => {
          if (control && control.isNull) return <Fragment key={k} />;
          const { parentDataNode, ...renderOptions } = options ?? {};
          const dContext =
            parentDataNode ?? dataContext.dataNode ?? dataContext.parentNode;

          return (
            <NewControlRenderer
              key={k}
              definition={child}
              renderer={renderer}
              parentDataNode={dContext}
              options={{ ...childOptions, ...renderOptions }}
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
      const renderedControl = renderer.renderLayout({
        ...labelAndChildren,
        adornments,
        className: c.layoutClass,
        style: layoutStyle.value,
      });
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
  definition: ControlDefinition;
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
  ...props
}: DataControlProps): DataRendererProps {
  const dataNode = props.dataContext.dataNode!;
  const field = dataNode.schema.field;
  const className = cc(definition.styleClass);
  const required = !!definition.required;
  const fieldOptions = schemaInterface.getOptions(field);
  const _allowed = allowedOptions?.value ?? [];
  const allowed = Array.isArray(_allowed) ? _allowed : [_allowed];
  return {
    dataNode,
    definition,
    childDefinitions: definition.children ?? [],
    control,
    field,
    id: "c" + control.uniqueId,
    options:
      allowed.length > 0
        ? allowed.map((x) =>
            typeof x === "object"
              ? x
              : (fieldOptions?.find((y) => y.value == x) ?? {
                  name: x.toString(),
                  value: x,
                }),
          )
        : fieldOptions,
    readonly: !!formOptions.readonly,
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
}

export type ChildRenderer = (
  k: Key,
  child: ControlDefinition,
  options?: ChildRendererOptions,
) => ReactNode;

export interface RenderControlProps {
  definition: ControlDefinition;
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
  actionOnClick?: (actionId: string, actionData: any) => () => void;
  schemaInterface?: SchemaInterface;
  designMode?: boolean;
  customDisplay?: (
    customId: string,
    displayProps: DisplayRendererProps,
  ) => ReactNode;
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
  } = props;

  if (isDataControlDefinition(c)) {
    return renderData(c);
  }
  if (isGroupControlsDefinition(c)) {
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
        childDefinitions: c.children ?? [],
        definition: c,
        renderChild,
        useEvalExpression,
        dataContext,
        renderOptions: c.groupOptions ?? { type: "Standard" },
        className: cc(c.styleClass),
        useChildVisibility,
        style,
        designMode,
      }),
      label: {
        label: labelText?.value ?? c.title,
        className: cc(c.labelClass),
        type: LabelType.Group,
        hide: c.groupOptions?.hideTitle,
      },
    };
  }
  if (isActionControlsDefinition(c)) {
    const actionData = props.actionDataControl?.value ?? c.actionData;
    return {
      children: renderer.renderAction({
        actionText: labelText?.value ?? c.title ?? c.actionId,
        actionId: c.actionId,
        actionData,
        onClick: props.actionOnClick?.(c.actionId, actionData) ?? (() => {}),
        className: cc(c.styleClass),
        style,
      }),
    };
  }
  if (isDisplayControlsDefinition(c)) {
    const data = c.displayData ?? {};
    const displayProps = {
      data,
      className: cc(c.styleClass),
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

  function renderData(c: DataControlDefinition) {
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
        required: c.required,
        hide: c.hideTitle,
        className: cc(c.labelClass),
      },
      errorControl: control,
    };
  }
}

type MarkupKeys = keyof Omit<
  RenderedLayout,
  "errorControl" | "style" | "className" | "wrapLayout"
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
    className: cc(className),
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
): Pick<ArrayRendererProps, "addAction" | "removeAction" | "arrayControl"> {
  const noun = field.displayName ?? field.field;
  const {
    addText,
    noAdd,
    removeText,
    noRemove,
    removeActionId,
    addActionId,
    disabled,
    readonly,
    designMode,
  } = options ?? {};
  return {
    arrayControl: control,
    addAction:
      !readonly && !noAdd
        ? {
            actionId: addActionId ? addActionId : "add",
            actionText: addText ? addText : "Add " + noun,
            onClick: () =>
              !designMode && addElement(control, elementValueForField(field)),
            disabled,
          }
        : undefined,
    removeAction:
      !readonly && !noRemove
        ? (i: number) => ({
            actionId: removeActionId ? removeActionId : "remove",
            actionText: removeText ? removeText : "Remove",
            onClick: () => !designMode && removeElement(control, i),
            disabled,
          })
        : undefined,
  };
}

export function applyArrayLengthRestrictions(
  {
    arrayControl,
    min,
    max,
    addAction: aa,
    removeAction: ra,
    required,
  }: Pick<
    ArrayRendererProps,
    "addAction" | "removeAction" | "arrayControl" | "min" | "max" | "required"
  >,
  disable?: boolean,
): Pick<ArrayRendererProps, "addAction" | "removeAction"> & {
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
  };
}

export function fieldOptionAdornment(p: DataRendererProps) {
  return (o: FieldOption, i: number, selected: boolean) => (
    <RenderArrayElements array={p.childDefinitions}>
      {(cd, i) =>
        p.renderChild(i, cd, {
          parentDataNode: p.dataContext.parentNode,
          formData: { option: o, optionSelected: selected },
        })
      }
    </RenderArrayElements>
  );
}
