import {
  Control,
  formControlProps,
  RenderArrayElements,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import React, { ReactNode, useEffect } from "react";
import {
  CheckButtonsProps,
  CheckEntryClasses,
  CheckRendererOptions,
  ControlLayoutProps,
  createDataRenderer,
  DataRendererProps,
  DataRenderType,
  ElementSelectedRenderOptions,
  FieldOption,
  fieldOptionAdornment,
  FormRenderer,
  HtmlInputProperties,
  rendererClass,
} from "@react-typed-forms/schemas";
import clsx from "clsx";

export function createRadioRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (p, renderer) => (
      <renderer.html.CheckButtons
        classes={options}
        controlClasses={p.renderOptions as CheckEntryClasses}
        {...p}
        className={rendererClass(p.className, options.className)}
        isChecked={(control, o) => control.value == o.value}
        setChecked={(c, o) => {
          c.setTouched(true);
          c.value = o.value;
        }}
        control={p.control}
        type="radio"
        entryAdornment={fieldOptionAdornment(p)}
        renderer={renderer}
      />
    ),
    {
      renderType: DataRenderType.Radio,
    },
  );
}

export function createCheckListRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (p, renderer) => (
      <renderer.html.CheckButtons
        classes={options}
        controlClasses={p.renderOptions as CheckEntryClasses}
        {...p}
        className={rendererClass(p.className, options.className)}
        isChecked={(control, o) => {
          const v = control.value;
          return Array.isArray(v) ? v.includes(o.value) : false;
        }}
        setChecked={(c, o, checked) => {
          c.setTouched(true);
          c.setValue((x) => setIncluded(x ?? [], o.value, checked));
        }}
        control={p.control}
        type="checkbox"
        entryAdornment={fieldOptionAdornment(p)}
        renderer={renderer}
      />
    ),
    {
      collection: true,
      renderType: DataRenderType.CheckList,
    },
  );
}
export function setIncluded<A>(array: A[], elem: A, included: boolean): A[] {
  const already = array.includes(elem);
  if (included === already) {
    return array;
  }
  if (included) {
    return [...array, elem];
  }
  return array.filter((e) => e !== elem);
}

export function createCheckboxRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (props, renderer) => (p) => ({
      ...p,
      label: undefined,
      children: (
        <CheckBox p={p} renderer={renderer} options={options} props={props} />
      ),
    }),
    { renderType: DataRenderType.Checkbox },
  );
}

export function createElementSelectedRenderer(
  options: CheckRendererOptions = {},
) {
  return createDataRenderer(
    (props, renderer) => (p) => ({
      ...p,
      label: undefined,
      children: (
        <CheckBoxSelected
          p={p}
          renderer={renderer}
          options={options}
          props={props}
        />
      ),
    }),
    {
      renderType: DataRenderType.ElementSelected,
    },
  );
}

function CheckBoxSelected({
  p,
  props,
  renderer,
  options,
}: {
  p: ControlLayoutProps;
  props: DataRendererProps;
  renderer: FormRenderer;
  options: CheckRendererOptions;
}) {
  const { Div } = renderer.html;
  const elementValue = useControl();
  useEffect(() => {
    props.runExpression(
      elementValue,
      (props.renderOptions as ElementSelectedRenderOptions).elementExpression,
      (v) => (elementValue.value = v as any),
    );
  });
  const isSelected = useComputed(
    () =>
      props.control
        .as<any[] | undefined>()
        .value?.includes(elementValue.current.value) ?? false,
  );
  const selControl = useControl(() => isSelected.current.value);
  selControl.value = isSelected.value;
  useControlEffect(
    () => selControl.value,
    (v) => {
      props.control
        .as<any[] | undefined>()
        .setValue((x) => setIncluded(x ?? [], elementValue.value, v));
    },
  );
  return (
    <Div className={rendererClass(props.className, options.entryClass)}>
      <Fcheckbox
        id={props.id}
        control={selControl}
        style={props.style}
        className={options.checkClass}
        renderer={renderer}
      />
      {p.label?.label && renderer.renderLabel(p.label, undefined, undefined)}
    </Div>
  );
}

function CheckBox({
  p,
  props,
  renderer,
  options,
}: {
  p: ControlLayoutProps;
  props: DataRendererProps;
  renderer: FormRenderer;
  options: CheckRendererOptions;
}) {
  const { Div } = renderer.html;
  return (
    <Div className={rendererClass(props.className, options.entryClass)}>
      <Fcheckbox
        id={props.id}
        control={props.control.as()}
        style={props.style}
        className={options.checkClass}
        renderer={renderer}
      />
      {p.label && renderer.renderLabel(p.label, undefined, undefined)}
    </Div>
  );
}

export function Fcheckbox({
  control,
  type = "checkbox",
  notValue = false,
  renderer,
  ...others
}: HtmlInputProperties & {
  control: Control<boolean | null | undefined>;
  renderer: FormRenderer;
  notValue?: boolean;
}) {
  const { Input } = renderer.html;
  const { value, onChange, errorText, ref, ...theseProps } =
    formControlProps(control);
  return (
    <Input
      {...theseProps}
      checked={!!value !== notValue}
      inputRef={(r) => (control.element = r)}
      onChangeChecked={(e) => {
        control.touched = true;
        control.value = e !== notValue;
      }}
      type={type}
      {...others}
    />
  );
}
