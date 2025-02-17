import {
  Control,
  FcheckboxProps,
  formControlProps,
  RenderArrayElements,
  useComputed,
} from "@react-typed-forms/core";
// noinspection ES6UnusedImports
import React, { ReactNode, createElement as h } from "react";
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
  const h = renderer.h;
  const { disabled } = control;
  const name = "r" + control.uniqueId;
  return (
    <div className={className} id={id}>
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
            <div
              className={clsx(
                rendererClass(
                  controlClasses?.entryWrapperClass,
                  classes.entryWrapperClass,
                ),
                selOrUnsel,
              )}
              onClick={() => !readonly && setChecked(control, o, !checked)}
            >
              <div className={classes.entryClass}>
                <input
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
                <label className={classes.labelClass} htmlFor={name + "_" + i}>
                  {o.name}
                </label>
              </div>
              {entryAdornment?.(o, i, checked)}
            </div>
          );
        }}
      </RenderArrayElements>
    </div>
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
  const h = renderer.h;
  return (
    <div className={rendererClass(props.className, options.entryClass)}>
      <Fcheckbox
        id={props.id}
        control={props.control.as()}
        style={props.style}
        className={options.checkClass}
        renderer={renderer}
      />
      {p.label && renderer.renderLabel(p.label, undefined, undefined)}
    </div>
  );
}

export function Fcheckbox({
  control,
  type = "checkbox",
  notValue = false,
  renderer,
  ...others
}: FcheckboxProps & { renderer: FormRenderer }) {
  const h = renderer.h;
  // Update the HTML5 custom validity whenever the error message is changed/cleared
  // useControlEffect(
  //   () => control.error,
  //   (s) => (control.element as HTMLInputElement)?.setCustomValidity(s ?? ""),
  // );
  const { value, onChange, errorText, ...theseProps } =
    formControlProps(control);
  return (
    <input
      {...theseProps}
      checked={!!value !== notValue}
      ref={(r) => {
        control.element = r;
        // if (r) r.setCustomValidity(control.current.error ?? "");
      }}
      onChange={(e) => (control.value = e.target.checked !== notValue)}
      type={type}
      {...others}
    />
  );
}
