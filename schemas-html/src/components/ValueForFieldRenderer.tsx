import { Control, setFields, useControl } from "@react-typed-forms/core";
import {
  addMissingControlsForSchema,
  buildSchema,
  ControlDefinitionExtension,
  createDataRenderer,
  FormRenderer,
  groupedControl,
  makeSchemaDataNode,
  RenderOptions,
  rootSchemaNode,
  schemaDataForFieldRef,
  schemaForFieldRef,
  SchemaNode,
  stringField,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import React, { useMemo } from "react";

export interface ValueForFieldRenderOptions extends RenderOptions {
  type: "ValueForField";
  fieldRef?: string | null;
}

const RenderType = "ValueForField";

export const ValueForFieldExtension: ControlDefinitionExtension = {
  RenderOptions: {
    value: RenderType,
    name: "Value For Field",
    fields: buildSchema<Omit<ValueForFieldRenderOptions, "type">>({
      fieldRef: stringField("Field Reference"),
    }),
  },
};

export interface ValueForFieldOptions {
  schema: SchemaNode;
}

export function createValueForFieldRenderer(options: ValueForFieldOptions) {
  return createDataRenderer(
    (o, renderer) => {
      const { fieldRef } = o.renderOptions as ValueForFieldRenderOptions;
      const actualFieldRef = fieldRef
        ? (schemaDataForFieldRef(fieldRef, o.dataContext.parentNode)?.control
            ?.value as string)
        : undefined;
      const node = actualFieldRef
        ? schemaForFieldRef(actualFieldRef, options.schema)
        : undefined;
      return node ? (
        <ValueForField renderer={renderer} schema={node} control={o.control} />
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
}: {
  schema: SchemaNode;
  renderer: FormRenderer;
  control: Control<any>;
}) {
  const field = schema.field.field;
  const value = useControl<Record<string, any>>({}, undefined, (e) =>
    setFields(e, { [field]: control }),
  );
  const controls = useMemo(
    () => addMissingControlsForSchema(rootSchemaNode([schema.field]), []),
    [schema],
  );
  const Render = useControlRendererComponent(
    groupedControl(controls),
    renderer,
    { disabled: control.disabled },
    makeSchemaDataNode(schema.parent!, value),
  );
  return <Render />;
}
