import { createDefaultDisplayRenderer } from "./components/DefaultDisplay";
import { createDefaultLayoutRenderer } from "./components/DefaultLayout";
import { createDefaultVisibilityRenderer } from "./components/DefaultVisibility";
import React, {
  Fragment,
  isValidElement,
  ReactElement,
  ReactNode,
} from "react";
import {
  Text,
  View,
  Pressable,
  StyleProp,
  ViewStyle,
  Role,
} from "react-native";
import clsx from "clsx";
import { Icon } from "./components/Icon";
import { RNRadioItem } from "./components/RNRadioItem";
import { RNTextInput } from "./components/RNTextInputRenderer";
import { RNHtmlRenderer } from "./components/RNHtmlRenderer";
import { RNCheckButtons } from "./components/RNCheckButtons";
import { RNCheckbox } from "./components/RNCheckboxRenderer";
import { HTMLAttributes } from "react";
import {
  HtmlButtonProperties,
  HtmlDivProperties,
  HtmlIconProperties,
  HtmlInputProperties,
  HtmlComponents,
  IconLibrary,
} from "@react-typed-forms/schemas";
import { createRNSelectRenderer } from "./components/RNSelectRenderer";
import { createRNCheckboxRenderer } from "./components/RNCheckboxRenderer";
import { createRNTextInputRenderer } from "./components/RNTextInputRenderer";
import {
  createRNScrollListRenderer,
  ExtendedDefaultScrollListOptions,
} from "./components/RNScrollListRenderer";
import { createRNDateTimePickerRenderer } from "./components/RNDateTimePickerRenderer";
import { Platform } from "react-native";
import { DefaultDisplayOnly } from "./components/DefaultDisplayOnly";
import { useControlEffect } from "@react-typed-forms/core";
import { ControlInput, createInputConversion } from "./components/ControlInput";
import {
  createDefaultArrayDataRenderer,
  createDefaultArrayRenderer,
} from "./components/DefaultArrayRenderer";
import {
  createCheckListRenderer,
  createElementSelectedRenderer,
  createRadioRenderer,
} from "./components/CheckRenderer";
import { DefaultAccordion } from "./components/DefaultAccordion";
import { createNullToggleRenderer } from "./components/NullToggle";
import {
  AdornmentPlacement,
  AdornmentRendererRegistration,
  appendMarkupAt,
  ControlDataContext,
  createDataRenderer,
  DataRendererRegistration,
  DataRenderType,
  DefaultRenderers,
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
  RunExpression,
  schemaDataForFieldRef,
  SetFieldAdornment,
  useExpression,
  wrapLayout,
} from "@react-typed-forms/schemas";
import {
  DefaultRendererOptions,
  DefaultDataRendererOptions,
  DefaultLabelRendererOptions,
  DefaultBoolOptions,
  DefaultAdornmentRendererOptions,
} from "./rendererOptions";
import { createDefaultGroupRenderer } from "./components/DefaultGroupRenderer";
import { createButtonActionRenderer } from "./createButtonActionRenderer";

