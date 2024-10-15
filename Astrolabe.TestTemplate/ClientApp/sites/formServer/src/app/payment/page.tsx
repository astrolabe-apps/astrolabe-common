"use client";

import { useControl } from "@react-typed-forms/core";
import {
  boolField,
  buildSchema,
  createSchemaLookup,
  dataControl,
  groupedControl,
  makeSchemaDataNode,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { createStdFormRenderer } from "../../renderers";
import { Button } from "@astrolabe/ui/Button";
import {
  getTrustedFrame,
  SubmitFormResult,
} from "@astroapps/schemas-quickstream";

interface TestSchema {
  ccReady: boolean;
}

const TestSchema = buildSchema<TestSchema>({
  ccReady: boolField("CCReady"),
});

const renderer = createStdFormRenderer(null);
const schemaLookup = createSchemaLookup({ TestSchema });
const schemaNode = schemaLookup.getSchema("TestSchema")!;
const selectable = groupedControl([
  dataControl("ccReady", "Credit card", {
    renderOptions: { type: "QuickstreamCC" },
  }),
]);

export default function PaymentPage() {
  const pageControl = useControl<TestSchema>({
    ccReady: false,
  });
  const Render = useControlRendererComponent(
    selectable,
    renderer,
    {},
    makeSchemaDataNode(schemaNode, pageControl),
  );
  return (
    <div>
      <Render />
      <Button
        onClick={() =>
          getTrustedFrame(pageControl.fields.ccReady).submitForm((_, data) => {
            console.log(data);
          })
        }
      >
        Check credit card
      </Button>
    </div>
  );
}
