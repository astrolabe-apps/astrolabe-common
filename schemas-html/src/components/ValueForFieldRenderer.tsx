import { Control, setFields, useControl } from "@react-typed-forms/core";
import {
  boolField,
  buildSchema,
  ControlDefinitionExtension,
  createDataRenderer,
  defaultControlForField,
  emptySchemaLookup,
  FormRenderer,
  makeSchemaDataNode,
  RenderOptions,
  rootSchemaNode,
  schemaDataForFieldRef,
  schemaForFieldRef,
  SchemaNode,
  stringField,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import React, { Fragment, useMemo } from "react";

export interface ValueForFieldRenderOptions extends RenderOptions {
  type: "ValueForField";
  fieldRef?: string | null;
  noOptions?: boolean;
}

const RenderType = "ValueForField";

export const ValueForFieldExtension: ControlDefinitionExtension = {
  RenderOptions: {
    value: RenderType,
    name: "Value For Field",
    fields: buildSchema<Omit<ValueForFieldRenderOptions, "type">>({
      fieldRef: stringField("Field Reference"),
      noOptions: boolField("No Options"),
    }),
  },
};

export interface ValueForFieldOptions {
  schema: SchemaNode;
}

export function createValueForFieldRenderer(options: ValueForFieldOptions) {
  return createDataRenderer(
    (o, renderer) => {
      const { fieldRef, noOptions } =
        o.renderOptions as ValueForFieldRenderOptions;
      const actualFieldRef = fieldRef
        ? (schemaDataForFieldRef(fieldRef, o.dataContext.parentNode)?.control
            ?.value as string)
        : ".";
      const node = actualFieldRef
        ? schemaForFieldRef(actualFieldRef, options.schema)
        : undefined;
      return node ? (
        <ValueForField
          renderer={renderer}
          schema={node}
          control={o.control}
          noOptions={noOptions}
        />
      ) : (
        <>{actualFieldRef ? "No schema node for " + actualFieldRef : ""}</>
      );
    },
    {
      renderType: RenderType,
    },
  );
}

function ValueForField({
  schema,
  renderer,
  control,
  noOptions,
}: {
  schema: SchemaNode;
  renderer: FormRenderer;
  control: Control<any>;
  noOptions?: boolean;
}) {
  const value = useControl({ default: undefined }, undefined, (e) =>
    setFields(e, { default: control }),
  );
  const [controls, rootSchema] = useMemo(() => {
    const adjustedField = {
      ...schema.field,
      options: noOptions ? undefined : schema.field.options,
      field: "default",
      required: false,
      notNullable: false,
      onlyForTypes: null,
      defaultValue: undefined,
    };
    const control = {
      ...defaultControlForField(adjustedField),
      hideTitle: true,
    };
    const rootSchema = rootSchemaNode([control], emptySchemaLookup);
    return [control, rootSchema];
  }, [schema]);

  const Render = useControlRendererComponent(
    controls,
    renderer,
    { disabled: control.disabled },
    makeSchemaDataNode(rootSchema, value),
  );
  return <Render />;
}
