import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  DefaultSchemaInterface,
  FieldType,
  SchemaField,
  ValidationMessageType,
  createSchemaDataNode,
  createSchemaTree,
  FieldOption,
} from "../src";
import { newControl } from "@astroapps/controls";

// Test data generators
const stringField = (): SchemaField => ({
  field: "testField",
  type: FieldType.String,
  displayName: "Test Field",
});

const intField = (): SchemaField => ({
  field: "testField",
  type: FieldType.Int,
  displayName: "Test Field",
});

const boolField = (): SchemaField => ({
  field: "testField",
  type: FieldType.Bool,
  displayName: "Test Field",
});

const dateField = (): SchemaField => ({
  field: "testField",
  type: FieldType.Date,
  displayName: "Test Field",
});

const dateTimeField = (): SchemaField => ({
  field: "testField",
  type: FieldType.DateTime,
  displayName: "Test Field",
});

const fieldWithOptions = (options: FieldOption[]): SchemaField => ({
  field: "testField",
  type: FieldType.String,
  displayName: "Test Field",
  options,
});

const collectionField = (baseField: SchemaField): SchemaField => ({
  ...baseField,
  collection: true,
});

describe("DefaultSchemaInterface property tests", () => {
  const schemaInterface = new DefaultSchemaInterface();

  describe("isEmptyValue", () => {
    it("string fields: empty strings are empty, non-empty strings are not empty", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const field = stringField();
          const isEmpty = schemaInterface.isEmptyValue(field, value);
          expect(isEmpty).toBe(!value); // Empty if falsy
        }),
      );
    });

    it("collection fields: empty arrays are empty, non-empty arrays are not empty", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), (value) => {
          const field = collectionField(stringField());
          const isEmpty = schemaInterface.isEmptyValue(field, value);
          expect(isEmpty).toBe(value.length === 0);
        }),
      );
    });

    it("null and undefined are always empty", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            FieldType.String,
            FieldType.Int,
            FieldType.Bool,
            FieldType.Date,
          ),
          (fieldType) => {
            const field = { ...stringField(), type: fieldType };
            expect(schemaInterface.isEmptyValue(field, null)).toBe(true);
            expect(schemaInterface.isEmptyValue(field, undefined)).toBe(true);
          },
        ),
      );
    });

    it("numbers: zero is not empty, null/undefined is empty", () => {
      fc.assert(
        fc.property(fc.integer(), (value) => {
          const field = intField();
          const isEmpty = schemaInterface.isEmptyValue(field, value);
          expect(isEmpty).toBe(value == null);
        }),
      );
    });
  });

  describe("textValue", () => {
    it("string values return themselves", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const field = stringField();
          const text = schemaInterface.textValue(field, value);
          expect(text).toBe(value);
        }),
      );
    });

    it("boolean values use boolStrings", () => {
      fc.assert(
        fc.property(fc.boolean(), (value) => {
          const field = boolField();
          const text = schemaInterface.textValue(field, value);
          expect(text).toBe(value ? "Yes" : "No");
        }),
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
              return fc.constant(uniqueOptions);
            }),
          (options) => {
            fc.assert(
              fc.property(
                fc.integer({ min: 0, max: options.length - 1 }),
                (index) => {
                  const selectedOption = options[index];
                  const field = fieldWithOptions(options);
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
          fc.date({ min: new Date(1970, 0, 1), max: new Date(2100, 11, 31) }),
          (date) => {
            const field = dateField();
            // Format date as YYYY-MM-DD string as expected for Date field type
            const dateString = date.toISOString().substring(0, 10);
            const text = schemaInterface.textValue(field, dateString);
            expect(text).toBe(new Date(dateString).toLocaleDateString());
          },
        ),
      );
    });

    it("null/undefined values return undefined", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            FieldType.String,
            FieldType.Int,
            FieldType.Bool,
            FieldType.Date,
          ),
          (fieldType) => {
            const field = { ...stringField(), type: fieldType };
            expect(schemaInterface.textValue(field, null)).toBeUndefined();
            expect(schemaInterface.textValue(field, undefined)).toBeUndefined();
          },
        ),
      );
    });
  });

  describe("valueLength", () => {
    it("string length equals string.length", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const field = stringField();
          const length = schemaInterface.valueLength(field, value);
          expect(length).toBe(value?.length ?? 0);
        }),
      );
    });

    it("null/undefined values have zero length", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(FieldType.String, FieldType.Int, FieldType.Bool),
          (fieldType) => {
            const field = { ...stringField(), type: fieldType };
            expect(schemaInterface.valueLength(field, null)).toBe(0);
            expect(schemaInterface.valueLength(field, undefined)).toBe(0);
          },
        ),
      );
    });
  });

  describe("controlLength", () => {
    it("collection control length equals elements array length", () => {
      fc.assert(
        fc.property(fc.array(fc.string(), { maxLength: 100 }), (values) => {
          const field = collectionField(stringField());
          const control = newControl(values);
          const length = schemaInterface.controlLength(field, control);
          expect(length).toBe(values.length);
        }),
      );
    });

    it("non-collection control length equals value length", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const field = stringField();
          const control = newControl(value);
          const length = schemaInterface.controlLength(field, control);
          expect(length).toBe(value?.length ?? 0);
        }),
      );
    });
  });

  describe("compareValue", () => {
    it("string comparison is consistent with localeCompare", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (a, b) => {
          const field = stringField();
          const result = schemaInterface.compareValue(field, a, b);
          const expected = a.localeCompare(b);
          // Both should have same sign (or both zero)
          expect(Math.sign(result)).toBe(Math.sign(expected));
        }),
      );
    });

    it("number comparison is consistent with subtraction", () => {
      fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
          const field = intField();
          const result = schemaInterface.compareValue(field, a, b);
          const expected = a - b;
          expect(Math.sign(result)).toBe(Math.sign(expected));
        }),
      );
    });

    it("null values are handled consistently", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const field = stringField();
          // null should be greater than any value
          expect(schemaInterface.compareValue(field, null, value)).toBe(1);
          expect(schemaInterface.compareValue(field, value, null)).toBe(-1);
          // null equals null
          expect(schemaInterface.compareValue(field, null, null)).toBe(0);
        }),
      );
    });

    it("comparison is reflexive: compare(a, a) === 0", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          fc.constantFrom(FieldType.String, FieldType.Int, FieldType.Bool),
          (value, fieldType) => {
            const field = { ...stringField(), type: fieldType };
            const result = schemaInterface.compareValue(field, value, value);
            expect(result).toBe(0);
          },
        ),
      );
    });

    it("comparison is antisymmetric: compare(a, b) === -compare(b, a)", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (a, b) => {
          const field = stringField();
          const resultAB = schemaInterface.compareValue(field, a, b);
          const resultBA = schemaInterface.compareValue(field, b, a);
          expect(resultAB).toBe(0 - resultBA);
        }),
      );
    });
  });

  describe("searchText", () => {
    it("search text is always lowercase", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const field = stringField();
          const searchText = schemaInterface.searchText(field, value);
          expect(searchText).toBe(searchText.toLowerCase());
        }),
      );
    });

    it("search text matches textValue when available", () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => s.trim() !== ""),
          (value) => {
            const field = stringField();
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
      const field = stringField();
      const message = schemaInterface.validationMessageText(
        field,
        ValidationMessageType.NotEmpty,
        false,
        true,
      );
      expect(message).toBe("Please enter a value");
    });

    it("returns appropriate message for length validations", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (expectedLength) => {
          const field = stringField();

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
        }),
      );
    });

    it("returns appropriate message for date validations", () => {
      fc.assert(
        fc.property(fc.date(), (date) => {
          const field = dateField();
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
        }),
      );
    });
  });

  describe("makeEqualityFunc", () => {
    it("equality function is reflexive: equals(a, a) is always true", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
          (value) => {
            const schema = createSchemaTree([
              stringField(),
            ]).rootNode.getChildNode("testField");
            const equalityFunc = schemaInterface.makeEqualityFunc(schema);
            expect(equalityFunc(value, value)).toBe(true);
          },
        ),
      );
    });

    it("equality function is symmetric: equals(a, b) === equals(b, a)", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (a, b) => {
          const schema = createSchemaTree([
            stringField(),
          ]).rootNode.getChildNode("testField");
          const equalityFunc = schemaInterface.makeEqualityFunc(schema);
          expect(equalityFunc(a, b)).toBe(equalityFunc(b, a));
        }),
      );
    });

    it("equality function handles null/undefined correctly", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const schema = createSchemaTree([
            stringField(),
          ]).rootNode.getChildNode("testField");
          const equalityFunc = schemaInterface.makeEqualityFunc(schema);

          expect(equalityFunc(null, null)).toBe(true);
          expect(equalityFunc(undefined, undefined)).toBe(true);
          expect(equalityFunc(null, undefined)).toBe(false);
          expect(equalityFunc(undefined, null)).toBe(false);
          expect(equalityFunc(value, null)).toBe(false);
          expect(equalityFunc(null, value)).toBe(false);
        }),
      );
    });

    it("array equality checks length and elements", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { maxLength: 10 }),
          fc.array(fc.string(), { maxLength: 10 }),
          (arr1, arr2) => {
            const schema = createSchemaTree([
              collectionField(stringField()),
            ]).rootNode.getChildNode("testField");
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
          fc.date({ min: new Date(1970, 0, 2), max: new Date(2100, 11, 31) }),
          (date) => {
            const field = dateTimeField();
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
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          fc.constantFrom(FieldType.String, FieldType.Int, FieldType.Bool),
          (value, fieldType) => {
            const field = { ...stringField(), type: fieldType };
            const textValue = schemaInterface.textValue(field, value);
            const searchText = schemaInterface.searchText(field, value);

            if (textValue) {
              expect(searchText).toBe(textValue.toLowerCase());
            } else {
              expect(searchText).toBe("");
            }
          },
        ),
      );
    });

    it("isEmptyValue and valueLength are consistent", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const field = stringField();
          const isEmpty = schemaInterface.isEmptyValue(field, value);
          const length = schemaInterface.valueLength(field, value);

          if (isEmpty) {
            expect(length).toBe(0);
          } else {
            expect(length).toBeGreaterThan(0);
          }
        }),
      );
    });
  });
});
