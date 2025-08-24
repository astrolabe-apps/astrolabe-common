import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  DefaultSchemaInterface,
  FieldType,
  SchemaField,
  ValidationMessageType,
  createSchemaTree,
  FieldOption,
  isCompoundField,
} from "../src";
import { newControl } from "@astroapps/controls";
import { randomSchemaField, randomValueForField } from "./gen-schema";

describe("DefaultSchemaInterface property tests", () => {
  const schemaInterface = new DefaultSchemaInterface();

  describe("isEmptyValue", () => {
    it("string fields: empty strings are empty, non-empty strings are not empty", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
            arrayChance: 0,
          }),
          fc.string(),
          (field, value) => {
            const isEmpty = schemaInterface.isEmptyValue(field, value);
            expect(isEmpty).toBe(!value); // Empty if falsy
          },
        ),
      );
    });

    it("collection fields: empty arrays are empty, non-empty arrays are not empty", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
            forceArray: true,
          }),
          fc.array(fc.string()),
          (field, value) => {
            const isEmpty = schemaInterface.isEmptyValue(field, value);
            expect(isEmpty).toBe(value.length === 0);
          },
        ),
      );
    });

    it("null and undefined are always empty", () => {
      fc.assert(
        fc.property(randomSchemaField("testField"), (field) => {
          expect(schemaInterface.isEmptyValue(field, null)).toBe(true);
          expect(schemaInterface.isEmptyValue(field, undefined)).toBe(true);
        }),
      );
    });

    it("numbers: zero is not empty, null/undefined is empty", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.Int),
          }),
          fc.integer(),
          (field, value) => {
            const isEmpty = schemaInterface.isEmptyValue(field, value);
            expect(isEmpty).toBe(value == null);
          },
        ),
      );
    });
  });

  describe("textValue", () => {
    it("string values return themselves", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
          }),
          fc.string(),
          (field, value) => {
            const text = schemaInterface.textValue(field, value);
            expect(text).toBe(value);
          },
        ),
      );
    });

    it("boolean values use boolStrings", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.Bool),
          }),
          fc.boolean(),
          (field, value) => {
            const text = schemaInterface.textValue(field, value);
            expect(text).toBe(value ? "Yes" : "No");
          },
        ),
      );
    });

    it("field options take precedence over default formatting", () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.record({ name: fc.string(), value: fc.anything() }), {
              minLength: 1,
              maxLength: 10,
            })
            .chain((options) => {
              // Ensure unique values by mapping each option to have a unique value
              const uniqueOptions = options.map((option, index) => ({
                ...option,
                value: `unique_value_${index}`,
              }));
              return fc.record({
                options: fc.constant(uniqueOptions),
                field: randomSchemaField("testField", {
                  fieldType: fc.constant(FieldType.String),
                }).map((f) => ({ ...f, options: uniqueOptions })),
              });
            }),
          ({ options, field }) => {
            fc.assert(
              fc.property(
                fc.integer({ min: 0, max: options.length - 1 }),
                (index) => {
                  const selectedOption = options[index];
                  const text = schemaInterface.textValue(
                    field,
                    selectedOption.value,
                    false,
                    options,
                  );
                  expect(text).toBe(selectedOption.name);
                },
              ),
            );
          },
        ),
      );
    });

    it("date fields format as date string", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.Date),
          }),
          fc.date({ min: new Date(1970, 0, 1), max: new Date(2100, 11, 31) }),
          (field, date) => {
            // Format date as YYYY-MM-DD string as expected for Date field type
            const dateString = date.toISOString().substring(0, 10);
            const text = schemaInterface.textValue(field, dateString);
            expect(text).toBe(new Date(dateString).toLocaleDateString());
          },
        ),
      );
    });

    it("datetime fields format as datetime string", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.DateTime),
          }),
          fc.date({ min: new Date(1970, 0, 1), max: new Date(2100, 11, 31) }),
          (field, date) => {
            // Format date as ISO string as expected for DateTime field type
            const isoString = date.toISOString();
            const text = schemaInterface.textValue(field, isoString);

            // The DefaultSchemaInterface parses the ISO string and formats it as locale string
            const expectedText = new Date(
              schemaInterface.parseToMillis(field, isoString),
            ).toLocaleString();
            expect(text).toBe(expectedText);
          },
        ),
      );
    });

    it("time fields format as time string", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.Time),
          }),
          fc.date({ min: new Date(1970, 0, 1), max: new Date(2100, 11, 31) }),
          (field, date) => {
            // Format time as HH:MM:SS string as expected for Time field type
            const timeString = date.toISOString().substring(11); // Gets the time part with timezone
            const text = schemaInterface.textValue(field, timeString);

            // The DefaultSchemaInterface creates a date from "1970-01-01T" + timeString and formats as locale time
            const expectedText = new Date(
              "1970-01-01T" + timeString,
            ).toLocaleTimeString();
            expect(text).toBe(expectedText);
          },
        ),
      );
    });

    it("null/undefined values return undefined", () => {
      fc.assert(
        fc.property(randomSchemaField("testField"), (field) => {
          expect(schemaInterface.textValue(field, null)).toBeUndefined();
          expect(schemaInterface.textValue(field, undefined)).toBeUndefined();
        }),
      );
    });
  });

  describe("valueLength", () => {
    it("string length equals string.length", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
          }),
          fc.string(),
          (field, value) => {
            const length = schemaInterface.valueLength(field, value);
            expect(length).toBe(value?.length ?? 0);
          },
        ),
      );
    });

    it("null/undefined values have zero length", () => {
      fc.assert(
        fc.property(randomSchemaField("testField"), (field) => {
          expect(schemaInterface.valueLength(field, null)).toBe(0);
          expect(schemaInterface.valueLength(field, undefined)).toBe(0);
        }),
      );
    });
  });

  describe("controlLength", () => {
    it("collection control length equals elements array length", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
            forceArray: true,
          }),
          fc.array(fc.string(), { maxLength: 100 }),
          (field, values) => {
            const control = newControl(values);
            const length = schemaInterface.controlLength(field, control);
            expect(length).toBe(values.length);
          },
        ),
      );
    });

    it("non-collection control length equals value length", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
            arrayChance: 0,
          }),
          fc.string(),
          (field, value) => {
            const control = newControl(value);
            const length = schemaInterface.controlLength(field, control);
            expect(length).toBe(value?.length ?? 0);
          },
        ),
      );
    });
  });

  describe("compareValue", () => {
    it("string, date, datetime, and time comparison is consistent with localeCompare", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constantFrom(
              FieldType.String,
              FieldType.Date,
              FieldType.DateTime,
              FieldType.Time,
            ),
            arrayChance: 0, // Don't test arrays here
          }).chain((field) =>
            fc.record({
              field: fc.constant(field),
              valueA: randomValueForField(field, { nullableChance: 0 }),
              valueB: randomValueForField(field, { nullableChance: 0 }),
            }),
          ),
          ({ field, valueA, valueB }) => {
            const result = schemaInterface.compareValue(field, valueA, valueB);
            const expected = (valueA as string).localeCompare(valueB as string);
            // Both should have same sign (or both zero)
            expect(Math.sign(result)).toBe(Math.sign(expected));
          },
        ),
      );
    });

    it("boolean comparison works correctly", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.Bool),
            arrayChance: 0,
          }).chain((field) =>
            fc.record({
              field: fc.constant(field),
              valueA: randomValueForField(field, { nullableChance: 0 }),
              valueB: randomValueForField(field, { nullableChance: 0 }),
            }),
          ),
          ({ field, valueA, valueB }) => {
            const result = schemaInterface.compareValue(field, valueA, valueB);

            // Boolean comparison logic: true > false
            // true === true: 0
            // false === false: 0
            // true > false: positive (1)
            // false < true: negative (-1)
            let expected: number;
            if (valueA === valueB) {
              expected = 0;
            } else if (valueA && !valueB) {
              expected = 1;
            } else {
              expected = -1;
            }

            expect(result).toBe(expected);
          },
        ),
      );
    });

    it("number comparison is consistent with subtraction", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.Int),
          }),
          fc.integer(),
          fc.integer(),
          (field, a, b) => {
            const result = schemaInterface.compareValue(field, a, b);
            const expected = a - b;
            expect(Math.sign(result)).toBe(Math.sign(expected));
          },
        ),
      );
    });

    it("null values are handled consistently", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
          }),
          fc.string(),
          (field, value) => {
            // null should be greater than any value
            expect(schemaInterface.compareValue(field, null, value)).toBe(1);
            expect(schemaInterface.compareValue(field, value, null)).toBe(-1);
            // null equals null
            expect(schemaInterface.compareValue(field, null, null)).toBe(0);
          },
        ),
      );
    });

    it("comparison is reflexive: compare(a, a) === 0", () => {
      fc.assert(
        fc.property(randomSchemaField("testField"), (field) => {
          fc.property(randomValueForField(field), (value) => {
            const result = schemaInterface.compareValue(field, value, value);
            expect(result).toBe(0);
          });
        }),
      );
    });

    it("comparison is antisymmetric: compare(a, b) === -compare(b, a)", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
          }),
          fc.string(),
          fc.string(),
          (field, a, b) => {
            const resultAB = schemaInterface.compareValue(field, a, b);
            const resultBA = schemaInterface.compareValue(field, b, a);
            expect(resultAB).toBe(0 - resultBA);
          },
        ),
      );
    });
  });

  describe("searchText", () => {
    it("search text is always lowercase", () => {
      fc.assert(
        fc.property(randomSchemaField("testField"), (field) => {
          fc.property(randomValueForField(field), (value) => {
            const searchText = schemaInterface.searchText(field, value);
            expect(searchText).toBe(searchText.toLowerCase());
          });
        }),
      );
    });

    it("search text matches textValue when available", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
          }),
          fc.string().filter((s) => s.trim() !== ""),
          (field, value) => {
            const textValue = schemaInterface.textValue(field, value);
            const searchText = schemaInterface.searchText(field, value);
            if (textValue) {
              expect(searchText).toBe(textValue.toLowerCase());
            }
          },
        ),
      );
    });
  });

  describe("validationMessageText", () => {
    it("returns appropriate message for NotEmpty validation", () => {
      fc.assert(
        fc.property(randomSchemaField("testField"), (field) => {
          const message = schemaInterface.validationMessageText(
            field,
            ValidationMessageType.NotEmpty,
            false,
            true,
          );
          expect(message).toBe("Please enter a value");
        }),
      );
    });

    it("returns appropriate message for length validations", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField"),
          fc.integer({ min: 1, max: 100 }),
          (field, expectedLength) => {
            const minMessage = schemaInterface.validationMessageText(
              field,
              ValidationMessageType.MinLength,
              expectedLength - 1,
              expectedLength,
            );
            expect(minMessage).toContain(expectedLength.toString());
            expect(minMessage).toContain("at least");

            const maxMessage = schemaInterface.validationMessageText(
              field,
              ValidationMessageType.MaxLength,
              expectedLength + 1,
              expectedLength,
            );
            expect(maxMessage).toContain(expectedLength.toString());
            expect(maxMessage).toContain("less than");
          },
        ),
      );
    });

    it("returns appropriate message for date validations", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.Date),
          }),
          fc.date(),
          (field, date) => {
            const dateString = date.toDateString();

            const beforeMessage = schemaInterface.validationMessageText(
              field,
              ValidationMessageType.NotBeforeDate,
              date.getTime() - 1000,
              date.getTime(),
            );
            expect(beforeMessage).toContain(dateString);
            expect(beforeMessage).toContain("not be before");

            const afterMessage = schemaInterface.validationMessageText(
              field,
              ValidationMessageType.NotAfterDate,
              date.getTime() + 1000,
              date.getTime(),
            );
            expect(afterMessage).toContain(dateString);
            expect(afterMessage).toContain("not be after");
          },
        ),
      );
    });
  });

  describe("makeEqualityFunc", () => {
    it("equality function is reflexive: equals(a, a) is always true", () => {
      fc.assert(
        fc.property(randomSchemaField("testField"), (field) => {
          fc.property(randomValueForField(field), (value) => {
            const schema = createSchemaTree([field]).rootNode.getChildNode(
              "testField",
            );
            const equalityFunc = schemaInterface.makeEqualityFunc(schema);
            expect(equalityFunc(value, value)).toBe(true);
          });
        }),
      );
    });

    it("equality function is symmetric: equals(a, b) === equals(b, a)", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
          }),
          fc.string(),
          fc.string(),
          (field, a, b) => {
            const schema = createSchemaTree([field]).rootNode.getChildNode(
              "testField",
            );
            const equalityFunc = schemaInterface.makeEqualityFunc(schema);
            expect(equalityFunc(a, b)).toBe(equalityFunc(b, a));
          },
        ),
      );
    });

    it("equality function handles null/undefined correctly", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
          }),
          fc.string(),
          (field, value) => {
            const schema = createSchemaTree([field]).rootNode.getChildNode(
              "testField",
            );
            const equalityFunc = schemaInterface.makeEqualityFunc(schema);

            expect(equalityFunc(null, null)).toBe(true);
            expect(equalityFunc(undefined, undefined)).toBe(true);
            expect(equalityFunc(null, undefined)).toBe(false);
            expect(equalityFunc(undefined, null)).toBe(false);
            expect(equalityFunc(value, null)).toBe(false);
            expect(equalityFunc(null, value)).toBe(false);
          },
        ),
      );
    });

    it("array equality checks length and elements", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
            forceArray: true,
          }),
          fc.array(fc.string(), { maxLength: 10 }),
          fc.array(fc.string(), { maxLength: 10 }),
          (field, arr1, arr2) => {
            const schema = createSchemaTree([field]).rootNode.getChildNode(
              "testField",
            );
            const equalityFunc = schemaInterface.makeEqualityFunc(schema);

            const result = equalityFunc(arr1, arr2);
            const expected =
              arr1.length === arr2.length &&
              arr1.every((item, index) => item === arr2[index]);

            expect(result).toBe(expected);
          },
        ),
      );
    });
  });

  describe("parseToMillis", () => {
    it("returns valid timestamp for valid date strings", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.DateTime),
          }),
          fc.date({ min: new Date(1970, 0, 2), max: new Date(2100, 11, 31) }),
          (field, date) => {
            const isoString = date.toISOString();
            const result = schemaInterface.parseToMillis(field, isoString);

            expect(result).toBeGreaterThan(0);
            expect(new Date(result).toISOString()).toBe(isoString);
          },
        ),
      );
    });
  });

  describe("integration properties", () => {
    it("textValue and searchText are consistent", () => {
      fc.assert(
        fc.property(randomSchemaField("testField"), (field) => {
          fc.property(randomValueForField(field), (value) => {
            const textValue = schemaInterface.textValue(field, value);
            const searchText = schemaInterface.searchText(field, value);

            if (textValue) {
              expect(searchText).toBe(textValue.toLowerCase());
            } else {
              expect(searchText).toBe("");
            }
          });
        }),
      );
    });

    it("isEmptyValue and valueLength are consistent", () => {
      fc.assert(
        fc.property(
          randomSchemaField("testField", {
            fieldType: fc.constant(FieldType.String),
            arrayChance: 0,
          }),
          fc.string(),
          (field, value) => {
            const isEmpty = schemaInterface.isEmptyValue(field, value);
            const length = schemaInterface.valueLength(field, value);

            if (isEmpty) {
              expect(length).toBe(0);
            } else {
              expect(length).toBeGreaterThan(0);
            }
          },
        ),
      );
    });
  });
});
