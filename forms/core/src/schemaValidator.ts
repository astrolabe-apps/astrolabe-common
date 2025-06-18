export enum ValidatorType {
  Jsonata = "Jsonata",
  Date = "Date",
  Length = "Length",
}

export interface SchemaValidator {
  type: string;
}

export interface JsonataValidator extends SchemaValidator {
  type: ValidatorType.Jsonata;
  expression: string;
}

export interface LengthValidator extends SchemaValidator {
  type: ValidatorType.Length;
  min?: number | null;
  max?: number | null;
}

export enum DateComparison {
  NotBefore = "NotBefore",
  NotAfter = "NotAfter",
}

export interface DateValidator extends SchemaValidator {
  type: ValidatorType.Date;
  comparison: DateComparison;
  fixedDate?: string | null;
  daysFromCurrent?: number | null;
}

export function jsonataValidator(expr: string): JsonataValidator {
  return { type: ValidatorType.Jsonata, expression: expr };
}

export function dateValidator(
  comparison: DateComparison,
  fixedDate?: string | null,
  daysFromCurrent?: number | null,
): DateValidator {
  return { type: ValidatorType.Date, comparison, fixedDate, daysFromCurrent };
}

export function lengthValidator(
  min?: number | null,
  max?: number | null,
): LengthValidator {
  return { type: ValidatorType.Length, min, max };
}
