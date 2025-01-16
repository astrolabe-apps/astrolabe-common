import {
  buildSchema,
  ControlDefinitionExtension,
  createDataRenderer,
  DataRenderType,
  FieldOption,
  RenderOptions,
  schemaDataForFieldRef,
  schemaForFieldRef,
  SchemaNode,
  stringField,
} from "@react-typed-forms/schemas";
import React from "react";

export interface FieldSelectionRenderOptions extends RenderOptions {
  type: DataRenderType.FieldSelection;
  fieldRef?: string | null;
}

export const FieldSelectionExtension: ControlDefinitionExtension = {
  RenderOptions: {
    value: DataRenderType.FieldSelection,
    name: "Field Selection",
    fields: buildSchema<Omit<FieldSelectionRenderOptions, "type">>({
      fieldRef: stringField("Field Selection Reference"),
    }),
  },
};

export interface FieldSelectionOptions {}

export function createFieldSelectionRenderer(
  options: FieldSelectionOptions = {},
) {
  return createDataRenderer(
    (o, renderer) => {
      const options = o.options;
      console.log(options);
      // const { fieldRef } = o.renderOptions as ValueForFieldRenderOptions;
      // const actualFieldRef = fieldRef
      //   ? (schemaDataForFieldRef(fieldRef, o.dataContext.parentNode)?.control
      //       ?.value as string)
      //   : undefined;
      // const node = actualFieldRef
      //   ? schemaForFieldRef(actualFieldRef, options.schema)
      //   : undefined;
      console.log(o, renderer, options);
      return <div>This is field selection renderer</div>;
    },
    {
      renderType: DataRenderType.FieldSelection,
    },
  );
}
