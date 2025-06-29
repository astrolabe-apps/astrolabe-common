import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  changePromise,
  deepEqualPromise,
  notNullPromise,
  testNodeState,
} from "./nodeTester";
import { randomValueForField, rootCompound } from "./gen-schema";
import {
  coerceString,
  dataControl,
  dataExpr,
  dataMatchExpr,
  defaultEvaluators,
  DefaultSchemaInterface,
  DynamicPropertyType,
  EntityExpression,
  FieldType,
  jsonataExpr,
  notEmptyExpr,
  SchemaField,
  uuidExpr,
} from "../src";

describe("expression evaluators", () => {
  it("data expression", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        ({ schema, data }) => {
          const firstChild = testLabelExpr(
            schema,
            data,
            dataExpr(schema.field),
          );
          expect(firstChild.definition.title).toBe(
            coerceString(data[schema.field]),
          );
        },
      ),
    );
  });

  it("data match expression", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        ({ schema, data }) => {
          const firstChild = testLabelExpr(
            schema,
            data,
            dataMatchExpr(schema.field, data[schema.field]),
          );
          expect(firstChild.definition.title).toBe("true");
        },
      ),
    );
  });

  it("uuid expression", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        ({ schema, data }) => {
          const result = testLabelExpr(
            schema,
            data,
            uuidExpr, // UUID expression is typically a simple expression with type "uuid"
          );
          // UUID should match the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
          expect(result.definition.title).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          );
        },
      ),
    );
  });

  it("notEmpty expression", () => {
    const schemaInterface = new DefaultSchemaInterface();

    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        ({ schema, data }) => {
          const value = data[schema.field];

          // Test notEmpty (empty = false)
          const notEmptyResult = testLabelExpr(
            schema,
            data,
            notEmptyExpr(schema.field, false),
          );
          expect(notEmptyResult.definition.title).toBe(
            (!schemaInterface.isEmptyValue(schema, value)).toString(),
          );

          // Test isEmpty (empty = true)
          const isEmptyResult = testLabelExpr(
            schema,
            data,
            notEmptyExpr(schema.field, true),
          );
          expect(isEmptyResult.definition.title).toBe(
            schemaInterface.isEmptyValue(schema, value).toString(),
          );
        },
      ),
    );
  });

  it("basic jsonata expression", (done) => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        ({ schema, data }) => {
          const result = testLabelExpr(
            schema,
            data,
            jsonataExpr("$sum([1,2, 3, 4, 5])"),
          );
          setTimeout(() => {
            expect(result.definition.title).toBe("15");
            done();
          }, 1);
        },
      ),
    );
  });

  it("jsonata data based expression", async () =>
    fc.assert(
      fc.asyncProperty(
        rootCompound(
          {
            forceArray: true,
            fieldType: fc.constant(FieldType.Int),
            notNullable: true,
          },
          {
            unit: fc
              .integer({
                min: "a".charCodeAt(0),
                max: "z".charCodeAt(0),
              })
              .map((x) => String.fromCharCode(x)),
          },
        ).chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
          }),
        ),
        async ({ schema, data }) => {
          const result = testLabelExpr(
            schema,
            data,
            jsonataExpr(`$sum(${schema.field})`),
          );
          const expected = (data[schema.field] as number[]).reduce(
            (a, b) => a + b,
            0,
          );
          const def = result.definition;
          expect(await notNullPromise(() => def.title)).toBe(
            expected.toString(),
          );
          if (expected === 0) return;
          const next = changePromise(() => def.title);
          result.dataNode!.control.value = [];
          expect(await next).toBe("0");
        },
      ),
    ));

  it("jsonata array index expression", async () =>
    fc.assert(
      fc.asyncProperty(
        rootCompound(
          {
            forceArray: true,
            fieldType: fc.constant(FieldType.String),
            notNullable: true,
          },
          {
            unit: fc
              .integer({
                min: "a".charCodeAt(0),
                max: "z".charCodeAt(0),
              })
              .map((x) => String.fromCharCode(x)),
          },
        ).chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
            newArraySize: fc.integer({ min: 1, max: 10 }),
          }),
        ),
        async ({ schema, data, newArraySize }) => {
          const result = testArrayLabelExpr(
            schema,
            data,
            jsonataExpr('"title " & $i'),
          );
          await deepEqualPromise(
            () => result.children.map((x) => x.getChild(0)!.definition.title),
            getNumberedTitles(),
          );
          result.dataNode!.control.value = Array.from(
            { length: newArraySize },
            (_, i) => `title ${i}`,
          );
          await deepEqualPromise(
            () => result.children.map((x) => x.getChild(0)!.definition.title),
            getNumberedTitles(),
          );

          function getNumberedTitles() {
            return result
              .dataNode!.control.as<string[]>()
              .elements.map((x, i) => `title ${i}`);
          }
        },
      ),
    ));
});

function testLabelExpr(schema: SchemaField, data: any, expr: EntityExpression) {
  return testNodeState(
    dataControl(schema.field, undefined, {
      dynamic: [
        {
          type: DynamicPropertyType.Label,
          expr,
        },
      ],
    }),
    schema,
    {
      evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
      data,
    },
  );
}

function testArrayLabelExpr(
  schema: SchemaField,
  data: any,
  expr: EntityExpression,
) {
  return testNodeState(
    dataControl(schema.field, undefined, {
      children: [
        dataControl(".", undefined, {
          dynamic: [
            {
              type: DynamicPropertyType.Label,
              expr,
            },
          ],
        }),
      ],
    }),
    schema,
    {
      evalExpression: (e, ctx) => defaultEvaluators[e.type]?.(e, ctx),
      data,
    },
  );
}
