import {
  Control,
  setFields,
  trackedValue,
  useControl,
} from "@react-typed-forms/core";
import {
  boolField,
  buildSchema,
  ControlDefinitionExtension,
  createDataRenderer,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  DataControlDefinition,
  defaultControlForField,
  FormRenderer,
  RenderForm,
  RenderOptions,
  schemaDataForFieldRef,
  SchemaField,
  schemaForFieldRef,
  SchemaNode,
  stringField,
} from "@react-typed-forms/schemas";
import React, { Fragment, useMemo } from "react";

export interface ValueForFieldRenderOptions extends RenderOptions {
  type: "ValueForField";
  fieldRef?: string | null;
  noOptions?: boolean;
  refIsDirect?: boolean;
}

const RenderType = "ValueForField";

export const ValueForFieldExtension: ControlDefinitionExtension = {
  RenderOptions: {
    value: RenderType,
    name: "Value For Field",
    fields: buildSchema<Omit<ValueForFieldRenderOptions, "type">>({
      fieldRef: stringField("Field Reference"),
      noOptions: boolField("No Options"),
      refIsDirect: boolField("Reference is direct"),
    }),
  },
};

export interface ValueForFieldOptions {
  schema: SchemaNode;
}

export function createValueForFieldRenderer(options: ValueForFieldOptions) {
  return createDataRenderer(
    (o, renderer) => {
      const { fieldRef, noOptions, refIsDirect } =
        o.renderOptions as ValueForFieldRenderOptions;
      const actualFieldRef = fieldRef
        ? refIsDirect
          ? fieldRef
          : (schemaDataForFieldRef(fieldRef, o.dataContext.parentNode)?.control
              ?.value as string)
        : ".";
      let schemaField: SchemaField | undefined;
      if (refIsDirect) {
        const dataNode = schemaDataForFieldRef(
          actualFieldRef,
          o.dataContext.parentNode,
        );
        schemaField = trackedValue(dataNode.control.as<SchemaField>());
      } else {
        schemaField = actualFieldRef
          ? schemaForFieldRef(actualFieldRef, options.schema).field
          : undefined;
      }
      return schemaField ? (
        <ValueForField
          renderer={renderer}
          schemaField={schemaField}
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
  schemaField,
  renderer,
  control,
  noOptions,
}: {
  schemaField: SchemaField;
  renderer: FormRenderer;
  control: Control<any>;
  noOptions?: boolean;
}) {
  const value = useControl({ default: undefined }, undefined, (e) =>
    setFields(e, { default: control }),
  );
  const [controls, rootSchema] = useMemo(() => {
    const adjustedField: SchemaField = {
      ...schemaField,
      collection: noOptions ? false : schemaField.collection,
      options: noOptions ? undefined : schemaField.options,
      field: "default",
      required: false,
      notNullable: false,
      onlyForTypes: null,
      defaultValue: undefined,
    };
    const control: DataControlDefinition = {
      ...defaultControlForField(adjustedField),
      hideTitle: true,
    };
    const rootSchema = createSchemaTree([adjustedField]).rootNode;
    return [createFormTree([control]), rootSchema];
  }, [schemaField]);

  return (
    <RenderForm
      form={controls.rootNode}
      renderer={renderer}
      data={createSchemaDataNode(rootSchema, value)}
      options={{ disabled: control.disabled }}
    />
  );
}
