import { describe, expect, it } from "@jest/globals";
import {
  actionControl,
  ControlAdornmentType,
  ControlDefinition,
  createFormStateNode,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  dataControl,
  dataExpr,
  defaultEvaluators,
  defaultResolveChildNodes,
  defaultSchemaInterface,
  DynamicProperty,
  DynamicPropertyType,
  EntityExpression,
  ExpressionEvalContext,
  FieldType,
  FormNodeOptions,
  FormStateNode,
  GridRendererOptions,
  GroupedControlsDefinition,
  groupedControl,
  GroupRenderType,
  htmlDisplayControl,
  jsonataExpr,
  SchemaField,
  textDisplayControl,
} from "../src";
import {
  Control,
  createSyncEffect,
  newControl,
} from "@astroapps/controls";
import { changePromise, testNodeState } from "./nodeTester";
import { intField, stringField } from "../src/schemaBuilder";

/**
 * Creates a form state node with multiple schema fields at the root level.
 * Unlike testNodeState which takes a single SchemaField, this accepts an array.
 */
function testNodeStateMultiField(
  c: ControlDefinition,
  fields: SchemaField[],
  options: {
    evalExpression?: (e: EntityExpression, ctx: ExpressionEvalContext) => void;
    contextOptions?: FormNodeOptions;
    data?: any;
  } = {},
): FormStateNode {
  const formTree = createFormTree([c]);
  const schemaTree = createSchemaTree(fields);
  const data = newControl(options.data ?? {});
  return createFormStateNode(
    formTree.rootNode,
    createSchemaDataNode(schemaTree.rootNode, data),
    {
      schemaInterface: defaultSchemaInterface,
      clearHidden: false,
      runAsync: (cb) => cb(),
      resolveChildren: defaultResolveChildNodes,
      evalExpression:
        options.evalExpression ??
        ((e, ctx) => defaultEvaluators[e.type]?.(e, ctx)),
    },
    options.contextOptions ?? {},
  );
}

function dynamicProperty(
  type: DynamicPropertyType,
  expr: EntityExpression = { type: "Anything" },
): DynamicProperty {
  return { type, expr };
}

/**
 * Creates a form state node with clearHidden enabled.
 */
function testNodeStateWithClearHidden(
  c: ControlDefinition,
  f: SchemaField,
  options: {
    evalExpression?: (e: EntityExpression, ctx: ExpressionEvalContext) => void;
    contextOptions?: FormNodeOptions;
    data?: any;
  } = {},
): FormStateNode {
  const formTree = createFormTree([c]);
  const schemaTree = createSchemaTree([f]);
  const data = newControl(options.data ?? {});
  return createFormStateNode(
    formTree.rootNode,
    createSchemaDataNode(schemaTree.rootNode, data),
    {
      schemaInterface: defaultSchemaInterface,
      clearHidden: true,
      runAsync: (cb) => cb(),
      resolveChildren: defaultResolveChildNodes,
      evalExpression:
        options.evalExpression ??
        ((e, ctx) => defaultEvaluators[e.type]?.(e, ctx)),
    },
    options.contextOptions ?? {},
  );
}

/**
 * Helper: create a mock evalExpression that returns a reactive value.
 * Handles the "Anything" expression type with a reactive Control,
 * and delegates other types to defaultEvaluators.
 */
function reactiveEval(value: Control<any>) {
  return (e: EntityExpression, ctx: ExpressionEvalContext) => {
    if (e.type === "Anything") {
      createSyncEffect(() => {
        ctx.returnResult(value.value);
      }, ctx.scope);
    } else {
      defaultEvaluators[e.type]?.(e, ctx);
    }
  };
}

const testSchema: SchemaField = stringField("Test")("testField");
const intSchema: SchemaField = intField("Count")("count");

