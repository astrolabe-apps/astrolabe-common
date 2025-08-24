import { describe, expect, it } from "@jest/globals";
import fc from "fast-check";
import {
  // Control Builder imports
  dataControl,
  groupedControl,
  compoundControl,
  actionControl,
  textDisplayControl,
  htmlDisplayControl,
  dynamicDefaultValue,
  dynamicReadonly,
  dynamicVisibility,
  dynamicDisabled,
  dataExpr,
  dataMatchExpr,
  notEmptyExpr,
  jsonataExpr,
  uuidExpr,
  autocompleteOptions,
  checkListOptions,
  radioButtonOptions,
  textfieldOptions,
  displayOnlyOptions,
  jsonataOptions,
  lengthValidatorOptions,
  jsonataValidatorOptions,
  dateValidatorOptions,
  accordionOptions,
  // Schema Builder imports
  buildSchema,
  stringField,
  stringOptionsField,
  intField,
  doubleField,
  dateField,
  timeField,
  dateTimeField,
  boolField,
  compoundField,
  defaultScalarField,
  defaultCompoundField,
  mergeField,
  mergeOption,
  mergeFields,
  addFieldOption,
  resolveSchemas,
  // Types
  ControlDefinitionType,
  DataRenderType,
  ControlAdornmentType,
  ValidatorType,
  DateComparison,
  DynamicPropertyType,
  ExpressionType,
  DisplayDataType,
  FieldType,
  GroupRenderType,
  ActionStyle,
  IconPlacement,
  SchemaField,
  FieldOption,
  CompoundField,
  DataControlDefinition,
  GroupedControlsDefinition,
  ActionControlDefinition,
  DisplayControlDefinition,
  SchemaMap,
  isDataControl,
  isGroupControl,
  isActionControl,
  isDisplayControl,
  isCompoundField,
} from "../src";
import { arbitraryFieldName } from "./gen-schema";