export function createDefaultDataRenderer(
  options: DefaultDataRendererOptions = {},
): DataRendererRegistration {
  const elementSelectedRenderer = createElementSelectedRenderer(
    options.checkboxOptions ?? options.checkOptions,
  );
  const nullToggler = createNullToggleRenderer();
  // Use RN-specific renderers directly
  const checkboxRenderer = createRNCheckboxRenderer(
    options.checkboxOptions ?? options.checkOptions,
  );
  const selectRenderer = createRNSelectRenderer(options.selectOptions);
  const radioRenderer = createRadioRenderer(
    options.radioOptions ?? options.checkOptions,
  );
  const checkListRenderer = createCheckListRenderer(
    options.checkListOptions ?? options.checkOptions,
  );
  const { booleanOptions, optionRenderer, displayOnlyClass, defaultEmptyText } =
    {
      optionRenderer: selectRenderer,
      booleanOptions: DefaultBoolOptions,
      ...options,
    };
  const arrayRenderer = createDefaultArrayDataRenderer(options.arrayOptions);

  const scrollListRenderer = createRNScrollListRenderer(
    options.scrollListOptions as ExtendedDefaultScrollListOptions,
  );

  // Add RN-specific text input renderer
  const textInputRenderer = createRNTextInputRenderer(
    options.inputClass,
    options.inputTextClass,
  );

  // Add RN datetime picker for non-web platforms
  const dateTimeRenderer =
    Platform.OS !== "web" ? createRNDateTimePickerRenderer(options) : null;

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
        throw new Error(
          "ArrayElement renderer not implemented for React Native",
        );
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
        throw new Error("Jsonata renderer not implemented for React Native");
      case DataRenderType.Autocomplete:
        throw new Error(
          "Autocomplete renderer not implemented for React Native",
        );
      case DataRenderType.ElementSelected:
        return elementSelectedRenderer.render(props, renderers);
    }

    // Handle DateTime fields with RN-specific datetime picker (if available)
    if (
      (fieldType === FieldType.Date || fieldType === FieldType.DateTime) &&
      dateTimeRenderer
    ) {
      return dateTimeRenderer.render(props, renderers);
    }

    if (fieldType == FieldType.Any) {
      return (
        <>
          Can't render field: {field.displayName ?? field.field} ({renderType})
        </>
      );
    }
    // Use RN text input renderer for explicit textfield renderers
    if (isTextfieldRenderer(renderOptions)) {
      return textInputRenderer.render(props, renderers);
    }

    // Use ControlInput for default inputs (handles numbers, etc.)
    return (
      <ControlInput
        className={rendererClass(props.className, options.inputClass)}
        textClass={rendererClass(props.textClass, options.inputTextClass)}
        style={props.style}
        id={props.id}
        errorId={props.errorId}
        readOnly={props.readonly}
        control={props.control}
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

// React Native HTML Components Implementation
function RNIcon({ iconName, className, iconLibrary }: HtmlIconProperties) {
  return iconName ? (
    <Icon
      name={iconName}
      className={className}
      iconLibrary={iconLibrary as IconLibrary}
    />
  ) : undefined;
}

function RNSpan(props: HTMLAttributes<HTMLElement>) {
  return <Text {...(props as any)} />;
}

function RNButton({
  inline,
  textClass,
  children,
  notWrapInText,
  androidRippleColor,
  nonTextContent,
  onClick,
  ...props
}: HtmlButtonProperties) {
  if (inline) {
    return (
      <Text
        {...(props as any)}
        className={textClass}
        onPress={onClick as any}
        children={children}
      />
    );
  }
  return (
    <Pressable
      {...(props as any)}
      onPress={() => {
        onClick?.();
      }}
      android_ripple={{
        color: androidRippleColor,
      }}
    >
      {notWrapInText || nonTextContent ? (
        children
      ) : (
        <Text className={textClass}>{children}</Text>
      )}
    </Pressable>
  );
}

function RNLabel({
  className,
  html,
  children,
  textClass,
  text,
  style,
  inline,
  role,
  ...props
}: HtmlDivProperties) {
  return (
    <View
      className={className}
      style={style as StyleProp<ViewStyle>}
      role={role as Role}
      {...props}
    >
      <Text className={textClass}>{children}</Text>
    </View>
  );
}

function RNDiv({
  className,
  html,
  children,
  textClass,
  text,
  style,
  inline,
  role,
  ...props
}: HtmlDivProperties) {
  if (html != null) {
    return <RNHtmlRenderer {...props} html={html} />;
  }
  if (inline) {
    return (
      <Text style={style as StyleProp<ViewStyle>} className={textClass}>
        {text ?? children}
      </Text>
    );
  }
  if (text != null) {
    return (
      <View
        className={className}
        style={style as StyleProp<ViewStyle>}
        role={role as Role}
        {...props}
      >
        <Text className={textClass}>{text}</Text>
      </View>
    );
  }
  return (
    <View
      className={className}
      style={style as StyleProp<ViewStyle>}
      children={children}
      role={role as Role}
      {...props}
    />
  );
}

function RNInput(props: HtmlInputProperties) {
  const { id, type, onChangeValue, onChangeChecked, checked, value, ...rest } =
    props;
  switch (type) {
    case "radio":
      return (
        <RNRadioItem
          {...(rest as any)}
          checked={!!checked}
          onChange={() => onChangeChecked?.(!checked)}
        />
      );
    case "checkbox":
      return (
        <RNCheckbox
          key={id}
          {...(rest as any)}
          checked={!!checked}
          onCheckedChange={() => onChangeChecked?.(!checked)}
        />
      );
    default:
      return (
        <RNTextInput
          {...(rest as any)}
          defaultValue={typeof value == "number" ? value.toString() : value}
          onChangeText={(t) => onChangeValue?.(t)}
        />
      );
  }
}

// React Native HTML Components
export const ReactNativeHtmlComponents: HtmlComponents = {
  I: RNIcon,
  B: RNSpan,
  Button: RNButton,
  Label: RNLabel,
  Span: RNSpan,
  H1: RNSpan,
  Div: RNDiv,
  Input: RNInput,
  CheckButtons: RNCheckButtons,
};

export function createDefaultRenderers(
  options: DefaultRendererOptions = {},
): DefaultRenderers {
  return {
    data: createDefaultDataRenderer(options.data),
    display: createDefaultDisplayRenderer(options.display),
    action: createButtonActionRenderer(undefined, options.action),
    array: createDefaultArrayRenderer(options.array),
    group: createDefaultGroupRenderer(options.group, options.adornment),
    label: createDefaultLabelRenderer(options.label),
    adornment: createDefaultAdornmentRenderer(options.adornment),
    renderLayout: createDefaultLayoutRenderer(options.layout),
    visibility: createDefaultVisibilityRenderer(),
    extraRenderers: options.extraRenderers?.(options) ?? [],
    html: options.html ?? ReactNativeHtmlComponents,
  };
}
