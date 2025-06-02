"use client";

import { useControl } from "@react-typed-forms/core";
import {
  accordionOptions,
  buildSchema,
  compoundField,
  createSchemaLookup,
  dataControl,
  DataRenderType,
  dynamicVisibility,
  groupedControl,
  jsonataExpr,
  makeSchemaDataNode,
  stringField,
  stringOptionsField,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { createStdFormRenderer } from "../../renderers";
import { Button } from "@astrolabe/ui/Button";
import { getAccordionState } from "@react-typed-forms/schemas-html";
import {
  OptionForm,
  TestOptionSchema,
  TestSchema,
} from "../../setup/testOptionTree";

const renderer = createStdFormRenderer(null);
const schemaLookup = createSchemaLookup({ TestSchema });
const schemaNode = schemaLookup.getSchema("TestSchema")!;

export default function CheckAdorn() {
  const pageControl = useControl<TestOptionSchema>({
    selected: "",
    selectables: [
      { id: "choice1", name: "ONNNNEEE" },
      { id: "choice2", name: "TWO" },
    ],
  });
  const Render = useControlRendererComponent(
    OptionForm,
    renderer,
    {},
    makeSchemaDataNode(schemaNode, pageControl),
  );
  return (
    <div>
      <Render />
      <Button onClick={toggle}>Toggle</Button>
    </div>
  );
  function toggle() {
    getAccordionState(pageControl.fields.selected)?.setValue((x) => !x);
  }
}
