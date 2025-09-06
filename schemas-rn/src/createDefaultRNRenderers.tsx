import {
  createDefaultDisplayRenderer,
} from "./components/DefaultDisplay";
import {
  createDefaultLayoutRenderer,
} from "./components/DefaultLayout";
import { createDefaultVisibilityRenderer } from "./components/DefaultVisibility";
import React, {
  Fragment,
  isValidElement,
  ReactElement,
  ReactNode,
} from "react";
import clsx from "clsx";
import {
  createSelectRenderer,
} from "./components/SelectDataRenderer";
import { DefaultDisplayOnly } from "./components/DefaultDisplayOnly";
import { Control, useControlEffect } from "@react-typed-forms/core";
import { ControlInput, createInputConversion } from "./components/ControlInput";
import {
  createDefaultArrayDataRenderer,
  createDefaultArrayRenderer,
} from "./components/DefaultArrayRenderer";
import {
  createCheckboxRenderer,
  createCheckListRenderer,
  createElementSelectedRenderer,
  createRadioRenderer,
} from "./components/CheckRenderer";
import { DefaultAccordion } from "./components/DefaultAccordion";
import { createNullToggleRenderer } from "./components/NullToggle";
import { createMultilineFieldRenderer } from "./components/MultilineTextfield";
import { createJsonataRenderer } from "./components/JsonataRenderer";
import {
  AdornmentPlacement,
  AdornmentRendererRegistration,
  appendMarkupAt,
  ArrayActionOptions,
  CheckRendererOptions,
  ControlDataContext,
  createDataRenderer,
  DataRendererRegistration,
  DataRenderType,
  DefaultRenderers,
  FieldOption,
  FieldType,
  FormRenderer,
  hasOptions,
  HtmlButtonProperties,
  HtmlComponents,
  HtmlDivProperties,
  HtmlIconProperties,
  HtmlInputProperties,
  HtmlLabelProperties,
  IconLibrary,
  IconReference,
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
  RendererRegistration,
  RunExpression,
  schemaDataForFieldRef,
  SetFieldAdornment,
  useExpression,
  wrapLayout,
  // Import all the options interfaces from the schemas package
  DefaultRendererOptions,
  DefaultDataRendererOptions,
  DefaultAccordionRendererOptions,
  DefaultHelpTextRendererOptions,
  DefaultLabelRendererOptions,
  DefaultBoolOptions,
  DefaultDisplayRendererOptions,
  DefaultLayoutRendererOptions,
  DefaultArrayRendererOptions,
  DefaultGroupRendererOptions,
  DefaultActionRendererOptions,
  SelectRendererOptions,
  DefaultScrollListOptions,
  DefaultAdornmentRendererOptions,
  DefaultOptionalAdornmentOptions,
} from "@react-typed-forms/schemas";
import {
  createDefaultGroupRenderer,
} from "./components/DefaultGroupRenderer";
import {
  createButtonActionRenderer,
} from "./createButtonActionRenderer";
import {
  createScrollListRenderer,
} from "./components/ScrollListRenderer";
import { HtmlCheckButtons } from "./components/HtmlCheckButtons";


