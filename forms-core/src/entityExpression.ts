export interface EntityExpression {
  type: string;
}

export enum ExpressionType {
  Jsonata = "Jsonata",
  Data = "Data",
  DataMatch = "FieldValue",
  UserMatch = "UserMatch",
  NotEmpty = "NotEmpty",
  UUID = "UUID",
  Metadata = "Metadata",
}

export interface JsonataExpression extends EntityExpression {
  type: ExpressionType.Jsonata;
  expression: string;
}

export interface DataExpression extends EntityExpression {
  type: ExpressionType.Data;
  field: string;
}

export interface MetadataExpression extends EntityExpression {
  type: ExpressionType.Metadata;
  metaField: string;
}

export interface DataMatchExpression extends EntityExpression {
  type: ExpressionType.DataMatch;
  field: string;
  value: any;
}

export interface NotEmptyExpression extends EntityExpression {
  type: ExpressionType.NotEmpty;
  field: string;
  empty?: boolean | null;
}

export interface UserMatchExpression extends EntityExpression {
  type: ExpressionType.UserMatch;
  userMatch: string;
}
