import {
  Control,
  FcheckboxProps,
  formControlProps,
  RenderArrayElements,
  useComputed,
} from "@react-typed-forms/core";
import React, { ReactNode } from "react";
import {
  CheckEntryClasses,
  ControlLayoutProps,
  createDataRenderer,
  DataRendererProps,
  DataRenderType,
  FieldOption,
  fieldOptionAdornment,
  FormRenderer,
  rendererClass,
} from "@react-typed-forms/schemas";
import clsx from "clsx";

export interface CheckRendererOptions {
  className?: string;
  entryClass?: string;
  checkClass?: string;
  labelClass?: string;
  entryWrapperClass?: string;
  selectedClass?: string;
  notSelectedClass?: string;
}
export function createRadioRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (p, renderer) => (
      <CheckButtons
        classes={options}
        controlClasses={p.renderOptions as CheckEntryClasses}
        {...p}
        className={rendererClass(p.className, options.className)}
        isChecked={(control, o) => control.value == o.value}
        setChecked={(c, o) => (c.value = o.value)}
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
      <CheckButtons
        classes={options}
        controlClasses={p.renderOptions as CheckEntryClasses}
        {...p}
        className={rendererClass(p.className, options.className)}
        isChecked={(control, o) => {
          const v = control.value;
          return Array.isArray(v) ? v.includes(o.value) : false;
        }}
        setChecked={(c, o, checked) => {
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

export interface CheckButtonsProps {
  id?: string;
  className?: string;
  options?: FieldOption[] | null;
  control: Control<any>;
  classes: CheckRendererOptions;
  controlClasses?: CheckEntryClasses;
  readonly?: boolean;
  type: "checkbox" | "radio";
  isChecked: (c: Control<any>, o: FieldOption) => boolean;
  setChecked: (c: Control<any>, o: FieldOption, checked: boolean) => void;
  entryAdornment?: (c: FieldOption, i: number, selected: boolean) => ReactNode;
}

export function CheckButtons({
  control,
  options,
  readonly,
  className,
  id,
  type,
  isChecked,
  setChecked,
  entryAdornment,
  classes,
  controlClasses = {},
  renderer,
}: CheckButtonsProps & { renderer: FormRenderer }) {
  const { Button, Input, Label, Div } = renderer.html;
  const { disabled } = control;
  const name = "r" + control.uniqueId;
  return (
    <Div className={className} id={id}>
      <RenderArrayElements array={options?.filter((x) => x.value != null)}>
        {(o, i) => {
          const checked = useComputed(() => isChecked(control, o)).value;
          const selOrUnsel = checked
            ? rendererClass(
                controlClasses?.selectedClass,
                classes.selectedClass,
              )
            : rendererClass(
                controlClasses?.notSelectedClass,
                classes.notSelectedClass,
              );
          return (
            <Button
              className={clsx(
                rendererClass(
                  controlClasses?.entryWrapperClass,
                  classes.entryWrapperClass,
                ),
                selOrUnsel,
              )}
              onClick={() => !readonly && setChecked(control, o, !checked)}
            >
              <Div className={classes.entryClass}>
                <Input
                  id={name + "_" + i}
                  className={classes.checkClass}
                  type={type}
                  name={name}
                  readOnly={readonly}
                  disabled={disabled}
                  checked={checked}
                  onChange={(x) => {
                    !readonly && setChecked(control, o, x.target.checked);
                  }}
                />
                <Label className={classes.labelClass} htmlFor={name + "_" + i}>
                  {o.name}
                </Label>
              </Div>
              {entryAdornment?.(o, i, checked)}
            </Button>
          );
        }}
      </RenderArrayElements>
    </Div>
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
}: FcheckboxProps & { renderer: FormRenderer }) {
  const { Input } = renderer.html;
  const { value, onChange, errorText, ...theseProps } =
    formControlProps(control);
  return (
    <Input
      {...theseProps}
      checked={!!value !== notValue}
      ref={(r) => (control.element = r)}
      onChange={(e) => {
        control.touched = true;
        control.value = e.target.checked !== notValue;
      }}
      type={type}
      {...others}
    />
  );
}
