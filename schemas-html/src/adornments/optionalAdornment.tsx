import {
  AdornmentPlacement,
  AdornmentRendererRegistration,
  appendMarkupAt,
  ControlAdornmentType,
  ControlDataContext,
  createAdornmentRenderer,
  getAllValues,
  getIsEditing,
  getNullToggler,
  OptionalAdornment,
  wrapMarkup,
  wrapMarkupAt,
} from "@react-typed-forms/schemas";
import {
  useControl,
  Fcheckbox,
  Control,
  newControl,
} from "@react-typed-forms/core";
import React, { ReactNode } from "react";

export interface OptionalRenderProps {
  allValues: Control<unknown[]>;
  editing: Control<boolean>;
  children: ReactNode;
  adornment: OptionalAdornment;
  nullToggler: Control<boolean>;
}
export interface DefaultOptionalAdornmentOptions {
  className?: string;
  checkClass?: string;
  childWrapperClass?: string;
  multiValuesClass?: string;
  multiValuesText?: string;
  nullWrapperClass?: string;
  setNullText?: string;
  customRender?: (props: OptionalRenderProps) => ReactNode;
}
export function createOptionalAdornment(
  options: DefaultOptionalAdornmentOptions = {},
): AdornmentRendererRegistration {
  return createAdornmentRenderer(
    (props, renderers) => {
      const { dataContext } = props;
      const dataControl =
        dataContext.dataNode?.control ?? newControl(undefined);
      const adornment = props.adornment as OptionalAdornment;
      const editing = getIsEditing(dataControl);
      const isEditing = editing.value;
      const nullToggler = getNullToggler(dataControl);
      if (isEditing === undefined) editing.value = false;
      dataControl.disabled =
        !isEditing || !!(adornment.allowNull && !nullToggler.value);
      return {
        apply: (rl) => {
          appendMarkupAt(
            adornment.placement ?? AdornmentPlacement.LabelStart,
            <Fcheckbox control={editing} className={options.checkClass} />,
          )(rl);
          wrapMarkup("children", (children) => (
            <OptionalValue
              dataContext={dataContext}
              children={children}
              options={options}
              editing={editing}
              adornment={adornment}
              dataControl={dataControl}
            />
          ))(rl);
        },
        priority: 0,
        adornment,
      };
    },
    { adornmentType: ControlAdornmentType.Optional },
  );
}

function OptionalValue({
  dataContext,
  children,
  options,
  adornment,
  editing,
  dataControl,
}: {
  options: DefaultOptionalAdornmentOptions;
  dataContext: ControlDataContext;
  children: ReactNode;
  adornment: OptionalAdornment;
  editing: Control<boolean | undefined>;
  dataControl: Control<any>;
}) {
  const nullToggler = getNullToggler(dataControl);
  const isEditing = !!editing.value;
  const allValues = getAllValues(dataControl);
  if (options.customRender)
    return options.customRender({
      allValues,
      editing: editing.as(),
      children,
      adornment,
      nullToggler,
    });
  const multipleValues = allValues.value.length > 1;
  const nullEdit = adornment.allowNull ? (
    <div className={options.nullWrapperClass}>
      <input
        type="checkbox"
        className={options.checkClass}
        checked={!nullToggler.value}
        onChange={(e) => (nullToggler.value = !e.target.checked)}
      />
      <span>{options.setNullText ?? "Set to null"}</span>
    </div>
  ) : undefined;
  return (
    <div className={options.className}>
      {multipleValues && !isEditing ? (
        <div className={options.multiValuesClass}>
          {options.multiValuesText ?? "Differing values"}
        </div>
      ) : (
        <div className={options.childWrapperClass}>
          {nullEdit}
          {children}
        </div>
      )}
    </div>
  );
}