describe("dynamic properties", () => {
  describe("definition-level overrides", () => {
    it("dynamic DefaultValue overrides definition.defaultValue", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name", {
          defaultValue: "original",
          dynamic: [dynamicProperty(DynamicPropertyType.DefaultValue)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("dynamic-default"),
        },
      );
      expect(state.definition).toHaveProperty("defaultValue", "dynamic-default");
    });

    it("dynamic DefaultValue responds to reactive changes", () => {
      const schema = stringField("Name")("name");
      const dynValue = newControl<any>("first");
      const state = testNodeState(
        dataControl("name", "Name", {
          defaultValue: "original",
          dynamic: [dynamicProperty(DynamicPropertyType.DefaultValue)],
        }),
        schema,
        { evalExpression: reactiveEval(dynValue) },
      );
      expect(state.definition).toHaveProperty("defaultValue", "first");
      dynValue.value = "second";
      expect(state.definition).toHaveProperty("defaultValue", "second");
    });

    it("dynamic DefaultValue on non-DataControl is harmless no-op", () => {
      const schema = stringField("Name")("name");
      // On a group control, DefaultValue is set on the definition but has no effect
      const state = testNodeState(
        groupedControl([], "Group", {
          dynamic: [dynamicProperty(DynamicPropertyType.DefaultValue)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("something"),
        },
      );
      // Value is set on definition (generic override) but nothing reads it for groups
      expect((state.definition as any).defaultValue).toBe("something");
    });

    it("dynamic ActionData overrides definition.actionData", () => {
      const schema = stringField("Test")("test");
      const state = testNodeState(
        actionControl("Click", "doSomething", {
          actionData: "original",
          dynamic: [dynamicProperty(DynamicPropertyType.ActionData)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("dynamic-data"),
        },
      );
      expect(state.definition).toHaveProperty("actionData", "dynamic-data");
    });

    it("dynamic ActionData responds to reactive changes", () => {
      const schema = stringField("Test")("test");
      const dynValue = newControl<any>("first");
      const state = testNodeState(
        actionControl("Click", "doSomething", {
          actionData: "original",
          dynamic: [dynamicProperty(DynamicPropertyType.ActionData)],
        }),
        schema,
        { evalExpression: reactiveEval(dynValue) },
      );
      expect(state.definition).toHaveProperty("actionData", "first");
      dynValue.value = "updated";
      expect(state.definition).toHaveProperty("actionData", "updated");
    });

    it("dynamic ActionData on non-ActionControl is harmless no-op", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.ActionData)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("something"),
        },
      );
      // Value is set on definition (generic override) but nothing reads it for data controls
      expect((state.definition as any).actionData).toBe("something");
    });

    it("dynamic GridColumns overrides groupOptions.columns", () => {
      const schema = stringField("Test")("test");
      const state = testNodeState(
        groupedControl([], "Grid Group", {
          groupOptions: {
            type: GroupRenderType.Grid,
            columns: 2,
          } as GridRendererOptions,
          dynamic: [dynamicProperty(DynamicPropertyType.GridColumns)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult(4),
        },
      );
      const groupOptions = (state.definition as GroupedControlsDefinition)
        .groupOptions as GridRendererOptions;
      expect(groupOptions).toBeDefined();
      expect(groupOptions.columns).toBe(4);
    });

    it("dynamic GridColumns coerces non-numbers to undefined", () => {
      const schema = stringField("Test")("test");
      const state = testNodeState(
        groupedControl([], "Grid Group", {
          groupOptions: {
            type: GroupRenderType.Grid,
            columns: 2,
          } as GridRendererOptions,
          dynamic: [dynamicProperty(DynamicPropertyType.GridColumns)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("not a number"),
        },
      );
      const groupOptions = (state.definition as GroupedControlsDefinition)
        .groupOptions as GridRendererOptions;
      expect(groupOptions.columns).toBeUndefined();
    });

    it("dynamic GridColumns responds to reactive changes", () => {
      const schema = stringField("Test")("test");
      const dynValue = newControl<any>(3);
      const state = testNodeState(
        groupedControl([], "Grid Group", {
          groupOptions: {
            type: GroupRenderType.Grid,
            columns: 2,
          } as GridRendererOptions,
          dynamic: [dynamicProperty(DynamicPropertyType.GridColumns)],
        }),
        schema,
        { evalExpression: reactiveEval(dynValue) },
      );
      expect(
        ((state.definition as GroupedControlsDefinition).groupOptions as GridRendererOptions).columns,
      ).toBe(3);
      dynValue.value = 6;
      expect(
        ((state.definition as GroupedControlsDefinition).groupOptions as GridRendererOptions).columns,
      ).toBe(6);
    });

    it("dynamic Label overrides definition.title", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Original Title", {
          dynamic: [dynamicProperty(DynamicPropertyType.Label)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("Dynamic Title"),
        },
      );
      expect(state.definition.title).toBe("Dynamic Title");
    });

    it("dynamic Label coerces values to string", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Original", {
          dynamic: [dynamicProperty(DynamicPropertyType.Label)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult(42),
        },
      );
      expect(state.definition.title).toBe("42");
    });
  });

  describe("state-level properties", () => {
    it("dynamic Display updates displayData.text for TextDisplay", () => {
      const schema = stringField("Test")("test");
      const state = testNodeState(
        textDisplayControl("original text", {
          dynamic: [dynamicProperty(DynamicPropertyType.Display)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("dynamic text"),
        },
      );
      const displayData = (state.definition as any).displayData;
      expect(displayData.text).toBe("dynamic text");
    });

    it("dynamic Display updates displayData.html for HtmlDisplay", () => {
      const schema = stringField("Test")("test");
      const state = testNodeState(
        htmlDisplayControl("<b>original</b>", {
          dynamic: [dynamicProperty(DynamicPropertyType.Display)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("<b>dynamic</b>"),
        },
      );
      const displayData = (state.definition as any).displayData;
      expect(displayData.html).toBe("<b>dynamic</b>");
    });

    it("dynamic Display responds to reactive changes", () => {
      const schema = stringField("Test")("test");
      const dynValue = newControl<any>("first");
      const state = testNodeState(
        textDisplayControl("original", {
          dynamic: [dynamicProperty(DynamicPropertyType.Display)],
        }),
        schema,
        { evalExpression: reactiveEval(dynValue) },
      );
      expect((state.definition as any).displayData.text).toBe("first");
      dynValue.value = "second";
      expect((state.definition as any).displayData.text).toBe("second");
    });

    it("dynamic Style updates resolved.style with object value", () => {
      const schema = stringField("Name")("name");
      const styleObj = { color: "red", fontWeight: "bold" };
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.Style)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult(styleObj),
        },
      );
      expect(state.definition.style).toEqual(styleObj);
    });

    it("dynamic Style coerces non-objects to undefined", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.Style)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult("not an object"),
        },
      );
      expect(state.definition.style).toBeUndefined();
    });

    it("dynamic Style responds to reactive changes", () => {
      const schema = stringField("Name")("name");
      const dynValue = newControl<any>({ color: "red" });
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.Style)],
        }),
        schema,
        { evalExpression: reactiveEval(dynValue) },
      );
      expect(state.definition.style).toEqual({ color: "red" });
      dynValue.value = { color: "blue", fontSize: "14px" };
      expect(state.definition.style).toEqual({ color: "blue", fontSize: "14px" });
    });

    it("dynamic LayoutStyle updates resolved.layoutStyle", () => {
      const schema = stringField("Name")("name");
      const layoutObj = { display: "flex", gap: "8px" };
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.LayoutStyle)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult(layoutObj),
        },
      );
      expect(state.definition.layoutStyle).toEqual(layoutObj);
    });

    it("dynamic LayoutStyle coerces non-objects to undefined", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.LayoutStyle)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult(123),
        },
      );
      expect(state.definition.layoutStyle).toBeUndefined();
    });

    it("dynamic AllowedOptions filters fieldOptions", () => {
      const schema: SchemaField = {
        field: "color",
        type: FieldType.String,
        displayName: "Color",
        options: [
          { name: "Red", value: "red" },
          { name: "Blue", value: "blue" },
          { name: "Green", value: "green" },
        ],
      };
      const state = testNodeState(
        dataControl("color", "Color", {
          dynamic: [dynamicProperty(DynamicPropertyType.AllowedOptions)],
        }),
        schema,
        {
          data: { color: "red" },
          evalExpression: (_, ctx) => ctx.returnResult(["red", "green"]),
        },
      );
      expect(state.resolved.fieldOptions).toEqual([
        { name: "Red", value: "red" },
        { name: "Green", value: "green" },
      ]);
    });

    it("dynamic AllowedOptions with empty array returns all options", () => {
      const schema: SchemaField = {
        field: "color",
        type: FieldType.String,
        displayName: "Color",
        options: [
          { name: "Red", value: "red" },
          { name: "Blue", value: "blue" },
        ],
      };
      const state = testNodeState(
        dataControl("color", "Color", {
          dynamic: [dynamicProperty(DynamicPropertyType.AllowedOptions)],
        }),
        schema,
        {
          data: { color: "red" },
          evalExpression: (_, ctx) => ctx.returnResult([]),
        },
      );
      expect(state.resolved.fieldOptions).toEqual([
        { name: "Red", value: "red" },
        { name: "Blue", value: "blue" },
      ]);
    });

    it("dynamic AllowedOptions responds to reactive changes", () => {
      const schema: SchemaField = {
        field: "color",
        type: FieldType.String,
        displayName: "Color",
        options: [
          { name: "Red", value: "red" },
          { name: "Blue", value: "blue" },
          { name: "Green", value: "green" },
        ],
      };
      const dynValue = newControl<any>(["red"]);
      const state = testNodeState(
        dataControl("color", "Color", {
          dynamic: [dynamicProperty(DynamicPropertyType.AllowedOptions)],
        }),
        schema,
        {
          data: { color: "red" },
          evalExpression: reactiveEval(dynValue),
        },
      );
      expect(state.resolved.fieldOptions).toEqual([
        { name: "Red", value: "red" },
      ]);
      dynValue.value = ["blue", "green"];
      expect(state.resolved.fieldOptions).toEqual([
        { name: "Blue", value: "blue" },
        { name: "Green", value: "green" },
      ]);
    });

    it("dynamic AllowedOptions synthesizes options for unknown values", () => {
      const schema: SchemaField = {
        field: "color",
        type: FieldType.String,
        displayName: "Color",
        options: [
          { name: "Red", value: "red" },
        ],
      };
      const state = testNodeState(
        dataControl("color", "Color", {
          dynamic: [dynamicProperty(DynamicPropertyType.AllowedOptions)],
        }),
        schema,
        {
          data: { color: "red" },
          evalExpression: (_, ctx) => ctx.returnResult(["red", "unknown"]),
        },
      );
      expect(state.resolved.fieldOptions).toEqual([
        { name: "Red", value: "red" },
        { name: "unknown", value: "unknown" },
      ]);
    });
  });

  describe("default value application", () => {
    it("applies defaultValue when control becomes visible", () => {
      const schema = stringField("Name")("name");
      const vis = newControl(false);
      const state = testNodeStateWithClearHidden(
        dataControl("name", "Name", {
          defaultValue: "hello",
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        }),
        schema,
        {
          evalExpression: reactiveEval(vis),
        },
      );
      // Initially hidden, data should be undefined
      expect(state.visible).toBe(false);
      expect(state.dataNode!.control.value).toBeUndefined();

      // Become visible - default should be applied
      vis.value = true;
      expect(state.visible).toBe(true);
      expect(state.dataNode!.control.value).toBe("hello");
    });

    it("does not apply defaultValue when value already exists", () => {
      const schema = stringField("Name")("name");
      // Start visible with existing data - default should not overwrite
      const state = testNodeStateWithClearHidden(
        dataControl("name", "Name", {
          defaultValue: "hello",
        }),
        schema,
        {
          data: { name: "existing" },
        },
      );
      expect(state.visible).toBe(true);
      expect(state.dataNode!.control.value).toBe("existing");
    });

    it("does not apply defaultValue with Optional adornment", () => {
      const schema = stringField("Name")("name");
      const vis = newControl(false);
      const state = testNodeStateWithClearHidden(
        dataControl("name", "Name", {
          defaultValue: "hello",
          adornments: [{ type: ControlAdornmentType.Optional }],
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        }),
        schema,
        {
          evalExpression: reactiveEval(vis),
        },
      );
      vis.value = true;
      expect(state.dataNode!.control.value).toBeUndefined();
    });

    it("applies dynamic defaultValue when becoming visible", () => {
      const schema = stringField("Name")("name");
      const vis = newControl(false);
      const state = testNodeStateWithClearHidden(
        dataControl("name", "Name", {
          dynamic: [
            dynamicProperty(DynamicPropertyType.Visible),
            dynamicProperty(DynamicPropertyType.DefaultValue, {
              type: "DefaultExpr",
            }),
          ],
        }),
        schema,
        {
          evalExpression: (e, ctx) => {
            if (e.type === "Anything") {
              createSyncEffect(() => {
                ctx.returnResult(vis.value);
              }, ctx.scope);
            } else if (e.type === "DefaultExpr") {
              ctx.returnResult("dynamic-default");
            }
          },
        },
      );
      expect(state.visible).toBe(false);
      vis.value = true;
      expect(state.visible).toBe(true);
      expect(state.dataNode!.control.value).toBe("dynamic-default");
    });
  });

  describe("clear hidden", () => {
    it("clears data when control becomes hidden with clearHidden", () => {
      const schema = stringField("Name")("name");
      const vis = newControl(true);
      const state = testNodeStateWithClearHidden(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        }),
        schema,
        {
          data: { name: "some value" },
          evalExpression: reactiveEval(vis),
        },
      );
      expect(state.visible).toBe(true);
      expect(state.dataNode!.control.value).toBe("some value");

      // Hide the control
      vis.value = false;
      expect(state.visible).toBe(false);
      expect(state.dataNode!.control.value).toBeUndefined();
    });

    it("does not clear data when dontClearHidden is set", () => {
      const schema = stringField("Name")("name");
      const vis = newControl(true);
      const state = testNodeStateWithClearHidden(
        dataControl("name", "Name", {
          dontClearHidden: true,
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        }),
        schema,
        {
          data: { name: "some value" },
          evalExpression: reactiveEval(vis),
        },
      );
      vis.value = false;
      expect(state.visible).toBe(false);
      expect(state.dataNode!.control.value).toBe("some value");
    });

    it("does not clear data without clearHidden global option", () => {
      const schema = stringField("Name")("name");
      const vis = newControl(true);
      // Uses standard testNodeState which has clearHidden: false
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        }),
        schema,
        {
          data: { name: "some value" },
          evalExpression: reactiveEval(vis),
        },
      );
      vis.value = false;
      expect(state.visible).toBe(false);
      expect(state.dataNode!.control.value).toBe("some value");
    });
  });

  describe("reactivity with real expressions", () => {
    it("dynamic Visible reacts to data field changes", () => {
      const nameSchema = stringField("Name")("name");
      const showSchema: SchemaField = {
        field: "showName",
        type: FieldType.Bool,
        displayName: "Show Name",
      };

      const state = testNodeStateMultiField(
        groupedControl([
          dataControl("name", "Name", {
            dynamic: [
              { type: DynamicPropertyType.Visible, expr: dataExpr("showName") },
            ],
          }),
        ]),
        [nameSchema, showSchema],
        {
          data: { name: "hello", showName: true },
        },
      );
      const nameChild = state.children[0];
      expect(nameChild.visible).toBe(true);

      // Change the showName field to false
      state.parent.control.fields.showName.value = false;
      expect(nameChild.visible).toBe(false);

      // Change back
      state.parent.control.fields.showName.value = true;
      expect(nameChild.visible).toBe(true);
    });

    it("dynamic Label reacts to data field changes", () => {
      const nameSchema = stringField("Name")("name");
      const labelSchema = stringField("Label")("labelText");

      const state = testNodeStateMultiField(
        groupedControl([
          dataControl("name", "Original", {
            dynamic: [
              { type: DynamicPropertyType.Label, expr: dataExpr("labelText") },
            ],
          }),
        ]),
        [nameSchema, labelSchema],
        {
          data: { name: "hello", labelText: "First Label" },
        },
      );
      const nameChild = state.children[0];
      expect(nameChild.definition.title).toBe("First Label");

      state.parent.control.fields.labelText.value = "Updated Label";
      expect(nameChild.definition.title).toBe("Updated Label");
    });

    it("dynamic DefaultValue reacts to data field changes", () => {
      const nameSchema = stringField("Name")("name");
      const defaultSchema = stringField("Default Name")("defaultName");

      const state = testNodeStateMultiField(
        groupedControl([
          dataControl("name", "Name", {
            dynamic: [
              {
                type: DynamicPropertyType.DefaultValue,
                expr: dataExpr("defaultName"),
              },
            ],
          }),
        ]),
        [nameSchema, defaultSchema],
        {
          data: { name: "existing", defaultName: "default1" },
        },
      );
      const nameChild = state.children[0];
      expect(nameChild.definition).toHaveProperty("defaultValue", "default1");

      state.parent.control.fields.defaultName.value = "default2";
      expect(nameChild.definition).toHaveProperty("defaultValue", "default2");
    });
  });

  describe("visibility edge cases", () => {
    it("visibility is true when no hidden property and no dynamic expression", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name"),
        schema,
      );
      // No hidden set, no dynamic expression:
      // evalDynamic sets hidden = !!def.hidden = !!undefined = false
      // visible = !false = true
      expect(state.visible).toBe(true);
    });

    it("dynamic Visible=true makes visibility true (not null)", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult(true),
        },
      );
      // With dynamic visible returning true, hidden becomes false,
      // so visible becomes !false = true (not null)
      expect(state.visible).toBe(true);
    });

    it("dynamic Visible toggling from null baseline applies defaults correctly", () => {
      const schema = stringField("Name")("name");
      const vis = newControl(true);
      const state = testNodeStateWithClearHidden(
        dataControl("name", "Name", {
          defaultValue: "default-val",
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        }),
        schema,
        {
          evalExpression: reactiveEval(vis),
        },
      );
      // Initially visible=true (not null), default should be applied
      // because visible is truthy and value is undefined
      expect(state.visible).toBe(true);
      expect(state.dataNode!.control.value).toBe("default-val");
    });

    it("parent hidden propagates to children", () => {
      const schema = stringField("Name")("name");
      const vis = newControl(true);
      const state = testNodeState(
        {
          ...groupedControl([dataControl("name", "Name")]),
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        },
        schema,
        {
          evalExpression: reactiveEval(vis),
        },
      );
      expect(state.visible).toBe(true);
      expect(state.children[0].visible).toBe(true);

      vis.value = false;
      expect(state.visible).toBe(false);
      expect(state.children[0].visible).toBe(false);
    });

    it("forceHidden overrides dynamic Visible", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [dynamicProperty(DynamicPropertyType.Visible)],
        }),
        schema,
        {
          evalExpression: (_, ctx) => ctx.returnResult(true),
          contextOptions: { forceHidden: true },
        },
      );
      // forceHidden should win over dynamic visible=true
      expect(state.visible).toBe(false);
    });
  });

  describe("multiple dynamic properties on same control", () => {
    it("supports Visible + Label + Style simultaneously", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [
            {
              type: DynamicPropertyType.Visible,
              expr: { type: "VisExpr" },
            },
            {
              type: DynamicPropertyType.Label,
              expr: { type: "LabelExpr" },
            },
            {
              type: DynamicPropertyType.Style,
              expr: { type: "StyleExpr" },
            },
          ],
        }),
        schema,
        {
          evalExpression: (e, ctx) => {
            if (e.type === "VisExpr") ctx.returnResult(true);
            else if (e.type === "LabelExpr") ctx.returnResult("Dynamic Label");
            else if (e.type === "StyleExpr")
              ctx.returnResult({ color: "red" });
          },
        },
      );
      expect(state.visible).toBe(true);
      expect(state.definition.title).toBe("Dynamic Label");
      expect(state.definition.style).toEqual({ color: "red" });
    });

    it("supports Disabled + Readonly simultaneously", () => {
      const schema = stringField("Name")("name");
      const state = testNodeState(
        dataControl("name", "Name", {
          dynamic: [
            {
              type: DynamicPropertyType.Disabled,
              expr: { type: "DisExpr" },
            },
            {
              type: DynamicPropertyType.Readonly,
              expr: { type: "RoExpr" },
            },
          ],
        }),
        schema,
        {
          evalExpression: (e, ctx) => {
            if (e.type === "DisExpr") ctx.returnResult(true);
            else if (e.type === "RoExpr") ctx.returnResult(true);
          },
        },
      );
      expect(state.disabled).toBe(true);
      expect(state.readonly).toBe(true);
      expect(!!state.definition.disabled).toBe(true);
      expect(!!state.definition.readonly).toBe(true);
    });
  });

  describe("async expression evaluation (jsonata)", () => {
    it("dynamic Display with jsonata expression", async () => {
      const nameSchema = stringField("Name")("name");

      const state = testNodeStateMultiField(
        groupedControl([
          textDisplayControl("initial", {
            dynamic: [
              {
                type: DynamicPropertyType.Display,
                expr: jsonataExpr('"Hello " & name'),
              },
            ],
          }),
        ]),
        [nameSchema],
        {
          data: { name: "World" },
        },
      );
      const displayChild = state.children[0];
      const result = await changePromise(
        () => (displayChild.definition as any).displayData?.text,
      );
      expect(result).toBe("Hello World");
    });
  });
});