export function createDefaultDataRenderer(
  options: DefaultDataRendererOptions = {},
): DataRendererRegistration {
  const elementSelectedRenderer = createElementSelectedRenderer(
    options.checkboxOptions ?? options.checkOptions,
  );
  const jsonataRenderer = createJsonataRenderer(options.jsonataClass);
  const nullToggler = createNullToggleRenderer();
  const multilineRenderer = createMultilineFieldRenderer(
    options.multilineClass,
  );
  const checkboxRenderer = createCheckboxRenderer(
    options.checkboxOptions ?? options.checkOptions,
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
    inputTextClass,
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


  const scrollListRenderer = createScrollListRenderer(
    options.scrollListOptions,
  );

  return createDataRenderer((props, renderers) => {
    const { field } = props;
    const fieldType = field.type;
    const renderOptions = props.renderOptions;
    let renderType = renderOptions.type
      ? renderOptions.type
      : DataRenderType.Standard;
    if (
      field.collection &&
      props.dataNode.elementIndex == null &&
      (renderType == DataRenderType.Standard ||
        renderType == DataRenderType.Array ||
        renderType == DataRenderType.ArrayElement)
    ) {
      if (renderType == DataRenderType.ArrayElement)
        throw new Error("ArrayElement renderer not implemented for React Native");
      return arrayRenderer.render(props, renderers);
    }
    if (
      fieldType === FieldType.Compound &&
      (isDataGroupRenderer(renderOptions) ||
        renderType === DataRenderType.Standard)
    ) {
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
              dataNode={props.dataNode}
              state={props.formNode}
              schemaInterface={props.dataContext.schemaInterface}
              className={props.className}
              textClass={props.textClass}
              style={props.style}
              inline={props.inline}
              renderer={renderers}
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
      case DataRenderType.ScrollList:
        return scrollListRenderer.render(props, renderers);
      case DataRenderType.Dropdown:
        return selectRenderer.render(props, renderers);
      case DataRenderType.Radio:
        return radioRenderer.render(props, renderers);
      case DataRenderType.Checkbox:
        return checkboxRenderer.render(props, renderers);
      case DataRenderType.Jsonata:
        return jsonataRenderer.render(props, renderers);
      case DataRenderType.Autocomplete:
        throw new Error("Autocomplete renderer not implemented for React Native");
      case DataRenderType.ElementSelected:
        return elementSelectedRenderer.render(props, renderers);
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
        textClass={rendererClass(props.textClass, inputTextClass)}
        style={props.style}
        id={props.id}
        errorId={props.errorId}
        readOnly={props.readonly}
        control={props.control}
        placeholder={placeholder ?? undefined}
        convert={createInputConversion(props.field.type)}
        renderer={renderers}
      />
    );
  });
}

export function createDefaultAdornmentRenderer(
  options: DefaultAdornmentRendererOptions = {},
): AdornmentRendererRegistration {
  return {
    type: "adornment",
    render: (props, renderers) => {
      if (isOptionalAdornment(props.adornment)) {
        throw new Error("Optional adornment not implemented for React Native");
      }
      const { adornment, designMode, dataContext, runExpression } = props;
      return {
        apply: (rl) => {
          if (isSetFieldAdornment(adornment) && runExpression) {
            return wrapLayout((x) => (
              <SetFieldWrapper
                children={x}
                parentContext={dataContext}
                adornment={adornment}
                runExpression={runExpression}
              />
            ))(rl);
          }
          if (isIconAdornment(adornment)) {
            const { I } = renderers.html;
            const { icon, placement, iconClass } = adornment;
            return appendMarkupAt(
              placement ?? AdornmentPlacement.ControlStart,
              <I
                className={iconClass}
                iconName={icon?.name}
                iconLibrary={icon?.library}
              />,
            )(rl);
          }
          if (isAccordionAdornment(adornment)) {
            return wrapLayout((x) => {
              const displayProps = isValidElement(rl.children)
                ? (rl.children as ReactElement as any).props?.displayProps
                : undefined;
              return (
                <DefaultAccordion
                  isGroup={false}
                  renderers={renderers}
                  children={x}
                  className={displayProps?.className}
                  titleTextClass={displayProps?.textClass}
                  title={renderers.renderLabelText(adornment.title)}
                  defaultExpanded={adornment.defaultExpanded}
                  contentStyle={rl.style}
                  contentClassName={rl.className}
                  designMode={designMode}
                  dataContext={dataContext}
                  options={options.accordion}
                />
              );
            })(rl);
          }
        },
        priority: 0,
        adornment,
      };
    },
  };
}

function SetFieldWrapper({
  children,
  adornment,
  parentContext,
  runExpression,
}: {
  children: ReactNode;
  adornment: SetFieldAdornment;
  parentContext: ControlDataContext;
  runExpression: RunExpression;
}) {
  const fieldNode = schemaDataForFieldRef(
    adornment.field,
    parentContext.parentNode,
  );
  const otherField = fieldNode.control;
  const always = !adornment.defaultOnly;
  const value = useExpression<any>(
    undefined,
    runExpression,
    adornment.expression,
    (x) => x,
  );

  useControlEffect(
    () => [value?.value, otherField?.value == null],
    ([v]) => {
      otherField?.setValue((x: any) => (always || x == null ? v : x));
    },
    true,
  );
  return children;
}

export function createDefaultLabelRenderer(
  options?: DefaultLabelRendererOptions,
): LabelRendererRegistration {
  const {
    className,
    controlLabelTextClass,
    groupLabelTextClass,
    groupLabelClass,
    controlLabelClass,
    textClass,
    labelContainer,
  } = {
    labelContainer: (c: ReactElement) => c,
    ...options,
  };
  return {
    render: (props, labelStart, labelEnd, renderers) => {
      const { Label, Span } = renderers.html;
      const requiredElement =
        options?.requiredElement ?? (({ Span }) => <Span> *</Span>);
      if (props.type == LabelType.Text) return <Span>{props.label}</Span>;
      return labelContainer(
        <>
          <Label
            htmlFor={props.forId}
            className={rendererClass(
              props.className,
              clsx(
                className,
                props.type === LabelType.Group && groupLabelClass,
                props.type === LabelType.Control && controlLabelClass,
              ),
            )}
            textClass={rendererClass(
              props.textClass,
              clsx(
                textClass,
                props.type === LabelType.Group && groupLabelTextClass,
                props.type === LabelType.Control && controlLabelTextClass,
              ),
            )}
          >
            {labelStart}
            {renderers.renderLabelText(props.label)}
            {props.required && requiredElement(renderers.html)}
          </Label>
          {labelEnd}
        </>,
      );
    },
    type: "label",
  };
}

export const StandardHtmlComponents: HtmlComponents = {
  Button: DefaultHtmlButtonRenderer,
  Label: DefaultHtmlLabelRenderer,
  I: DefaultHtmlIconRenderer,
  Span: "span",
  Div: DefaultHtmlDivRenderer,
  H1: "h1",
  B: "b",
  Input: DefaultHtmlInputRenderer,
  CheckButtons: HtmlCheckButtons,
};

export function DefaultHtmlButtonRenderer({
  inline,
  textClass,
  className,
  notWrapInText,
  androidRippleColor,
  onClick,
  nonTextContent,
  ...props
}: HtmlButtonProperties) {
  const Comp = inline ? "span" : nonTextContent ? "div" : "button";
  return (
    <Comp
      role={nonTextContent || inline ? "button" : undefined}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      className={nonTextContent ? className : clsx(className, textClass)}
      {...props}
    />
  );
}
export function DefaultHtmlInputRenderer({
  textClass,
  className,
  onChangeValue,
  onChangeChecked,
  inputRef,
  ...props
}: HtmlInputProperties) {
  return (
    <input
      ref={inputRef}
      {...props}
      className={clsx(className, textClass)}
      onChange={
        onChangeValue
          ? (e) => onChangeValue(e.target.value)
          : onChangeChecked
            ? (e) => onChangeChecked(e.target.checked)
            : undefined
      }
    />
  );
}
export function DefaultHtmlDivRenderer({
  text,
  html,
  children,
  className,
  textClass,
  nativeRef,
  inline,
  ...props
}: HtmlDivProperties) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      {...props}
      ref={nativeRef}
      className={clsx(className, textClass)}
      children={text ?? children}
      dangerouslySetInnerHTML={html ? { __html: html } : undefined}
    />
  );
}
export function DefaultHtmlLabelRenderer({
  textClass,
  className,
  ...props
}: HtmlLabelProperties) {
  return <label {...props} className={clsx(className, textClass)} />;
}
export function DefaultHtmlIconRenderer({
  iconName,
  iconLibrary,
  className,
  style,
}: HtmlIconProperties) {
  return iconName ? (
    <i className={clsx(className, toIconClass())} style={style} />
  ) : undefined;

  function toIconClass() {
    if (!iconName) return undefined;
    switch (iconLibrary) {
      case IconLibrary.FontAwesome:
        return "fa fa-" + iconName;
      case IconLibrary.Material:
      case IconLibrary.CssClass:
        return iconName;
      default:
        return iconLibrary + " fa-" + iconName;
    }
  }
}

export function createDefaultRenderers(
  options: DefaultRendererOptions = {},
): DefaultRenderers {
  return {
    data: createDefaultDataRenderer(options.data),
    display: createDefaultDisplayRenderer(options.display),
    action: createButtonActionRenderer(undefined, options.action),
    array: createDefaultArrayRenderer(options.array),
    group: createDefaultGroupRenderer(options.group, options.adornment as DefaultAdornmentRendererOptions),
    label: createDefaultLabelRenderer(options.label),
    adornment: createDefaultAdornmentRenderer(options.adornment as DefaultAdornmentRendererOptions),
    renderLayout: createDefaultLayoutRenderer(options.layout),
    visibility: createDefaultVisibilityRenderer(),
    extraRenderers: options.extraRenderers?.(options) ?? [],
    html: options.html ?? StandardHtmlComponents,
  };
}

export function createClassStyledRenderers() {
  return createDefaultRenderers({
    layout: { className: "control" },
    group: { className: "group" },
    array: { className: "control-array" },
    action: { buttonClass: "action" },
    data: { inputClass: "data" },
    display: { htmlClassName: "html", textClassName: "text" },
  });
}