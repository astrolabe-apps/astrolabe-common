import { describe, expect, it } from "@jest/globals";
import {
  CompoundField,
  ControlDefinition,
  ControlDefinitionType,
  createFormStateNode,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  DataControlDefinition,
  DataRenderType,
  defaultEvaluators,
  defaultResolveChildNodes,
  defaultSchemaInterface,
  FieldType,
  FormTreeLookup,
  SchemaField,
} from "../src";
import { newControl } from "@astroapps/controls";
import { FormStateNode } from "../src/formStateNode";

function childVisibility(node: FormStateNode) {
  return node.children.map((c) => ({
    field: (c.form?.definition as DataControlDefinition)?.field,
    visible: c.visible,
  }));
}

describe("treeChildren compound field with onlyForTypes", () => {
  // Schema mimicking EntityExpressionSchema
  const typeField: SchemaField = {
    field: "type",
    type: FieldType.String,
    displayName: "Type",
    isTypeField: true,
  };
  const expressionField: SchemaField = {
    field: "expression",
    type: FieldType.String,
    displayName: "Expression",
    onlyForTypes: ["Jsonata"],
  };
  const fieldField: SchemaField = {
    field: "field",
    type: FieldType.String,
    displayName: "Field",
    onlyForTypes: ["Data", "FieldValue"],
  };
  const innerExpressionField: CompoundField = {
    field: "innerExpression",
    type: FieldType.Compound,
    displayName: "Inner Expression",
    treeChildren: true,
    onlyForTypes: ["Not"],
    notNullable: true,
    children: [],
    tags: ["_ControlRef:/ExpressionForm"],
  };

  const exprSchema: SchemaField[] = [
    typeField,
    expressionField,
    fieldField,
    innerExpressionField,
  ];

  // Controls like ExpressionForm.json
  const exprFormControls: ControlDefinition[] = [
    {
      type: ControlDefinitionType.Data,
      field: "type",
      title: "Type",
      renderOptions: { type: DataRenderType.Standard },
    } as DataControlDefinition,
    {
      type: ControlDefinitionType.Data,
      field: "expression",
      title: "Expression",
      renderOptions: { type: DataRenderType.Standard },
    } as DataControlDefinition,
    {
      type: ControlDefinitionType.Data,
      field: "field",
      title: "Field",
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

  const formLookup: FormTreeLookup = {
    getForm(formId: string) {
      if (formId === "ExpressionForm") {
        return createFormTree(exprFormControls, formLookup);
      }
      return undefined;
    },
  };

  it("treeChildren field resolves parent fields as its own children", () => {
    const tree = createSchemaTree(exprSchema);
    const innerExprNode = tree.rootNode
      .getChildNodes()
      .find((n) => n.field.field === "innerExpression")!;

    const resolvedFields = innerExprNode.getResolvedFields();
    expect(resolvedFields.map((f) => f.field)).toEqual([
      "type",
      "expression",
      "field",
      "innerExpression",
    ]);
  });

  it("FormStateNode renders children for treeChildren compound with childRefId", () => {
    const formTree = createFormTree(exprFormControls, formLookup);
    const schemaTree = createSchemaTree(exprSchema);
    const data = newControl({
      type: "Not",
      innerExpression: {
        type: "Data",
        field: "someField",
      },
    });
    const rootState = createFormStateNode(
      formTree.rootNode,
      createSchemaDataNode(schemaTree.rootNode, data),
      {
        schemaInterface: defaultSchemaInterface,
        clearHidden: false,
        runAsync: (cb) => cb(),
        resolveChildren: defaultResolveChildNodes,
        evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
      },
      {},
    );

    // Root should have 4 children (type, expression, field, innerExpression)
    expect(rootState.children).toHaveLength(4);

    // Check root level visibility: type=Not, so expression(Jsonata) hidden, field(Data/FieldValue) hidden, innerExpression(Not) visible
    expect(childVisibility(rootState)).toEqual([
      { field: "type", visible: true },
      { field: "expression", visible: false },
      { field: "field", visible: false },
      { field: "innerExpression", visible: true },
    ]);

    // The innerExpression child
    const innerExprState = rootState.children[3];

    // innerExpression should have its own children from the ExpressionForm
    expect(innerExprState.children.length).toBeGreaterThan(0);

    // Inner type=Data, so field(Data/FieldValue) visible, expression(Jsonata) hidden, innerExpression(Not) hidden
    expect(childVisibility(innerExprState)).toEqual([
      { field: "type", visible: true },
      { field: "expression", visible: false },
      { field: "field", visible: true },
      { field: "innerExpression", visible: false },
    ]);
  });

  it("FormStateNode renders children two levels deep (Not within Not)", () => {
    const formTree = createFormTree(exprFormControls, formLookup);
    const schemaTree = createSchemaTree(exprSchema);
    const data = newControl({
      type: "Not",
      innerExpression: {
        type: "Not",
        innerExpression: {
          type: "Data",
          field: "someField",
        },
      },
    });
    const rootState = createFormStateNode(
      formTree.rootNode,
      createSchemaDataNode(schemaTree.rootNode, data),
      {
        schemaInterface: defaultSchemaInterface,
        clearHidden: false,
        runAsync: (cb) => cb(),
        resolveChildren: defaultResolveChildNodes,
        evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
      },
      {},
    );

    // Level 0 (root): type=Not
    expect(rootState.children).toHaveLength(4);
    expect(childVisibility(rootState)).toEqual([
      { field: "type", visible: true },
      { field: "expression", visible: false },
      { field: "field", visible: false },
      { field: "innerExpression", visible: true },
    ]);

    // Level 1: innerExpression has type=Not, so innerExpression(Not) should be visible
    const level1Inner = rootState.children[3];
    expect(level1Inner.children.length).toBeGreaterThan(0);
    expect(childVisibility(level1Inner)).toEqual([
      { field: "type", visible: true },
      { field: "expression", visible: false },
      { field: "field", visible: false },
      { field: "innerExpression", visible: true },
    ]);

    // Level 2: innerExpression has type=Data, so field(Data/FieldValue) visible
    const level2Inner = level1Inner.children.find(
      (c) =>
        (c.form!.definition as DataControlDefinition).field ===
        "innerExpression",
    )!;
    expect(level2Inner).toBeDefined();
    expect(level2Inner.children.length).toBeGreaterThan(0);
    expect(childVisibility(level2Inner)).toEqual([
      { field: "type", visible: true },
      { field: "expression", visible: false },
      { field: "field", visible: true },
      { field: "innerExpression", visible: false },
    ]);
  });

  it("dynamically changing inner type to Not shows innerExpression at level 2", () => {
    const formTree = createFormTree(exprFormControls, formLookup);
    const schemaTree = createSchemaTree(exprSchema);
    const data = newControl({
      type: "Not",
      innerExpression: {
        type: "Data",
        field: "someField",
      },
    });
    const rootState = createFormStateNode(
      formTree.rootNode,
      createSchemaDataNode(schemaTree.rootNode, data),
      {
        schemaInterface: defaultSchemaInterface,
        clearHidden: false,
        runAsync: (cb) => cb(),
        resolveChildren: defaultResolveChildNodes,
        evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
      },
      {},
    );

    // Initially inner type=Data, innerExpression should be hidden
    const level1Inner = rootState.children[3];
    expect(childVisibility(level1Inner)).toEqual([
      { field: "type", visible: true },
      { field: "expression", visible: false },
      { field: "field", visible: true },
      { field: "innerExpression", visible: false },
    ]);

    // Dynamically change inner type to "Not"
    data.fields.innerExpression.fields.type.value = "Not";

    // Now innerExpression should become visible at level 1
    expect(childVisibility(level1Inner)).toEqual([
      { field: "type", visible: true },
      { field: "expression", visible: false },
      { field: "field", visible: false },
      { field: "innerExpression", visible: true },
    ]);

    // Level 2 should have children
    const level2Inner = level1Inner.children.find(
      (c) =>
        (c.form!.definition as DataControlDefinition).field ===
        "innerExpression",
    )!;
    expect(level2Inner).toBeDefined();
    expect(level2Inner.children.length).toBeGreaterThan(0);
    expect(childVisibility(level2Inner)).toEqual([
      { field: "type", visible: true },
      { field: "expression", visible: false },
      { field: "field", visible: false },
      { field: "innerExpression", visible: false },
    ]);
  });
});
