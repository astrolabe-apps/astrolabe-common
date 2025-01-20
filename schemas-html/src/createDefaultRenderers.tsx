import {
  createDefaultDisplayRenderer,
  DefaultDisplayRendererOptions,
} from "./components/DefaultDisplay";
import {
  createDefaultLayoutRenderer,
  DefaultLayoutRendererOptions,
} from "./components/DefaultLayout";
import { createDefaultVisibilityRenderer } from "./components/DefaultVisibility";
import React, { Fragment, ReactElement, ReactNode, useCallback } from "react";
import clsx from "clsx";
import {
  createSelectRenderer,
  SelectRendererOptions,
} from "./components/SelectDataRenderer";
import { DefaultDisplayOnly } from "./components/DefaultDisplayOnly";
import { Control, useControlEffect } from "@react-typed-forms/core";
import { ControlInput, createInputConversion } from "./components/ControlInput";
import {
  createDefaultArrayDataRenderer,
  createDefaultArrayRenderer,
  DefaultArrayRendererOptions,
} from "./components/DefaultArrayRenderer";
import {
  CheckRendererOptions,
  createCheckboxRenderer,
  createCheckListRenderer,
  createRadioRenderer,
} from "./components/CheckRenderer";
import { DefaultAccordion } from "./components/DefaultAccordion";
import { createNullToggleRenderer } from "./components/NullToggle";
import { createMultilineFieldRenderer } from "./components/MultilineTextfield";
import { createJsonataRenderer } from "./components/JsonataRenderer";
import {
  ActionRendererProps,
  ActionRendererRegistration,
  AdornmentPlacement,
  AdornmentRendererRegistration,
  appendMarkupAt,
  ArrayActionOptions,
  ControlDataContext,
  createActionRenderer,
  createDataRenderer,
  DataRendererRegistration,
  DataRenderType,
  DefaultRenderers,
  FieldOption,
  FieldType,
  hasOptions,
  isAccordionAdornment,
  isDataGroupRenderer,
  isDisplayOnlyRenderer,
  isIconAdornment,
  isOptionalAdornment,
  isSetFieldAdornment,
  isTextfieldRenderer,
  LabelRendererRegistration,
  LabelType,
  rendererClass,
  schemaDataForFieldRef,
  SetFieldAdornment,
  useDynamicHooks,
  wrapLayout,
} from "@react-typed-forms/schemas";
import {
  createDefaultGroupRenderer,
  DefaultGroupRendererOptions,
} from "./components/DefaultGroupRenderer";
import {
  AutocompleteRendererOptions,
  createAutocompleteRenderer,
} from "./components/AutocompleteRenderer";
import {
  createOptionalAdornment,
  DefaultOptionalAdornmentOptions,
} from "./adornments/optionalAdornment";

export interface DefaultRendererOptions {
  data?: DefaultDataRendererOptions;
  display?: DefaultDisplayRendererOptions;
  action?: DefaultActionRendererOptions;
  array?: DefaultArrayRendererOptions;
  group?: DefaultGroupRendererOptions;
  label?: DefaultLabelRendererOptions;
  adornment?: DefaultAdornmentRendererOptions;
  layout?: DefaultLayoutRendererOptions;
}

export interface DefaultActionRendererOptions {
  className?: string;
  renderContent?: (
    actionText: string,
    actionId: string,
    actionData: any,
  ) => ReactNode;
}

export function createButtonActionRenderer(
  actionId: string | string[] | undefined,
  options: DefaultActionRendererOptions = {},
): ActionRendererRegistration {
  return createActionRenderer(
    actionId,
    ({
      onClick,
      actionText,
      className,
      style,
      actionId,
      actionData,
      disabled,
    }: ActionRendererProps) => {
      return (
        <button
          className={rendererClass(className, options.className)}
          disabled={disabled}
          style={style}
          onClick={onClick}
        >
          {options.renderContent?.(actionText, actionId, actionData) ??
            actionText}
        </button>
      );
    },
  );
}

export const DefaultBoolOptions: FieldOption[] = [
  { name: "Yes", value: true },
  { name: "No", value: false },
];

export interface DefaultDataRendererOptions {
  inputClass?: string;
  displayOnlyClass?: string;
  selectOptions?: SelectRendererOptions;
  checkboxOptions?: CheckRendererOptions;
  checkOptions?: CheckRendererOptions;
  radioOptions?: CheckRendererOptions;
  checkListOptions?: CheckRendererOptions;
  autocompleteOptions?: AutocompleteRendererOptions;
  booleanOptions?: FieldOption[];
  optionRenderer?: DataRendererRegistration;
  multilineClass?: string;
  jsonataClass?: string;
  arrayOptions?: ArrayActionOptions;
  defaultEmptyText?: string;
}

