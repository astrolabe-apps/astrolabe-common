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
} from "@react-typed-forms/schemas";
import { Control, Fcheckbox, newControl } from "@react-typed-forms/core";
import React, { ReactNode } from "react";

export interface OptionalRenderProps {
  allValues: Control<unknown[]>;
  editing: Control<boolean | undefined>;
  children: ReactNode;
  adornment: OptionalAdornment;
  nullToggler: Control<boolean>;
  dataContext: ControlDataContext;
  options: DefaultOptionalAdornmentOptions;
}
export interface DefaultOptionalAdornmentOptions {
  className?: string;
  checkClass?: string;
  childWrapperClass?: string;
  multiValuesClass?: string;
  multiValuesText?: string;
  nullWrapperClass?: string;
  setNullText?: string;
  defaultPlacement?: AdornmentPlacement;
  hideEdit?: boolean;
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
      if (isEditing === undefined && adornment.editSelectable)
        editing.value = false;
      dataControl.disabled =
        !isEditing || !!(adornment.allowNull && !nullToggler.value);
      return {
        apply: (rl) => {
          if (props.formOptions.readonly) return rl;
          if (!options.hideEdit && adornment.editSelectable)
            appendMarkupAt(
              adornment.placement ??
                options.defaultPlacement ??
                AdornmentPlacement.LabelStart,
              <Fcheckbox control={editing} className={options.checkClass} />,
            )(rl);
          wrapMarkup("children", (children) =>
            options.customRender ? (
              options.customRender({
                allValues: getAllValues(dataControl),
                editing,
                children,
                adornment,
                nullToggler,
                dataContext,
                options,
              })
            ) : (
              <OptionalEditRenderer
                children={children}
                options={options}
                editing={editing.as()}
                adornment={adornment}
                dataControl={dataControl}
              />
            ),
          )(rl);
        },
        priority: 0,
        adornment,
      };
    },
    { adornmentType: ControlAdornmentType.Optional },
  );
}

export function OptionalEditRenderer({
  children,
  options,
  adornment,
  editing,
  dataControl,
}: {
  options: DefaultOptionalAdornmentOptions;
  children: ReactNode;
  adornment: OptionalAdornment;
  editing: Control<boolean | undefined>;
  dataControl: Control<any>;
}) {
  const nullToggler = getNullToggler(dataControl);
  const allValues = getAllValues(dataControl);
  const multipleValues = allValues.value.length > 1;
  const nullEdit = adornment.allowNull ? (
    <div className={options.nullWrapperClass}>
      <Fcheckbox
        control={nullToggler}
        className={options.checkClass}
        notValue
      />
      <span>{options.setNullText ?? "Null"}</span>
    </div>
  ) : undefined;
  return (
    <div className={options.className}>
      {multipleValues && editing.value === false ? (
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