describe("Control Builder", () => {
  describe("dataControl", () => {
    it("creates valid data control with minimal parameters", () => {
      fc.assert(
        fc.property(arbitraryFieldName(), (field) => {
          const control = dataControl(field);
          expect(control.type).toBe(ControlDefinitionType.Data);
          expect(control.field).toBe(field);
          expect(isDataControl(control)).toBe(true);
        }),
      );
    });

    it("creates data control with title and options", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.boolean(),
          fc.boolean(),
          (field, title, required, hideTitle) => {
            const control = dataControl(field, title, { required, hideTitle });
            expect(control.type).toBe(ControlDefinitionType.Data);
            expect(control.field).toBe(field);
            expect(control.title).toBe(title);
            expect(control.required).toBe(required);
            expect(control.hideTitle).toBe(hideTitle);
          },
        ),
      );
    });

    it("handles null title correctly", () => {
      fc.assert(
        fc.property(arbitraryFieldName(), (field) => {
          const control = dataControl(field, null);
          expect(control.title).toBe(null);
        }),
      );
    });
  });

  describe("groupedControl", () => {
    it("creates valid grouped control", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constant("Data"),
              field: arbitraryFieldName(),
            }),
          ),
          fc.option(fc.string(), { nil: undefined }),
          (children, title) => {
            const control = groupedControl(children as any[], title);
            expect(control.type).toBe(ControlDefinitionType.Group);
            expect(control.children).toEqual(children);
            expect(control.title).toBe(title);
            expect(control.groupOptions?.type).toBe("Standard");
            expect(control.groupOptions?.hideTitle).toBe(!title);
            expect(isGroupControl(control)).toBe(true);
          },
        ),
      );
    });

    it("creates grouped control with custom options", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constant("Data"),
              field: arbitraryFieldName(),
            }),
          ),
          fc.string(),
          fc.boolean(),
          (children, title, displayOnly) => {
            const control = groupedControl(children as any[], title, {
              groupOptions: { type: GroupRenderType.Grid, displayOnly },
            });
            expect(control.groupOptions?.type).toBe(GroupRenderType.Grid);
            expect(control.groupOptions?.displayOnly).toBe(displayOnly);
          },
        ),
      );
    });
  });

  describe("compoundControl", () => {
    it("creates valid compound control", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.array(
            fc.record({
              type: fc.constant("Data"),
              field: arbitraryFieldName(),
            }),
          ),
          (field, title, children) => {
            const control = compoundControl(field, title, children as any[]);
            expect(control.type).toBe(ControlDefinitionType.Data);
            expect(control.field).toBe(field);
            expect(control.title).toBe(title);
            expect(control.children).toEqual(children);
            expect(control.renderOptions?.type).toBe("Standard");
          },
        ),
      );
    });
  });

  describe("actionControl", () => {
    it("creates valid action control", () => {
      fc.assert(
        fc.property(
          fc.string(),
          arbitraryFieldName(),
          (actionText, actionId) => {
            const control = actionControl(actionText, actionId);
            expect(control.type).toBe(ControlDefinitionType.Action);
            expect(control.title).toBe(actionText);
            expect(control.actionId).toBe(actionId);
            expect(isActionControl(control)).toBe(true);
          },
        ),
      );
    });

    it("creates action control with options", () => {
      fc.assert(
        fc.property(
          fc.string(),
          arbitraryFieldName(),
          fc.constantFrom(...Object.values(ActionStyle)),
          fc.constantFrom(...Object.values(IconPlacement)),
          (actionText, actionId, actionStyle, iconPlacement) => {
            const control = actionControl(actionText, actionId, {
              actionStyle,
              iconPlacement,
            });
            expect(control.actionStyle).toBe(actionStyle);
            expect(control.iconPlacement).toBe(iconPlacement);
          },
        ),
      );
    });
  });

  describe("display controls", () => {
    it("creates valid text display control", () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const control = textDisplayControl(text);
          expect(control.type).toBe(ControlDefinitionType.Display);
          expect(control.displayData.type).toBe(DisplayDataType.Text);
          expect((control.displayData as any).text).toBe(text);
          expect(isDisplayControl(control)).toBe(true);
        }),
      );
    });

    it("creates valid html display control", () => {
      fc.assert(
        fc.property(fc.string(), (html) => {
          const control = htmlDisplayControl(html);
          expect(control.type).toBe(ControlDefinitionType.Display);
          expect(control.displayData.type).toBe(DisplayDataType.Html);
          expect((control.displayData as any).html).toBe(html);
        }),
      );
    });
  });

  describe("dynamic properties", () => {
    it("creates dynamic default value property", () => {
      fc.assert(
        fc.property(arbitraryFieldName(), (field) => {
          const expr = dataExpr(field);
          const dynamic = dynamicDefaultValue(expr);
          expect(dynamic.type).toBe(DynamicPropertyType.DefaultValue);
          expect(dynamic.expr).toBe(expr);
        }),
      );
    });

    it("creates all dynamic property types", () => {
      fc.assert(
        fc.property(arbitraryFieldName(), (field) => {
          const expr = dataExpr(field);

          const readonly = dynamicReadonly(expr);
          expect(readonly.type).toBe(DynamicPropertyType.Readonly);
          expect(readonly.expr).toBe(expr);

          const visibility = dynamicVisibility(expr);
          expect(visibility.type).toBe(DynamicPropertyType.Visible);
          expect(visibility.expr).toBe(expr);

          const disabled = dynamicDisabled(expr);
          expect(disabled.type).toBe(DynamicPropertyType.Disabled);
          expect(disabled.expr).toBe(expr);
        }),
      );
    });
  });

  describe("expressions", () => {
    it("creates data expression", () => {
      fc.assert(
        fc.property(arbitraryFieldName(), (field) => {
          const expr = dataExpr(field);
          expect(expr.type).toBe(ExpressionType.Data);
          expect(expr.field).toBe(field);
        }),
      );
    });

    it("creates data match expression", () => {
      fc.assert(
        fc.property(arbitraryFieldName(), fc.anything(), (field, value) => {
          const expr = dataMatchExpr(field, value);
          expect(expr.type).toBe(ExpressionType.DataMatch);
          expect(expr.field).toBe(field);
          expect(expr.value).toBe(value);
        }),
      );
    });

    it("creates not empty expression", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.option(fc.boolean(), { nil: undefined }),
          (field, empty) => {
            const expr = notEmptyExpr(field, empty);
            expect(expr.type).toBe(ExpressionType.NotEmpty);
            expect(expr.field).toBe(field);
            expect(expr.empty).toBe(empty);
          },
        ),
      );
    });

    it("creates jsonata expression", () => {
      fc.assert(
        fc.property(fc.string(), (expression) => {
          const expr = jsonataExpr(expression);
          expect(expr.type).toBe(ExpressionType.Jsonata);
          expect(expr.expression).toBe(expression);
        }),
      );
    });

    it("creates uuid expression", () => {
      const expr = uuidExpr;
      expect(expr.type).toBe(ExpressionType.UUID);
    });
  });

  describe("render options", () => {
    it("creates autocomplete options", () => {
      fc.assert(
        fc.property(
          fc.option(fc.string(), { nil: undefined }),
          fc.option(fc.string(), { nil: undefined }),
          (placeholder, listContainerClass) => {
            const options = autocompleteOptions({
              placeholder,
              listContainerClass,
            });
            expect(options.renderOptions.type).toBe(
              DataRenderType.Autocomplete,
            );
            expect(options.renderOptions.placeholder).toBe(placeholder);
            expect(options.renderOptions.listContainerClass).toBe(
              listContainerClass,
            );
          },
        ),
      );
    });

    it("creates check list options", () => {
      fc.assert(
        fc.property(
          fc.option(fc.string(), { nil: undefined }),
          (entryWrapperClass) => {
            const options = checkListOptions({ entryWrapperClass });
            expect(options.renderOptions.type).toBe(DataRenderType.CheckList);
            expect(options.renderOptions.entryWrapperClass).toBe(
              entryWrapperClass,
            );
          },
        ),
      );
    });

    it("creates radio button options", () => {
      fc.assert(
        fc.property(
          fc.option(fc.string(), { nil: undefined }),
          (selectedClass) => {
            const options = radioButtonOptions({ selectedClass });
            expect(options.renderOptions.type).toBe(DataRenderType.Radio);
            expect(options.renderOptions.selectedClass).toBe(selectedClass);
          },
        ),
      );
    });

    it("creates textfield options", () => {
      fc.assert(
        fc.property(
          fc.option(fc.string(), { nil: undefined }),
          fc.option(fc.boolean(), { nil: undefined }),
          (placeholder, multiline) => {
            const options = textfieldOptions({ placeholder, multiline });
            expect(options.renderOptions.type).toBe(DataRenderType.Textfield);
            expect(options.renderOptions.placeholder).toBe(placeholder);
            expect(options.renderOptions.multiline).toBe(multiline);
          },
        ),
      );
    });

    it("creates display only options", () => {
      fc.assert(
        fc.property(fc.option(fc.string(), { nil: undefined }), (emptyText) => {
          const options = displayOnlyOptions({ emptyText });
          expect(options.renderOptions.type).toBe(DataRenderType.DisplayOnly);
          expect(options.renderOptions.emptyText).toBe(emptyText);
        }),
      );
    });

    it("creates jsonata options", () => {
      fc.assert(
        fc.property(fc.string(), (expression) => {
          const options = jsonataOptions({ expression });
          expect(options.renderOptions.type).toBe(DataRenderType.Jsonata);
          expect(options.renderOptions.expression).toBe(expression);
        }),
      );
    });
  });

  describe("validator options", () => {
    it("creates length validator options", () => {
      fc.assert(
        fc.property(
          fc.option(fc.nat(), { nil: undefined }),
          fc.option(fc.nat(), { nil: undefined }),
          (min, max) => {
            const validator = lengthValidatorOptions({ min, max });
            expect(validator.type).toBe(ValidatorType.Length);
            expect(validator.min).toBe(min);
            expect(validator.max).toBe(max);
          },
        ),
      );
    });

    it("creates jsonata validator options", () => {
      fc.assert(
        fc.property(fc.string(), (expression) => {
          const validator = jsonataValidatorOptions({ expression });
          expect(validator.type).toBe(ValidatorType.Jsonata);
          expect(validator.expression).toBe(expression);
        }),
      );
    });

    it("creates date validator options", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(DateComparison)),
          fc.option(fc.string(), { nil: undefined }),
          fc.option(fc.integer(), { nil: undefined }),
          (comparison, fixedDate, daysFromCurrent) => {
            const validator = dateValidatorOptions({
              comparison,
              fixedDate,
              daysFromCurrent,
            });
            expect(validator.type).toBe(ValidatorType.Date);
            expect(validator.comparison).toBe(comparison);
            expect(validator.fixedDate).toBe(fixedDate);
            expect(validator.daysFromCurrent).toBe(daysFromCurrent);
          },
        ),
      );
    });
  });

  describe("adornment options", () => {
    it("creates accordion options", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.option(fc.boolean(), { nil: undefined }),
          (title, defaultExpanded) => {
            const adornment = accordionOptions({ title, defaultExpanded });
            expect(adornment.type).toBe(ControlAdornmentType.Accordion);
            expect(adornment.title).toBe(title);
            expect(adornment.defaultExpanded).toBe(defaultExpanded);
          },
        ),
      );
    });
  });
});

