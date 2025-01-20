import {
  AdornmentPlacement,
  AdornmentRendererRegistration,
  appendMarkupAt,
  ControlAdornmentType,
  ControlDataContext,
  createAdornmentRenderer,
  OptionalAdornment,
  wrapMarkup,
} from "@react-typed-forms/schemas";
import { useControl, Fcheckbox } from "@react-typed-forms/core";
import React, { ReactNode } from "react";

export interface DefaultOptionalAdornmentOptions {
  className?: string;
  childWrapperClass?: string;
  multiValuesClass?: string;
  multiValuesText?: string;
}
export function createOptionalAdornment(
  options: DefaultOptionalAdornmentOptions = {},
): AdornmentRendererRegistration {
  return createAdornmentRenderer(
    ({ adornment, dataContext }, renderers) => {
      const { placement } = adornment as OptionalAdornment;
      return {
        apply: wrapMarkup("children", (children) => (
          <OptionalAdornmentCheck
            dataContext={dataContext}
            children={children}
            options={options}
          />
        )),
        priority: 0,
        adornment,
      };
    },
    { adornmentType: ControlAdornmentType.Optional },
  );
}

function OptionalAdornmentCheck({
  dataContext,
  children,
  options,
}: {
  options: DefaultOptionalAdornmentOptions;
  dataContext: ControlDataContext;
  children: ReactNode;
}) {
  const editing = useControl(false);
  const dataControl = useControl(undefined, {
    use: dataContext.dataNode?.control,
  });
  const isEditing = editing.value;
  dataControl.disabled = !isEditing;
  const multipleValues = !!dataControl.meta.changes;
  return (
    <div className={options.className}>
      <Fcheckbox control={editing} />
      {multipleValues && !isEditing ? (
        <span className={options.multiValuesClass}>
          {options.multiValuesText ?? "Multiple values"}
        </span>
      ) : (
        <div className={options.childWrapperClass}>{children}</div>
      )}
    </div>
  );
}
