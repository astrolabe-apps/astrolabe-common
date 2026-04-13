"use client";

import {
  buildSchema,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  DefaultSchemaInterface,
  intField,
  stringField,
  stringOptionsField,
} from "@astroapps/forms-core";
import { useControl } from "@react-typed-forms/core";
import {
  createAction,
  createFormRenderer,
  dataControl,
  RenderForm,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

interface CarForm {
  make: string;
  model: string;
  year: number;
}

const CarSchema = buildSchema<CarForm>({
  make: stringOptionsField(
    "Make",
    { name: "Hyundai", value: "Hyundai" },
    { name: "Toyota", value: "Toyota" },
  ),
  model: stringField("Model"),
  year: intField("Year"),
});

const SchemaLookup = createSchemaLookup({ CarSchema });

const SchemaTree = SchemaLookup.getSchemaTree("CarSchema");

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);
const formTree = createFormTree([dataControl("make")]);

export default function StuffPage() {
  const data = useControl<CarForm>({
    make: "Hyundai",
    model: "Accent",
    year: 2002,
  });
  return (
    <>
      <pre>{JSON.stringify(CarSchema, null, 4)}</pre>
      <pre>
        {formRenderer.renderAction(
          createAction("Cool", () => console.log("Clicked")),
        )}
      </pre>
      <RenderForm
        data={createSchemaDataNode(SchemaTree.rootNode, data)}
        form={formTree.rootNode}
        renderer={formRenderer}
      />
    </>
  );
}

class ExtendedSchema extends DefaultSchemaInterface {}