export function createDefaultDataRenderer(
  options: DefaultDataRendererOptions = {},
): DataRendererRegistration {
  const jsonataRenderer = createJsonataRenderer(options.jsonataClass);
  const nullToggler = createNullToggleRenderer();
  const multilineRenderer = createMultilineFieldRenderer(
    options.multilineClass,
  );
  const checkboxRenderer = createCheckboxRenderer(
    options.checkOptions ?? options.checkboxOptions,
  );
  const selectRenderer = createSelectRenderer(options.selectOptions);
  const radioRenderer = createRadioRenderer(
    options.radioOptions ?? options.checkOptions,
  );
  const checkListRenderer = createCheckListRenderer(
    options.checkListOptions ?? options.checkOptions,
  );
  const {
    inputClass,
    booleanOptions,
    optionRenderer,
    displayOnlyClass,
    defaultEmptyText,
  } = {
    optionRenderer: selectRenderer,
    booleanOptions: DefaultBoolOptions,
    ...options,
  };
  const arrayRenderer = createDefaultArrayDataRenderer(options.arrayOptions);

  const autocompleteRenderer = createAutocompleteRenderer(
    options.autocompleteOptions,
  );

  return createDataRenderer((props, renderers) => {
    const { field } = props;
    const fieldType = field.type;
    const renderOptions = props.renderOptions;
    let renderType = renderOptions.type;
    if (
      field.collection &&
      props.elementIndex == null &&
      (renderType == DataRenderType.Standard ||
        renderType == DataRenderType.Array)
    ) {
      return arrayRenderer.render(props, renderers);
    }
    if (fieldType === FieldType.Compound) {
      const groupOptions = (isDataGroupRenderer(renderOptions)
        ? renderOptions.groupOptions
        : undefined) ?? { type: "Standard", hideTitle: true };
      return renderers.renderGroup({ ...props, renderOptions: groupOptions });
    }
    if (props.displayOnly || isDisplayOnlyRenderer(renderOptions))
      return (p) => {
        return {
          ...p,
          className: "@ " + rendererClass(p.className, displayOnlyClass),
          children: (
            <DefaultDisplayOnly
              field={props.field}
              schemaInterface={props.dataContext.schemaInterface}
              control={props.control}
              className={props.className}
              style={props.style}
              emptyText={
                isDisplayOnlyRenderer(renderOptions) && renderOptions.emptyText
                  ? renderOptions.emptyText
                  : defaultEmptyText
              }
            />
          ),
        };
      };
    const isBool = fieldType === FieldType.Bool;
    if (booleanOptions != null && isBool && props.options == null) {
      return renderers.renderData({ ...props, options: booleanOptions });
    }
    if (renderType === DataRenderType.Standard && hasOptions(props)) {
      return optionRenderer.render(props, renderers);
    }
    switch (renderType) {
      case DataRenderType.NullToggle:
        return nullToggler.render(props, renderers);
      case DataRenderType.CheckList:
        return checkListRenderer.render(props, renderers);
      case DataRenderType.Dropdown:
        return selectRenderer.render(props, renderers);
      case DataRenderType.Radio:
        return radioRenderer.render(props, renderers);
      case DataRenderType.Checkbox:
        return checkboxRenderer.render(props, renderers);
      case DataRenderType.Jsonata:
        return jsonataRenderer.render(props, renderers);
      case DataRenderType.Autocomplete:
        return autocompleteRenderer.render(props, renderers);
    }
    if (fieldType == FieldType.Any) {
      return (
        <>
          Can't render field: {field.displayName ?? field.field} ({renderType})
        </>
      );
    }
    if (isTextfieldRenderer(renderOptions) && renderOptions.multiline)
      return multilineRenderer.render(props, renderers);
    const placeholder = isTextfieldRenderer(renderOptions)
      ? renderOptions.placeholder
      : undefined;
    return (
      <ControlInput
        className={rendererClass(props.className, inputClass)}
        style={props.style}
        id={props.id}
        readOnly={props.readonly}
        control={props.control}
        placeholder={placeholder ?? undefined}
        convert={createInputConversion(props.field.type)}
      />
    );
  });
}

export interface DefaultAccordionRendererOptions {
  className?: string;
  titleClass?: string;
  togglerClass?: string;
  iconOpenClass?: string;
  iconClosedClass?: string;
  renderTitle?: (
    title: string | undefined,
    current: Control<boolean>,
  ) => ReactNode;
  renderToggler?: (current: Control<boolean>, title: ReactNode) => ReactNode;
  useCss?: boolean;
}

