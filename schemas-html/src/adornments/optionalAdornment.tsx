import {
  AdornmentPlacement,
  AdornmentRendererRegistration,
  appendMarkupAt,
  ControlAdornmentType,
  ControlDataContext,
  createAdornmentRenderer,
  getAllValues,
  getIsEditing,
  OptionalAdornment,
  wrapMarkup,
} from "@react-typed-forms/schemas";
import { useControl, Fcheckbox, Control } from "@react-typed-forms/core";
import React, { ReactNode } from "react";

export interface DefaultOptionalAdornmentOptions {
  className?: string;
  childWrapperClass?: string;
  multiValuesClass?: string;
  multiValuesText?: string;
  renderMultiValues?: (allValues: Control<unknown[]>) => ReactNode;
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
  const dataControl = useControl(undefined, {
    use: dataContext.dataNode?.control,
  });
  const editing = getIsEditing(dataControl);
  const isEditing = editing.value;
  if (isEditing === undefined) editing.value = false;
  dataControl.disabled = !isEditing;
  if (!isEditing) dataControl.value = dataControl.initialValue;
  const allValues = getAllValues(dataControl);
  const multipleValues = allValues.value.length > 1;
  const renderMulti = options.renderMultiValues ?? stdRenderMultiValues;
  return (
    <div className={options.className}>
      <Fcheckbox control={editing} />
      {multipleValues && !isEditing ? (
        renderMulti(allValues)
      ) : (
        <div className={options.childWrapperClass}>{children}</div>
      )}
    </div>
  );

  function stdRenderMultiValues() {
    return (
      <div className={options.multiValuesClass}>
        {options.multiValuesText ?? "Differing values"}
      </div>
    );
  }
}
