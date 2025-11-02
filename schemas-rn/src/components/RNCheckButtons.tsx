import { CheckButtonsProps, rendererClass } from "@react-typed-forms/schemas";
import { RenderArrayElements, useComputed } from "@react-typed-forms/core";
import React from "react";
import { clsx } from "clsx";

export function RNCheckButtons(props: CheckButtonsProps) {
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
    renderer,
  } = props;
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
              notWrapInText
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
                  onChangeChecked={(x) => {
                    !readonly && setChecked(control, o, x);
                  }}
                />
                <Label
                  className={classes.labelClass}
                  textClass={classes.labelClass}
                  htmlFor={name + "_" + i}
                >
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
