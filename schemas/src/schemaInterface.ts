import {
  FieldOption,
  FieldType,
  SchemaField,
  SchemaInterface,
  ValidationMessageType,
} from "./types";
import { Control } from "@react-typed-forms/core";
import {SchemaDataNode, SchemaNode} from "./treeNodes";

export class DefaultSchemaInterface implements SchemaInterface {
  constructor(protected boolStrings: [string, string] = ["No", "Yes"]) {}

  parseToMillis(field: SchemaField, v: string): number {
    return Date.parse(v);
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

  getOptions({ options }: SchemaField): FieldOption[] | null | undefined {
    return options && options.length > 0 ? options : null;
  }

  getFilterOptions(array: SchemaDataNode, field: SchemaNode): FieldOption[] | undefined | null {
    return this.getOptions(field.field);
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
  textValue(
    field: SchemaField,
    value: any,
    element?: boolean | undefined,
  ): string | undefined {
    switch (field.type) {
      case FieldType.Date:
        return value ? new Date(value).toLocaleDateString() : undefined;
      case FieldType.DateTime:
        return value ? new Date(value).toLocaleString() : undefined;
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
}

export const defaultSchemaInterface: SchemaInterface =
  new DefaultSchemaInterface();
