import {
  createDataRenderer,
  DataRenderType,
  FieldType,
  getLastDefinedValue,
  getNullToggler,
} from "@react-typed-forms/schemas";

export function createNullToggleRenderer() {
  return createDataRenderer(
    ({ control, field, renderOptions, ...props }, renderers) => {
      const lastDefined = getLastDefinedValue(control);
      if (lastDefined.current.value == null)
        lastDefined.value = props.definition.defaultValue;
      const nullControl = getNullToggler(control);
      nullControl.disabled = props.readonly;
      return (layout) => {
        return renderers.renderData({
          ...props,
          control: nullControl,
          field: { ...field, type: FieldType.Bool },
          renderOptions: { type: DataRenderType.Checkbox },
        })(layout);
      };
    },
  );
}
