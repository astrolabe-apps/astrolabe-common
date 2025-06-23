"use client";

import { useControl } from "@react-typed-forms/core";
import {
  createSchemaDataNode,
  createSchemaLookup,
  RenderForm,
} from "@react-typed-forms/schemas";
import { createStdFormRenderer } from "../../renderers";
import { Button } from "@astrolabe/ui/Button";
import { getAccordionState } from "@react-typed-forms/schemas-html";
import {
  Form,
  SchemaFields,
  TestOptionSchema,
} from "../../setup/testOptionTree";
import { createFormTree } from "@astroapps/forms-core";

const renderer = createStdFormRenderer(null);
const schemaLookup = createSchemaLookup({ SchemaFields });
const schemaNode = schemaLookup.getSchema("SchemaFields")!;

export default function CheckAdorn() {
  const pageControl = useControl<TestOptionSchema>({
    selected: "",
    selectables: [
      { id: "choice1", name: "ONNNNEEE" },
      { id: "choice2", name: "TWO" },
    ],
  });
  const formTree = createFormTree(Form);
  return (
    <div>
      <RenderForm
        renderer={renderer}
        form={formTree.rootNode}
        data={createSchemaDataNode(schemaNode, pageControl)}
      />
      <Button onClick={toggle}>Toggle</Button>
    </div>
  );
  function toggle() {
    getAccordionState(pageControl.fields.selected)?.setValue((x) => !x);
  }
}
