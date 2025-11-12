import { CheckButtonsProps, rendererClass } from "@react-typed-forms/schemas";
import { RenderArrayElements, useComputed } from "@react-typed-forms/core";
import { clsx } from "clsx";
import React from "react";

export function HtmlCheckButtons(props: CheckButtonsProps) {
  const {
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
  } = props;
  const { disabled } = control;
  const name = "r" + control.uniqueId;
  return (
    <div role="group" className={className} id={id}>
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
                    !(readonly || disabled) &&
                      setChecked(control, o, x.target.checked);
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
