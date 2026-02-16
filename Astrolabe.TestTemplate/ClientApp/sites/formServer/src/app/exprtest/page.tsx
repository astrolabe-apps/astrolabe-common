"use client";

import {
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  EntityExpressionSchema,
} from "@astroapps/forms-core";
import { useControl } from "@react-typed-forms/core";
import {
  ControlDefinition,
  ControlDefinitionType,
  createFormRenderer,
  DataControlDefinition,
  DataRenderType,
  RenderForm,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

const exprFormControls: ControlDefinition[] = [
  {
    type: ControlDefinitionType.Data,
    field: "type",
    title: "Type",
    required: true,
    renderOptions: { type: DataRenderType.Standard },
  } as DataControlDefinition,
  {
    type: ControlDefinitionType.Data,
    field: "expression",
    title: "Expression",
    renderOptions: { type: DataRenderType.Textfield, multiline: true },
  } as DataControlDefinition,
  {
    type: ControlDefinitionType.Data,
    field: "field",
    title: "Field",
    renderOptions: { type: DataRenderType.Standard },
  } as DataControlDefinition,
  {
    type: ControlDefinitionType.Data,
    field: "value",
    title: "Value",
    renderOptions: { type: DataRenderType.Standard },
  } as DataControlDefinition,
  {
    type: ControlDefinitionType.Data,
    field: "userMatch",
    title: "User Match",
    renderOptions: { type: DataRenderType.Standard },
  } as DataControlDefinition,
  {
    type: ControlDefinitionType.Data,
    field: "innerExpression",
    title: "Inner Expression",
    childRefId: "/ExpressionForm",
    renderOptions: { type: DataRenderType.Standard },
  } as DataControlDefinition,
];

const formLookup = {
  getForm(formId: string) {
    if (formId === "ExpressionForm") {
      return createFormTree(exprFormControls, formLookup);
    }
    return undefined;
  },
};

const schemaLookup = createSchemaLookup({
  EntityExpression: EntityExpressionSchema,
});
const schemaTree = schemaLookup.getSchemaTree("EntityExpression");

const formTree = createFormTree(exprFormControls, formLookup);

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

export default function ExprTestPage() {
  const data = useControl({
    type: "Not",
    expression: "",
    field: "",
    value: null,
    userMatch: "",
    innerExpression: {
      type: "Data",
      expression: "",
      field: "someField",
      value: null,
      userMatch: "",
      innerExpression: null,
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Expression Editor Test</h1>
      <p className="text-gray-600">
        This page renders an EntityExpression form with type "Not". The inner
        expression should be visible and editable below.
      </p>
      <RenderForm
        data={createSchemaDataNode(schemaTree.rootNode, data)}
        form={formTree.rootNode}
        renderer={formRenderer}
      />
      <details className="mt-8" open>
        <summary className="cursor-pointer font-medium">
          Raw data (JSON)
        </summary>
        <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
          {JSON.stringify(data.value, null, 2)}
        </pre>
      </details>
    </div>
  );
}
