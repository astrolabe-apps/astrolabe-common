import { Control, newControl, useControlEffect } from "@react-typed-forms/core";
import React, { ReactNode } from "react";
import {
  createDataRenderer,
  DataRenderType,
  FieldType,
} from "@react-typed-forms/schemas";

export function createNullToggleRenderer() {
  return createDataRenderer(
    ({ control, field, renderOptions, ...props }, renderers) => {
      const nullControl = (control.meta["nullControl"] ??= newControl(
        control.current.value != null,
      ));
      return (layout) => {
        const newLayout = renderers.renderData({
          ...props,
          control: nullControl,
          field: { ...field, type: FieldType.Bool },
          renderOptions: { type: DataRenderType.Checkbox },
        })(layout);
        return {
          ...newLayout,
          children: (
            <NullWrapper
              control={control}
              nullControl={nullControl}
              children={newLayout.children}
              readonly={props.readonly}
              defaultValue={props.definition.defaultValue}
            />
          ),
        };
      };
    },
  );
}

function NullWrapper({
  children,
  nullControl,
  control,
  defaultValue,
  readonly,
}: {
  control: Control<any>;
  nullControl: Control<boolean>;
  children: ReactNode;
  readonly: boolean;
  defaultValue: any;
}) {
  useControlEffect(
    () => readonly,
    (r) => (nullControl.disabled = r),
    true,
  );
  useControlEffect(
    () => nullControl.value,
    (e) => {
      if (e) {
        control.value = nullControl.meta["nonNullValue"] ?? defaultValue;
      } else {
        nullControl.meta["nonNullValue"] = control.value;
        control.value = null;
      }
    },
  );
  return children;
}
