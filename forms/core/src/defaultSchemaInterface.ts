import {
  EqualityFunc,
  FieldOption,
  FieldType,
  SchemaField,
  ValidationMessageType,
} from "./schemaField";
import { SchemaInterface } from "./schemaInterface";
import { SchemaDataNode } from "./schemaDataNode";
import { SchemaNode } from "./schemaNode";
import { Control, ControlSetup } from "@astroapps/controls";

export class DefaultSchemaInterface implements SchemaInterface {
  constructor(
    protected boolStrings: [string, string] = ["No", "Yes"],
    protected parseDateTime: (s: string) => number = (s) => Date.parse(s),
  ) {}

  parseToMillis(field: SchemaField, v: string): number {
    return this.parseDateTime(v);
  }

  validationMessageText(
    field: SchemaField,
    messageType: ValidationMessageType,
    actual: any,
    expected: any,
  ): string {
    switch (messageType) {
      case ValidationMessageType.NotEmpty:
        return "Please enter a value";
      case ValidationMessageType.MinLength:
        return "Length must be at least " + expected;
      case ValidationMessageType.MaxLength:
        return "Length must be less than " + expected;
      case ValidationMessageType.NotBeforeDate:
        return `Date must not be before ${new Date(expected).toDateString()}`;
      case ValidationMessageType.NotAfterDate:
        return `Date must not be after ${new Date(expected).toDateString()}`;
      default:
        return "Unknown error";
    }
  }

  getDataOptions(node: SchemaDataNode): FieldOption[] | null | undefined {
    return this.getNodeOptions(node.schema);
  }

  getNodeOptions(node: SchemaNode): FieldOption[] | null | undefined {
    return this.getOptions(node.field);
  }

  getOptions({ options }: SchemaField): FieldOption[] | null | undefined {
    return options && options.length > 0 ? options : null;
  }

  getFilterOptions(
    array: SchemaDataNode,
    field: SchemaNode,
  ): FieldOption[] | undefined | null {
    return this.getNodeOptions(field);
  }

  isEmptyValue(f: SchemaField, value: any): boolean {
    if (f.collection)
      return Array.isArray(value) ? value.length === 0 : value == null;
    switch (f.type) {
      case FieldType.String:
      case FieldType.DateTime:
      case FieldType.Date:
      case FieldType.Time:
        return !value;
      default:
        return value == null;
    }
  }

  searchText(field: SchemaField, value: any): string {
    return this.textValue(field, value)?.toLowerCase() ?? "";
  }

  textValueForData(dataNode: SchemaDataNode): string | undefined {
    const options = this.getDataOptions(dataNode);
    return this.textValue(
      dataNode.schema.field,
      dataNode.control.value,
      dataNode.elementIndex != null,
      options,
    );
  }
  textValue(
    field: SchemaField,
    value: any,
    element?: boolean | undefined,
    options?: FieldOption[] | null,
  ): string | undefined {
    const actualOptions = options ?? this.getOptions(field);
    const option = actualOptions?.find((x) => x.value === value);
    if (option) return option.name;
    switch (field.type) {
      case FieldType.Date:
        return value ? new Date(value).toLocaleDateString() : undefined;
      case FieldType.DateTime:
        return value
          ? new Date(this.parseToMillis(field, value)).toLocaleString()
          : undefined;
      case FieldType.Time:
        return value
          ? new Date("1970-01-01T" + value).toLocaleTimeString()
          : undefined;
      case FieldType.Bool:
        return this.boolStrings[value ? 1 : 0];
      default:
        return value != null ? value.toString() : undefined;
    }
  }

  controlLength(f: SchemaField, control: Control<any>): number {
    return f.collection
      ? (control.elements?.length ?? 0)
      : this.valueLength(f, control.value);
  }

  valueLength(field: SchemaField, value: any): number {
    return (value && value?.length) ?? 0;
  }

  compareValue(field: SchemaField, v1: unknown, v2: unknown): number {
    if (v1 == null) return v2 == null ? 0 : 1;
    if (v2 == null) return -1;
    switch (field.type) {
      case FieldType.Date:
      case FieldType.DateTime:
      case FieldType.Time:
      case FieldType.String:
        return (v1 as string).localeCompare(v2 as string);
      case FieldType.Bool:
        return (v1 as boolean) ? ((v2 as boolean) ? 0 : 1) : -1;
      case FieldType.Int:
      case FieldType.Double:
        return (v1 as number) - (v2 as number);
      default:
        return 0;
    }
  }

  compoundFieldSetup(f: SchemaNode): [string, ControlSetup<any>][] {
    return f.getChildNodes().map((x) => {
      const { field } = x.field;
      return [field, this.makeControlSetup(x)];
    });
  }

  compoundFieldEquality(f: SchemaNode): [string, EqualityFunc][] {
    return f.getChildNodes().map((x) => {
      const { field } = x.field;
      return [field, (a, b) => this.makeEqualityFunc(x)(a[field], b[field])];
    });
  }

  makeEqualityFunc(field: SchemaNode, element?: boolean): EqualityFunc {
    if (field.field.collection && !element) {
      const elemEqual = this.makeEqualityFunc(field, true);
      return (a, b) => {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (!elemEqual(a[i], b[i])) return false;
        }
        return true;
      };
    }
    switch (field.field.type) {
      case FieldType.Compound:
        const allChecks = this.compoundFieldEquality(field);
        return (a, b) =>
          a === b ||
          (a != null && b != null && allChecks.every((x) => x[1](a, b)));
      default:
        return (a, b) => a === b;
    }
  }
  makeControlSetup(field: SchemaNode, element?: boolean): ControlSetup<any> {
    let setup: ControlSetup<any> = {
      equals: this.makeEqualityFunc(field, element),
    };
    if (field.field.collection && !element) {
      setup.elems = this.makeControlSetup(field, true);
      return setup;
    }
    switch (field.field.type) {
      case FieldType.Compound:
        setup.fields = Object.fromEntries(this.compoundFieldSetup(field));
    }
    return setup;
  }
}

export const defaultSchemaInterface: SchemaInterface =
  new DefaultSchemaInterface();