describe("Schema Builder", () => {
  describe("field builders", () => {
    it("creates string field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            const field = stringField(displayName)(fieldName);
            expect(field.field).toBe(fieldName);
            expect(field.displayName).toBe(displayName);
            expect(field.type).toBe(FieldType.String);
          },
        ),
      );
    });

    it("creates string field with options", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.boolean(),
          (fieldName, displayName, required) => {
            const field = stringField(displayName, { required })(fieldName);
            expect(field.required).toBe(required);
            expect(field.type).toBe(FieldType.String);
          },
        ),
      );
    });

    it("creates string options field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.array(fc.record({ name: fc.string(), value: fc.anything() }), {
            minLength: 1,
          }),
          (fieldName, displayName, options) => {
            const field = stringOptionsField(
              displayName,
              ...options,
            )(fieldName);
            expect(field.options).toEqual(options);
            expect(field.type).toBe(FieldType.String);
          },
        ),
      );
    });

    it("creates int field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            const field = intField(displayName)(fieldName);
            expect(field.field).toBe(fieldName);
            expect(field.displayName).toBe(displayName);
            expect(field.type).toBe(FieldType.Int);
          },
        ),
      );
    });

    it("creates double field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            const field = doubleField(displayName)(fieldName);
            expect(field.type).toBe(FieldType.Double);
          },
        ),
      );
    });

    it("creates date field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            const field = dateField(displayName)(fieldName);
            expect(field.type).toBe(FieldType.Date);
          },
        ),
      );
    });

    it("creates time field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            const field = timeField(displayName)(fieldName);
            expect(field.type).toBe(FieldType.Time);
          },
        ),
      );
    });

    it("creates datetime field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            const field = dateTimeField(displayName)(fieldName);
            expect(field.type).toBe(FieldType.DateTime);
          },
        ),
      );
    });

    it("creates bool field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            const field = boolField(displayName)(fieldName);
            expect(field.type).toBe(FieldType.Bool);
          },
        ),
      );
    });

    it("creates compound field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.array(
            fc.record({
              field: arbitraryFieldName(),
              type: fc.constantFrom(...Object.values(FieldType)),
              displayName: fc.string(),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          fc.option(fc.boolean(), { nil: undefined }),
          (fieldName, displayName, children, collection) => {
            const field = compoundField(
              displayName,
              children as SchemaField[],
              { collection },
            )(fieldName);
            expect(field.type).toBe(FieldType.Compound);
            expect(field.children).toEqual(children);
            expect(field.collection).toBe(collection);
            expect(isCompoundField(field)).toBe(true);
          },
        ),
      );
    });
  });

  describe("default field functions", () => {
    it("creates default scalar field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            const field = defaultScalarField(fieldName, displayName);
            expect(field.field).toBe(fieldName);
            expect(field.displayName).toBe(displayName);
            expect(field.type).toBe(FieldType.String);
          },
        ),
      );
    });

    it("creates default compound field", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.boolean(),
          (fieldName, displayName, collection) => {
            const field = defaultCompoundField(
              fieldName,
              displayName,
              collection,
            );
            expect(field.field).toBe(fieldName);
            expect(field.displayName).toBe(displayName);
            expect(field.type).toBe(FieldType.Compound);
            expect(field.collection).toBe(collection);
            expect(field.children).toEqual([]);
          },
        ),
      );
    });
  });

  describe("field operations", () => {
    it("merges field into existing array", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              field: arbitraryFieldName(),
              type: fc.constantFrom(...Object.values(FieldType)),
              displayName: fc.string(),
              onlyForTypes: fc.option(fc.array(fc.string()), {
                nil: undefined,
              }),
            }),
            { minLength: 0, maxLength: 5 },
          ),
          fc.record({
            field: arbitraryFieldName(),
            type: fc.constantFrom(...Object.values(FieldType)),
            displayName: fc.string(),
            onlyForTypes: fc.option(fc.array(fc.string()), { nil: undefined }),
          }),
          (existingFields, newField) => {
            const result = mergeField(
              newField as SchemaField,
              existingFields as SchemaField[],
            );

            const existingField = existingFields.find(
              (f) => f.field === newField.field,
            );
            if (existingField) {
              // Should have same length (existing field modified, not replaced)
              expect(result).toHaveLength(existingFields.length);

              // Should preserve existing field's properties except onlyForTypes
              const resultField = result.find(
                (f) => f.field === newField.field,
              )!;
              expect(resultField.displayName).toBe(existingField.displayName);
              expect(resultField.type).toBe(existingField.type);

              // Should merge onlyForTypes
              const expectedOnlyForTypes = mergeTypes(
                existingField.onlyForTypes,
                newField.onlyForTypes,
              );
              expect(resultField.onlyForTypes).toEqual(expectedOnlyForTypes);
            } else {
              // Should add the new field
              expect(result).toHaveLength(existingFields.length + 1);
              const addedField = result.find(
                (f) => f.field === newField.field,
              )!;
              expect(addedField).toEqual(newField);
            }
          },
        ),
      );
    });

    it("adds field option correctly", () => {
      fc.assert(
        fc.property(
          fc.record({
            field: arbitraryFieldName(),
            type: fc.constantFrom(...Object.values(FieldType)),
            displayName: fc.string(),
            options: fc.option(
              fc.array(
                fc.record({
                  name: fc.string(),
                  value: fc.anything(),
                }),
              ),
              { nil: undefined },
            ),
          }),
          fc.string(),
          fc.anything(),
          (field, name, value) => {
            const result = addFieldOption(field as SchemaField, name, value);

            const existingOption = field.options?.some(
              (opt) => opt.value === value,
            );
            if (existingOption) {
              // Should not add duplicate
              expect(result.options).toEqual(field.options);
            } else {
              // Should add new option
              const expectedLength = (field.options?.length || 0) + 1;
              expect(result.options).toHaveLength(expectedLength);
              expect(
                result.options?.some(
                  (opt) => opt.name === name && opt.value === value,
                ),
              ).toBe(true);
            }
          },
        ),
      );
    });

    it("merges option into field array", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              field: arbitraryFieldName(),
              type: fc.constantFrom(...Object.values(FieldType)),
              displayName: fc.string(),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          fc.string(),
          fc.anything(),
          (fields, name, value) => {
            const targetFieldName = fields[0].field;
            const result = mergeOption(
              fields as SchemaField[],
              name,
              value,
              targetFieldName,
            );

            expect(result).toHaveLength(fields.length);
            const targetField = result.find((f) => f.field === targetFieldName);
            expect(targetField).toBeDefined();
            expect(
              targetField!.options?.some(
                (opt) => opt.name === name && opt.value === value,
              ),
            ).toBe(true);
          },
        ),
      );
    });

    it("merges fields correctly", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              field: arbitraryFieldName(),
              type: fc.constantFrom(...Object.values(FieldType)),
              displayName: fc.string(),
              isTypeField: fc.option(fc.boolean(), { nil: undefined }),
            }),
            { minLength: 0, maxLength: 3 },
          ),
          fc.string(),
          fc.anything(),
          fc.array(
            fc.record({
              field: arbitraryFieldName(),
              type: fc.constantFrom(...Object.values(FieldType)),
              displayName: fc.string(),
            }),
            { minLength: 1, maxLength: 3 },
          ),
          (existingFields, name, value, newFields) => {
            const result = mergeFields(
              existingFields as SchemaField[],
              name,
              value,
              newFields as SchemaField[],
            );

            // Result should contain at least the original fields
            expect(result.length).toBeGreaterThanOrEqual(existingFields.length);

            // All original fields should still be present (possibly modified)
            existingFields.forEach((field) => {
              expect(result.some((f) => f.field === field.field)).toBe(true);
            });

            if (name === "*") {
              // When merging all fields, should include new fields
              newFields.forEach((field) => {
                expect(result.some((f) => f.field === field.field)).toBe(true);
              });
            }
          },
        ),
      );
    });
  });

  describe("schema resolution", () => {
    it("resolves schemas with references", () => {
      fc.assert(
        fc.property(
          fc.record({
            main: fc.array(
              fc.record({
                field: arbitraryFieldName(),
                type: fc.constant(FieldType.Compound),
                displayName: fc.string(),
                schemaRef: fc.constant("referenced"),
              }),
              { minLength: 1, maxLength: 2 },
            ),
            referenced: fc.array(
              fc.record({
                field: arbitraryFieldName(),
                type: fc.constantFrom(FieldType.String, FieldType.Int),
                displayName: fc.string(),
              }),
              { minLength: 1, maxLength: 3 },
            ),
          }),
          (schemaMap) => {
            const resolved = resolveSchemas(schemaMap as SchemaMap);

            expect(resolved.main).toBeDefined();
            expect(resolved.referenced).toBeDefined();

            // Main schema compound fields should have their children resolved
            resolved.main.forEach((field) => {
              if (isCompoundField(field) && field.schemaRef === "referenced") {
                expect(field.children).toEqual(resolved.referenced);
              }
            });
          },
        ),
      );
    });

    it("preserves non-referenced compound fields", () => {
      fc.assert(
        fc.property(
          fc.record({
            main: fc.array(
              fc.record({
                field: arbitraryFieldName(),
                type: fc.constant(FieldType.Compound),
                displayName: fc.string(),
                children: fc.array(
                  fc.record({
                    field: arbitraryFieldName(),
                    type: fc.constant(FieldType.String),
                    displayName: fc.string(),
                  }),
                  { minLength: 1, maxLength: 2 },
                ),
              }),
              { minLength: 1, maxLength: 2 },
            ),
          }),
          (schemaMap) => {
            const resolved = resolveSchemas(schemaMap as SchemaMap);

            resolved.main.forEach((resolvedField, index) => {
              if (isCompoundField(resolvedField) && !resolvedField.schemaRef) {
                const originalField = (schemaMap.main as any)[index];
                expect(resolvedField.children).toEqual(originalField.children);
              }
            });
          },
        ),
      );
    });
  });

  describe("buildSchema", () => {
    it("builds schema with all field types", () => {
      interface MySchema {
        stringField: string;
        intField: number;
        doubleField: number;
        boolField: boolean;
        dateField: string;
        timeField: string;
        dateTimeField: string;
      }
      const fieldDefs = {
        stringField: stringField("String"),
        intField: intField("Integer"),
        doubleField: doubleField("Double"),
        boolField: boolField("Boolean"),
        dateField: dateField("Date"),
        timeField: timeField("Time"),
        dateTimeField: dateTimeField("DateTime"),
      };

      const schema = buildSchema<MySchema>(fieldDefs);

      expect(schema).toHaveLength(7);

      const typeMap = Object.fromEntries(schema.map((f) => [f.field, f.type]));
      expect(typeMap.stringField).toBe(FieldType.String);
      expect(typeMap.intField).toBe(FieldType.Int);
      expect(typeMap.doubleField).toBe(FieldType.Double);
      expect(typeMap.boolField).toBe(FieldType.Bool);
      expect(typeMap.dateField).toBe(FieldType.Date);
      expect(typeMap.timeField).toBe(FieldType.Time);
      expect(typeMap.dateTimeField).toBe(FieldType.DateTime);
    });
  });

  describe("integration tests", () => {
    it("field builders work with control builders", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.option(fc.boolean(), { nil: undefined }),
          (fieldName, displayName, required) => {
            // Build schema field
            const schemaField = stringField(displayName, { required })(
              fieldName,
            );

            // Build control using the schema field
            const control = dataControl(
              schemaField.field,
              schemaField.displayName,
              {
                required: schemaField.required,
              },
            );

            expect(control.field).toBe(schemaField.field);
            expect(control.title).toBe(schemaField.displayName);
            expect(control.required).toBe(schemaField.required);
          },
        ),
      );
    });

    it("compound schema fields work with compound controls", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.array(
            fc.record({
              field: arbitraryFieldName(),
              displayName: fc.string(),
            }),
            { minLength: 1, maxLength: 3 },
          ),
          (fieldName, displayName, childSpecs) => {
            // Build child schema fields
            const children = childSpecs.map((spec) =>
              stringField(spec.displayName)(spec.field),
            );

            // Build compound schema field
            const compoundSchema = compoundField(
              displayName,
              children,
            )(fieldName);

            // Build child controls
            const childControls = children.map((child) =>
              dataControl(child.field, child.displayName),
            );

            // Build compound control
            const compControl = compoundControl(
              compoundSchema.field,
              compoundSchema.displayName,
              childControls,
            );

            expect(compControl.field).toBe(compoundSchema.field);
            expect(compControl.title).toBe(compoundSchema.displayName);
            expect(compControl.children).toHaveLength(children.length);
            expect(isCompoundField(compoundSchema)).toBe(true);
          },
        ),
      );
    });

    it("validators work with controls and schema fields", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.nat(100),
          fc.nat(100),
          (fieldName, displayName, min, max) => {
            // Ensure min <= max
            const minLength = Math.min(min, max);
            const maxLength = Math.max(min, max);

            // Build schema field
            const schemaField = stringField(displayName)(fieldName);

            // Build control with length validator
            const control = dataControl(
              schemaField.field,
              schemaField.displayName,
              {
                validators: [
                  lengthValidatorOptions({ min: minLength, max: maxLength }),
                ],
              },
            );

            expect(control.validators).toHaveLength(1);
            expect(control.validators![0].type).toBe(ValidatorType.Length);
            expect((control.validators![0] as any).min).toBe(minLength);
            expect((control.validators![0] as any).max).toBe(maxLength);
          },
        ),
      );
    });

    it("expressions work with dynamic properties", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          arbitraryFieldName(),
          fc.string(),
          (sourceField, targetField, displayName) => {
            fc.pre(sourceField !== targetField); // Ensure different fields

            // Build schema fields
            const sourceSchema = stringField("Source")(sourceField);
            const targetSchema = stringField(displayName)(targetField);

            // Build control with dynamic visibility based on source field
            const control = dataControl(
              targetSchema.field,
              targetSchema.displayName,
              {
                dynamic: [dynamicVisibility(notEmptyExpr(sourceField))],
              },
            );

            expect(control.dynamic).toHaveLength(1);
            expect(control.dynamic![0].type).toBe(DynamicPropertyType.Visible);
            expect(control.dynamic![0].expr.type).toBe(ExpressionType.NotEmpty);
            expect((control.dynamic![0].expr as any).field).toBe(sourceField);
          },
        ),
      );
    });

    it("render options work with data controls", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.option(fc.string(), { nil: undefined }),
          fc.option(fc.boolean(), { nil: undefined }),
          (fieldName, displayName, placeholder, multiline) => {
            // Build schema field
            const schemaField = stringField(displayName)(fieldName);

            // Build control with textfield options
            const controlOptions = textfieldOptions({ placeholder, multiline });
            const control = dataControl(
              schemaField.field,
              schemaField.displayName,
              controlOptions,
            );

            expect(control.renderOptions?.type).toBe(DataRenderType.Textfield);
            expect((control.renderOptions as any).placeholder).toBe(
              placeholder,
            );
            expect((control.renderOptions as any).multiline).toBe(multiline);
          },
        ),
      );
    });

    it("complex schema with multiple field types resolves correctly", () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.constant("user"),
            profileId: fc.constant("profile"),
            addressId: fc.constant("address"),
          }),
          (refs) => {
            // Build a complex schema map with references
            const schemaMap: SchemaMap = {
              user: [
                stringField("Name")("name"),
                stringField("Email")("email"),
                compoundField("Profile", [], { schemaRef: refs.profileId })(
                  "profile",
                ),
              ],
              profile: [
                intField("Age")("age"),
                boolField("Active")("active"),
                compoundField("Address", [], { schemaRef: refs.addressId })(
                  "address",
                ),
              ],
              address: [
                stringField("Street")("street"),
                stringField("City")("city"),
                stringField("Country")("country"),
              ],
            };

            const resolved = resolveSchemas(schemaMap);

            // Check that user schema is resolved correctly
            expect(resolved.user).toHaveLength(3);
            const userProfile = resolved.user.find(
              (f) => f.field === "profile",
            );
            expect(userProfile).toBeDefined();
            expect(isCompoundField(userProfile!)).toBe(true);
            expect((userProfile as CompoundField).children).toEqual(
              resolved.profile,
            );

            // Check that profile schema has resolved address reference
            const profileAddress = resolved.profile.find(
              (f) => f.field === "address",
            );
            expect(profileAddress).toBeDefined();
            expect(isCompoundField(profileAddress!)).toBe(true);
            expect((profileAddress as CompoundField).children).toEqual(
              resolved.address,
            );

            // Check that address schema is as expected
            expect(resolved.address).toHaveLength(3);
            expect(
              resolved.address.every((f) => f.type === FieldType.String),
            ).toBe(true);
          },
        ),
      );
    });
  });

  describe("edge cases and error handling", () => {
    it("handles empty field arrays", () => {
      const emptySchema = buildSchema({});
      expect(emptySchema).toEqual([]);

      const emptyMerge = mergeField(stringField("Test")("test"), []);
      expect(emptyMerge).toHaveLength(1);
      expect(emptyMerge[0].field).toBe("test");
    });

    it("handles duplicate field merging", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          fc.string(),
          fc.option(fc.array(fc.string()), { nil: undefined }),
          fc.option(fc.array(fc.string()), { nil: undefined }),
          (
            fieldName,
            displayName1,
            displayName2,
            onlyForTypes1,
            onlyForTypes2,
          ) => {
            const field1 = {
              ...stringField(displayName1)(fieldName),
              onlyForTypes: onlyForTypes1,
            };
            const field2 = {
              ...stringField(displayName2)(fieldName),
              onlyForTypes: onlyForTypes2,
            };

            const merged = mergeField(field2, [field1]);
            expect(merged).toHaveLength(1);
            expect(merged[0].displayName).toBe(displayName1); // Should keep existing field's displayName
            expect(merged[0].field).toBe(fieldName);

            // Should merge onlyForTypes arrays
            const expectedOnlyForTypes = mergeTypes(
              onlyForTypes1,
              onlyForTypes2,
            );
            expect(merged[0].onlyForTypes).toEqual(expectedOnlyForTypes);
          },
        ),
      );
    });

    it("handles null and undefined values in options", () => {
      fc.assert(
        fc.property(
          arbitraryFieldName(),
          fc.string(),
          (fieldName, displayName) => {
            // Test various null/undefined combinations
            const control1 = dataControl(fieldName, null);
            expect(control1.title).toBe(null);

            const control2 = dataControl(fieldName, undefined);
            expect(control2.title).toBe(undefined);

            const field1 = stringField(displayName, { required: null } as any)(
              fieldName,
            );
            expect(field1.required).toBe(null);

            const field2 = stringField(displayName, { required: undefined })(
              fieldName,
            );
            expect(field2.required).toBe(undefined);
          },
        ),
      );
    });

    it("preserves field properties during operations", () => {
      fc.assert(
        fc.property(
          fc.record({
            field: arbitraryFieldName(),
            type: fc.constantFrom(...Object.values(FieldType)),
            displayName: fc.string(),
            required: fc.option(fc.boolean(), { nil: undefined }),
            collection: fc.option(fc.boolean(), { nil: undefined }),
            tags: fc.option(fc.array(fc.string()), { nil: undefined }),
          }),
          (fieldSpec) => {
            const originalField = fieldSpec as SchemaField;

            // Test that adding options preserves other properties
            const withOptions = addFieldOption(originalField, "test", "value");
            expect(withOptions.field).toBe(originalField.field);
            expect(withOptions.type).toBe(originalField.type);
            expect(withOptions.displayName).toBe(originalField.displayName);
            expect(withOptions.required).toBe(originalField.required);
            expect(withOptions.collection).toBe(originalField.collection);
            expect(withOptions.tags).toBe(originalField.tags);

            // Test that merging preserves properties
            const merged = mergeField(originalField, []);
            expect(merged[0]).toEqual(originalField);
          },
        ),
      );
    });
  });
});

// Helper function to match the implementation's mergeTypes logic
function mergeTypes(f?: string[] | null, s?: string[] | null) {
  if (!f) return s;
  if (!s) return f;
  const extras = s.filter((x) => !f.includes(x));
  return extras.length ? [...f, ...extras] : f;
}
