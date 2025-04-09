import { Control, ControlSetup } from "@react-typed-forms/core";
import {
  EqualityFunc,
  FieldOption,
  SchemaField,
  ValidationMessageType,
} from "./schemaField";
import { SchemaDataNode } from "./schemaDataNode";
import { SchemaNode } from "./schemaNode";

/**
 * Interface for schema-related operations.
 */
export interface SchemaInterface {
  /**
   * Checks if the value of a field is empty.
   * @param field The schema field.
   * @param value The value to check.
   * @returns True if the value is empty, false otherwise.
   */
  isEmptyValue(field: SchemaField, value: any): boolean;

  /**
   * Gets the text representation of a field's value.
   * @param field The schema field.
   * @param value The value to convert.
   * @param element Indicates if the value is an element, optional.
   * @returns The text representation of the value.
   */
  textValue(
    field: SchemaField,
    value: any,
    element?: boolean,
  ): string | undefined;

  /**
   * Gets the length of a control's value.
   * @param field The schema field.
   * @param control The control to check.
   * @returns The length of the control's value.
   */
  controlLength(field: SchemaField, control: Control<any>): number;

  /**
   * Gets the length of a field's value.
   * @param field The schema field.
   * @param value The value to check.
   * @returns The length of the value.
   */
  valueLength(field: SchemaField, value: any): number;

  /**
   * Gets the data options for a schema data node.
   * @param node The schema data node.
   * @returns The data options.
   */
  getDataOptions(node: SchemaDataNode): FieldOption[] | null | undefined;

  /**
   * Gets the node options for a schema node.
   * @param node The schema node.
   * @returns The node options.
   */
  getNodeOptions(node: SchemaNode): FieldOption[] | null | undefined;

  /**
   * Gets the options for a schema field.
   * @param field The schema field.
   * @returns The field options.
   */
  getOptions(field: SchemaField): FieldOption[] | undefined | null;

  /**
   * Gets the filter options for a schema data node and field.
   * @param array The schema data node.
   * @param field The schema node.
   * @returns The filter options.
   */
  getFilterOptions(
    array: SchemaDataNode,
    field: SchemaNode,
  ): FieldOption[] | undefined | null;

  /**
   * Parses a string value to milliseconds.
   * @param field The schema field.
   * @param v The string value to parse.
   * @returns The parsed value in milliseconds.
   */
  parseToMillis(field: SchemaField, v: string): number;

  /**
   * Gets the validation message text for a field.
   * @param field The schema field.
   * @param messageType The type of validation message.
   * @param actual The actual value.
   * @param expected The expected value.
   * @returns The validation message text.
   */
  validationMessageText(
    field: SchemaField,
    messageType: ValidationMessageType,
    actual: any,
    expected: any,
  ): string;

  /**
   * Compares two values of a field.
   * @param field The schema field.
   * @param v1 The first value.
   * @param v2 The second value.
   * @returns The comparison result.
   */
  compareValue(field: SchemaField, v1: unknown, v2: unknown): number;

  /**
   * Gets the search text for a field's value.
   * @param field The schema field.
   * @param value The value to search.
   * @returns The search text.
   */
  searchText(field: SchemaField, value: any): string;

  makeEqualityFunc(field: SchemaNode, element?: boolean): EqualityFunc;

  makeControlSetup(field: SchemaNode, element?: boolean): ControlSetup<any>;
}
