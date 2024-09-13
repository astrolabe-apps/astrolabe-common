import {
  CheckButtons,
  ControlInput,
  createInputConversion,
  createSelectConversion,
  DataControlDefinition,
  DataRenderType,
  DefaultDataRendererOptions,
  DefaultDisplayOnly,
  DefaultRendererOptions,
  DisplayOnlyRenderOptions,
  FieldType,
  hasOptions,
  isDataGroupRenderer,
  isDisplayOnlyRenderer,
  isTextfieldRenderer,
  JsonataRenderer,
  rendererClass,
  SelectDataRenderer,
  setIncluded,
} from "@react-typed-forms/schemas";
import React from "react";
import { ControlRenderProps } from "./index";
import { Control, Fcheckbox } from "@react-typed-forms/core";

export function defaultRenderData(
  props: ControlRenderProps,
  data: DataControlDefinition,
  defaults: DefaultDataRendererOptions,
) {
  const { state, formOptions } = props;
  const {
    dataNode: {
      schema: { field },
      control,
      elementIndex,
    },
  } = props;
  const { renderer } = formOptions;
  const fieldType = field.type;
  const renderOptions = data.renderOptions ?? { type: DataRenderType.Standard };
  let renderType = renderOptions.type;
  if (renderType === DataRenderType.DisplayOnly) {
    return (
      <renderer.RenderLayout state={state} formOptions={formOptions}>
        {() =>
          control && (
            <DefaultDisplayOnly
              control={control}
              field={field}
              schemaInterface={formOptions.schemaInterface}
              className={state.fields.styleClass.value}
              style={state.fields.style.value}
              emptyText={(renderOptions as DisplayOnlyRenderOptions).emptyText}
            />
          )
        }
      </renderer.RenderLayout>
    );
  }
  // let renderType = renderOptions.type;
  if (
    field.collection &&
    elementIndex == null &&
    (renderType == DataRenderType.Standard ||
      renderType == DataRenderType.Array)
  ) {
    return (
      <renderer.RenderLayout state={state} formOptions={formOptions}>
        {() => {
          const {
            style: { value: style },
            addAction: { value: addAction },
            removeAction: { value: removeAction },
          } = state.fields;
          const { dataNode, formNode } = props;
          return control ? (
            renderer.renderArray({
              renderAction: renderer.renderAction,
              style,
              renderElement: (i) => (
                <formOptions.RenderForm
                  formOptions={formOptions}
                  formNode={formNode}
                  dataNode={dataNode.getChildElement(i)}
                  key={i}
                />
              ),
              arrayControl: control as Control<any[]>,
              addAction,
              removeAction,
            })
          ) : (
            <></>
          );
        }}
      </renderer.RenderLayout>
    );
  }
  // if (fieldType === FieldType.Compound) {
  //     const groupOptions = (isDataGroupRenderer(renderOptions)
  //         ? renderOptions.groupOptions
  //         : undefined) ?? { type: "Standard", hideTitle: true };
  //     return renderers.renderGroup({ ...props, renderOptions: groupOptions });
  // }
  // if (fieldType == FieldType.Any) return <>No control for Any</>;
  // if (isDisplayOnlyRenderer(renderOptions))
  //     return (p) => ({
  //         ...p,
  //         className: displayOnlyClass,
  //         children: (
  //             <DefaultDisplayOnly
  //                 field={props.field}
  //                 schemaInterface={props.dataContext.schemaInterface}
  //                 control={props.control}
  //                 className={props.className}
  //                 style={props.style}
  //                 emptyText={renderOptions.emptyText}
  //             />
  //         ),
  //     });
  // const isBool = fieldType === FieldType.Bool;
  // if (booleanOptions != null && isBool && props.options == null) {
  //     return renderers.renderData({ ...props, options: booleanOptions });
  // }
  // if (renderType === DataRenderType.Standard && hasOptions(props)) {
  //     return optionRenderer.render(props, renderers);
  // }
  // if (isTextfieldRenderer(renderOptions) && renderOptions.multiline)
  //     return multilineRenderer.render(props, renderers);
  //
  // const placeholder = isTextfieldRenderer(renderOptions)
  //     ? renderOptions.placeholder
  //     : undefined;
  //
  const { styleClass, style, id, readonly, options, required } = state.fields;
  const placeholder = undefined;
  return (
    <renderer.RenderLayout state={state} formOptions={formOptions}>
      {() => {
        return control ? renderMain(control) : <></>;

        function renderMain(control: Control<any>) {
          if (
            renderType == DataRenderType.Standard &&
            (options.value?.length ?? 0) > 0
          ) {
            renderType = DataRenderType.Dropdown;
          }

          switch (renderType) {
            case DataRenderType.NullToggle:
              return <>NULL</>;
            case DataRenderType.CheckList:
              const checkListOptions =
                defaults.checkListOptions ?? defaults.checkOptions;
              return (
                <CheckButtons
                  options={options.value ?? []}
                  {...checkListOptions}
                  className={rendererClass(
                    styleClass.value,
                    checkListOptions?.className,
                  )}
                  isChecked={(control, o) => {
                    const v = control.value;
                    return Array.isArray(v) ? v.includes(o.value) : false;
                  }}
                  setChecked={(c, o, checked) => {
                    c.setValue((x) => setIncluded(x ?? [], o.value, checked));
                  }}
                  control={control}
                  type="checkbox"
                />
              );
            case DataRenderType.Dropdown:
              const selectOptions = defaults.selectOptions ?? {};
              return (
                <SelectDataRenderer
                  className={rendererClass(
                    styleClass.value,
                    selectOptions.className,
                  )}
                  state={control}
                  id={id.value}
                  readonly={readonly.value}
                  options={options.value ?? []}
                  required={required.value}
                  emptyText={selectOptions.emptyText}
                  requiredText={selectOptions.requiredText}
                  convert={createSelectConversion(fieldType)}
                />
              );
            case DataRenderType.Radio:
              const radioOptions =
                defaults.radioOptions ?? defaults.checkOptions;
              return (
                <CheckButtons
                  options={options.value}
                  {...radioOptions}
                  className={rendererClass(
                    styleClass.value,
                    radioOptions?.className,
                  )}
                  isChecked={(control, o) => control.value == o.value}
                  setChecked={(c, o) => (c.value = o.value)}
                  control={control}
                  type="radio"
                />
              );
            case DataRenderType.Checkbox:
              const checkOptions =
                defaults.checkboxOptions ?? defaults.checkOptions;
              return (
                <div
                  className={rendererClass(
                    styleClass.value,
                    defaults.checkOptions?.entryClass,
                  )}
                >
                  <Fcheckbox
                    id={id.value}
                    control={control}
                    style={state.fields.style.value}
                    className={checkOptions?.checkClass}
                  />
                  {state.fields.title.value}
                  {/*{p.label &&*/}
                  {/*  renderer.renderLabel(p.label, undefined, undefined)}*/}
                </div>
              );
            // case DataRenderType.Jsonata:
            //   return <JsonataRenderer />
            default:
              return (
                <ControlInput
                  id={id.value}
                  className={rendererClass(
                    styleClass.value,
                    defaults.inputClass,
                  )}
                  style={style.value}
                  readOnly={readonly.value}
                  control={control}
                  placeholder={placeholder}
                  convert={createInputConversion(fieldType)}
                />
              );
          }
        }
      }}
    </renderer.RenderLayout>
  );
}
