import { Control, formControlProps } from "@react-typed-forms/core";
import React from "react";
import {
  CheckEntryClasses,
  CheckRendererOptions,
  ControlLayoutProps,
  createDataRenderer,
  DataRendererProps,
  DataRenderType,
  fieldOptionAdornment,
  FormRenderer,
  HtmlInputProperties,
  LabelType,
  rendererClass,
  setIncluded,
} from "@react-typed-forms/schemas";
import { useElementSelectedRenderer } from "@react-typed-forms/schemas";

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
export function createCheckboxRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (props, renderer) => (p) => ({
      ...p,
      label: p.label ? { ...p.label, type: LabelType.Inline } : undefined,
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
      label: p.label ? { ...p.label, type: LabelType.Inline } : undefined,
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
  props,
  renderer,
  options,
}: {
  p: ControlLayoutProps;
  props: DataRendererProps;
  renderer: FormRenderer;
  options: CheckRendererOptions;
}) {
  const selControl = useElementSelectedRenderer(props);
  return (
    <Fcheckbox
      id={props.id}
      control={selControl}
      style={props.style}
      className={rendererClass(props.className, options.checkClass)}
      renderer={renderer}
    />
  );
}

function CheckBox({
  props,
  renderer,
  options,
}: {
  p: ControlLayoutProps;
  props: DataRendererProps;
  renderer: FormRenderer;
  options: CheckRendererOptions;
}) {
  return (
    <Fcheckbox
      id={props.id}
      control={props.control.as()}
      style={props.style}
      className={rendererClass(props.className, options.checkClass)}
      renderer={renderer}
    />
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