export interface DefaultAdornmentRendererOptions {
  accordion?: DefaultAccordionRendererOptions;
  optional?: DefaultOptionalAdornmentOptions;
}

export function createDefaultAdornmentRenderer(
  options: DefaultAdornmentRendererOptions = {},
): AdornmentRendererRegistration {
  const optional = createOptionalAdornment(options.optional);
  return {
    type: "adornment",
    render: (props, renderers) => {
      if (isOptionalAdornment(props.adornment)) {
        return optional.render(props, renderers);
      }
      const { adornment, designMode, dataContext, useExpr } = props;
      return {
        apply: (rl) => {
          if (isSetFieldAdornment(adornment) && useExpr) {
            const hook = useExpr(adornment.expression, (x) => x);
            const dynamicHooks = useDynamicHooks({ value: hook });
            const SetFieldWrapper = useCallback(setFieldWrapper, [
              dynamicHooks,
            ]);
            return wrapLayout((x) => (
              <SetFieldWrapper
                children={x}
                parentContext={dataContext}
                adornment={adornment}
              />
            ))(rl);

            function setFieldWrapper({
              children,
              adornment,
              parentContext,
            }: {
              children: ReactNode;
              adornment: SetFieldAdornment;
              parentContext: ControlDataContext;
            }) {
              const { value } = dynamicHooks(parentContext);
              const fieldNode = schemaDataForFieldRef(
                adornment.field,
                parentContext.parentNode,
              );
              const otherField = fieldNode.control;
              const always = !adornment.defaultOnly;
              useControlEffect(
                () => [value?.value, otherField?.value == null],
                ([v]) => {
                  otherField?.setValue((x) => (always || x == null ? v : x));
                },
                true,
              );
              return children;
            }
          }
          if (isIconAdornment(adornment)) {
            return appendMarkupAt(
              adornment.placement ?? AdornmentPlacement.ControlStart,
              <i className={adornment.iconClass} />,
            )(rl);
          }
          if (isAccordionAdornment(adornment)) {
            return wrapLayout((x) => (
              <DefaultAccordion
                renderers={renderers}
                children={x}
                accordion={adornment}
                contentStyle={rl.style}
                contentClassName={rl.className}
                designMode={designMode}
                dataContext={dataContext}
                {...options.accordion}
              />
            ))(rl);
          }
        },
        priority: 0,
        adornment,
      };
    },
  };
}

interface DefaultLabelRendererOptions {
  className?: string;
  groupLabelClass?: string;
  controlLabelClass?: string;
  requiredElement?: ReactNode;
  labelContainer?: (children: ReactElement) => ReactElement;
}

export function createDefaultLabelRenderer(
  options?: DefaultLabelRendererOptions,
): LabelRendererRegistration {
  const {
    className,
    groupLabelClass,
    controlLabelClass,
    requiredElement,
    labelContainer,
  } = {
    requiredElement: <span> *</span>,
    labelContainer: (c: ReactElement) => c,
    ...options,
  };
  return {
    render: (props, labelStart, labelEnd, renderers) => {
      if (props.type == LabelType.Text) return props.label;
      return labelContainer(
        <>
          <label
            htmlFor={props.forId}
            className={rendererClass(
              props.className,
              clsx(
                className,
                props.type === LabelType.Group && groupLabelClass,
                props.type === LabelType.Control && controlLabelClass,
              ),
            )}
          >
            {labelStart}
            {renderers.renderLabelText(props.label)}
            {props.required && requiredElement}
          </label>
          {labelEnd}
        </>,
      );
    },
    type: "label",
  };
}

export function createDefaultRenderers(
  options: DefaultRendererOptions = {},
): DefaultRenderers {
  return {
    data: createDefaultDataRenderer(options.data),
    display: createDefaultDisplayRenderer(options.display),
    action: createButtonActionRenderer(undefined, options.action),
    array: createDefaultArrayRenderer(options.array),
    group: createDefaultGroupRenderer(options.group),
    label: createDefaultLabelRenderer(options.label),
    adornment: createDefaultAdornmentRenderer(options.adornment),
    renderLayout: createDefaultLayoutRenderer(options.layout),
    visibility: createDefaultVisibilityRenderer(),
  };
}

export function createClassStyledRenderers() {
  return createDefaultRenderers({
    layout: { className: "control" },
    group: { className: "group" },
    array: { className: "control-array" },
    action: { className: "action" },
    data: { inputClass: "data" },
    display: { htmlClassName: "html", textClassName: "text" },
  });
}
