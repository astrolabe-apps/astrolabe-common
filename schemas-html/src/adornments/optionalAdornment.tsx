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
  DefaultOptionalAdornmentOptions,
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
  dataControl: Control<any>;
}

// Interfaces moved to @react-typed-forms/schemas
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
          if (props.formNode.readonly) return rl;
          if (!options.hideEdit && adornment.editSelectable)
            appendMarkupAt(
              adornment.placement ??
                options.defaultPlacement ??
                AdornmentPlacement.LabelStart,
              <Fcheckbox control={editing} className={options.checkClass} />,
            )(rl);
          wrapMarkup("children", (children) => {
            const props = {
              allValues: getAllValues(dataControl),
              editing,
              children,
              adornment,
              nullToggler,
              dataContext,
              options,
              dataControl,
            };
            return options.customRender ? (
              options.customRender(props)
            ) : (
              <OptionalEditRenderer {...props} />
            );
          })(rl);
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
  renderMultiValues,
  allValues,
  nullToggler,
}: OptionalRenderProps & {
  renderMultiValues?: (allValues: Control<unknown[]>) => ReactNode;
}) {
  renderMultiValues ??= () => options.multiValuesText ?? "Differing values";
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
          {renderMultiValues(allValues)}
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
