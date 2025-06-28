import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  ControlDefinition,
  dataControl,
  DateComparison,
  dateValidator,
  defaultEvaluators,
  DynamicPropertyType,
  FieldType,
  FormStateNode,
  groupedControl,
  jsonataValidator,
  lengthValidator,
  SchemaField,
} from "../src";
import { testNodeState } from "./nodeTester";
import { randomValueForField, rootCompound } from "./gen-schema";
import { Control, createSyncEffect, newControl } from "@astroapps/controls";

describe("validator types", () => {
  it("required validator", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root, {
              nullableChance: 0,
              string: { minLength: 1 },
              array: { minLength: 1, maxLength: 2 },
            }),
            initialVisible: fc.boolean(),
          }),
        ),
        ({ schema, data, initialVisible }) => {
          const vis = newControl(initialVisible);
          const state = withDynamicVisible(
            groupedControl([
              groupedControl([
                dataControl(schema.field, undefined, { required: true }),
              ]),
            ]),
            schema,
            data,
            vis,
          );
          expect(state.valid).toBe(true);
          state.parent.control.value = {};
          expect(state.valid).toBe(!initialVisible);
          vis.setValue((x) => !x);
          expect(state.valid).toBe(initialVisible);
        },
      ),
    );
  });

  it("length validator", () => {
    fc.assert(
      fc.property(
        rootCompound({
          fieldType: fc.constant(FieldType.String),
          arrayChance: 50,
          notNullable: true,
        }).chain(({ root, schema }) =>
          fc.integer({ min: 0, max: 100 }).chain((al) =>
            fc.record({
              schema: fc.constant(schema),
              data: randomValueForField(root, {
                string: { minLength: 0, maxLength: 100 },
                array: { minLength: al, maxLength: al },
              }),
              minLength: fc.integer({ min: 0, max: 50 }),
              maxLength: fc.integer({ min: 51, max: 100 }),
            }),
          ),
        ),
        ({ schema, data, minLength, maxLength }) => {
          const state = testNodeState(
            dataControl(schema.field, undefined, {
              validators: [lengthValidator(minLength, maxLength)],
            }),
            schema,
            { data },
          );
          const value = data[schema.field];
          const minValid = schema.collection || value.length >= minLength;
          const maxValid = value.length <= maxLength;
          expect(state.valid).toBe(minValid && maxValid);
          if (!state.valid) {
            expect(state.dataNode!.control.error).toBe(
              !minValid
                ? "Length must be at least " + minLength
                : "Length must be less than " + maxLength,
            );
          }
        },
      ),
    );
  });

  it("date validator", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root),
            minDate: fc.date().map((x) => x.toISOString()),
            maxDate: fc.date().map((x) => x.toISOString()),
          }),
        ),
        ({ schema, data, minDate, maxDate }) => {
          const state = testNodeState(
            dataControl(schema.field, undefined, {
              validators: [
                dateValidator(DateComparison.NotBefore, minDate),
                dateValidator(DateComparison.NotAfter, maxDate),
              ],
            }),
            schema,
            { data },
          );

          const value = data[schema.field];
          expect(state.valid).toBe(value >= minDate && value <= maxDate);
        },
      ),
    );
  });

  it("jsonata validator", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root, {
              int: { min: 0, max: 100 },
            }),
          }),
        ),
        ({ schema, data }) => {
          const state = testNodeState(
            dataControl(schema.field, undefined, {
              validators: [jsonataValidator(`$ > 50`)],
            }),
            schema,
            { data },
          );

          const value = data[schema.field];
          if (typeof value === "number") {
            expect(state.valid).toBe(value > 50);
          }
        },
      ),
    );
  });

  it("combined validators", () => {
    fc.assert(
      fc.property(
        rootCompound().chain(({ root, schema }) =>
          fc.record({
            schema: fc.constant(schema),
            data: randomValueForField(root, {
              string: { minLength: 0, maxLength: 100 },
            }),
            minLength: fc.integer({ min: 0, max: 50 }),
            maxLength: fc.integer({ min: 51, max: 100 }),
          }),
        ),
        ({ schema, data, minLength, maxLength }) => {
          const state = testNodeState(
            dataControl(schema.field, undefined, {
              validators: [
                lengthValidator(minLength, maxLength),
                jsonataValidator(`$length($) > ${minLength}`),
              ],
            }),
            schema,
            { data },
          );

          const value = data[schema.field];
          if (typeof value === "string") {
            expect(state.valid).toBe(
              value.length >= minLength &&
                value.length <= maxLength &&
                value.length > minLength,
            );
          }
        },
      ),
    );
  });
});

function withDynamicVisible(
  c: ControlDefinition,
  schema: SchemaField,
  data: any,
  vis: Control<boolean>,
): FormStateNode {
  const state = testNodeState(
    {
      ...c,
      dynamic: [
        { type: DynamicPropertyType.Visible, expr: { type: "Anything" } },
      ],
    },
    schema,
    {
      data,
      evalExpression: (e, ctx) => {
        if (e.type === "Anything") {
          createSyncEffect(() => {
            ctx.returnResult(vis.value);
          }, ctx.scope);
        } else {
          defaultEvaluators[e.type]?.(e, ctx);
        }
      },
    },
  );
  return state;
}
