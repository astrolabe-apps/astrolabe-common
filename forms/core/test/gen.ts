import fc, { Arbitrary } from "fast-check";
import {
  ActionControlDefinition,
  CompoundField,
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  DisplayControlDefinition,
  DisplayDataType,
  GroupedControlsDefinition,
  GroupRenderType,
  isCompoundField,
  SchemaField,
} from "../src";
import { rootCompound } from "./gen-schema";

export interface ControlAndSchema<
  C extends ControlDefinition = ControlDefinition,
> {
  control: C;
  schema: SchemaField;
}

export function arbitraryAction(): Arbitrary<ActionControlDefinition> {
  return fc.string().map((x) => ({
    type: ControlDefinitionType.Action,
    actionId: x,
  }));
}

export function fieldReference(
  field: SchemaField,
): Arbitrary<[string, SchemaField]> {
  if (isCompoundField(field))
    return fc.constantFrom(...field.children).map((x) => [x.field, x]);
  return fc.constant([".", field]);
}

export function arbitraryData(
  currentContext: SchemaField,
): Arbitrary<ControlAndSchema<DataControlDefinition>> {
  return fieldReference(currentContext).chain(([field, schema]) => {
    const children = isCompoundField(schema)
      ? fc.oneof(
          { depthIdentifier: "tree", depthSize: "small" },
          fc.constant([]),
          fc.array(
            arbitraryControl(schema).map((x) => x.control),
            { depthIdentifier: "tree" },
          ),
        )
      : fc.constant(undefined);
    return children.map((c) => ({
      control: {
        type: ControlDefinitionType.Data,
        field,
        renderOptions: { type: DataRenderType.Standard },
        children: c,
      },
      schema,
    }));
  });
}

export function arbitraryDisplay(): Arbitrary<DisplayControlDefinition> {
  return fc
    .constantFrom(DisplayDataType.Html, DisplayDataType.Text)
    .map((x) => ({
      type: ControlDefinitionType.Display,
      displayData: {
        type: x,
      },
    }));
}

export function arbitraryGroup(
  context: SchemaField,
): Arbitrary<GroupedControlsDefinition> {
  return fc
    .constantFrom(GroupRenderType.Standard, GroupRenderType.Grid)
    .chain((x) =>
      fc
        .oneof(
          { depthIdentifier: "tree", maxDepth: 1 },
          fc.constant([]),
          fc.array(arbitraryControl(context), {
            minLength: 1,
            depthIdentifier: "tree",
          }),
        )
        .map((kids) => ({
          type: ControlDefinitionType.Group,
          groupOptions: { type: x },
          children: kids.map((x) => x.control),
        })),
    );
}

export function arbitraryControl(
  field: SchemaField,
): Arbitrary<ControlAndSchema> {
  return fc
    .constantFrom(
      ControlDefinitionType.Data,
      ControlDefinitionType.Action,
      ControlDefinitionType.Group,
      ControlDefinitionType.Display,
    )
    .chain((x) => {
      switch (x) {
        case ControlDefinitionType.Display:
          return withContext(arbitraryDisplay(), field);
        case ControlDefinitionType.Group:
          return withContext(arbitraryGroup(field), field);
        case ControlDefinitionType.Data:
          return arbitraryData(field);
        default:
          return withContext(arbitraryAction(), field);
      }
    });
}

export function schemaAndControl(): Arbitrary<{
  control: ControlDefinition;
  schema: SchemaField;
}> {
  return rootCompound().chain((s) =>
    arbitraryControl(s.root).map((x) => ({
      control: x.control,
      schema: s.schema,
    })),
  );
}

export function withContext(
  control: Arbitrary<ControlDefinition>,
  schema: SchemaField,
): Arbitrary<ControlAndSchema> {
  return control.map((control) => ({ control, schema }));
}
