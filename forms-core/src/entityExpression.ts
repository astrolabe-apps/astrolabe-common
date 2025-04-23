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
}

export interface JsonataExpression extends EntityExpression {
  type: ExpressionType.Jsonata;
  expression: string;
}

export interface DataExpression extends EntityExpression {
  type: ExpressionType.Data;
  field: string;
}

export interface DataMatchExpression extends EntityExpression {
  type: ExpressionType.DataMatch;
  field: string;
  value: any;
}

export interface NotEmptyExpression extends EntityExpression {
  type: ExpressionType.DataMatch;
  field: string;
}

export interface UserMatchExpression extends EntityExpression {
  type: ExpressionType.UserMatch;
  userMatch: string;
}
