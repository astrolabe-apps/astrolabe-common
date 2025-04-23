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
