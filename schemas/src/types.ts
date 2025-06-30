import {
  ActionStyle,
  EntityExpression,
  FormContextData,
  IconPlacement,
  IconReference,
  SchemaDataNode,
  SchemaInterface,
  ControlDisableType,
} from "@astroapps/forms-core";
import React, { Key, ReactNode } from "react";
import { ChangeListenerFunc, CleanupScope } from "@react-typed-forms/core";

/**
 * Interface representing the control data context.
 */
export interface ControlDataContext {
  schemaInterface: SchemaInterface;
  dataNode: SchemaDataNode | undefined;
  parentNode: SchemaDataNode;
}
export interface ControlActionContext {
  disableForm(disable: ControlDisableType): void;
}

export type ControlActionHandler = (
  actionId: string,
  actionData: any,
  dataContext: ControlDataContext,
) => ((actionContext: ControlActionContext) => void | Promise<any>) | undefined;

export interface ActionRendererProps {
  key?: Key;
  actionId: string;
  actionContent?: ReactNode;
  actionText: string;
  actionData?: any;
  actionStyle?: ActionStyle | null;
  icon?: IconReference | null;
  iconPlacement?: IconPlacement | null;
  onClick: () => void;
  className?: string | null;
  textClass?: string | null;
  style?: React.CSSProperties;
  disabled?: boolean;
  hidden?: boolean;
  inline?: boolean;
  busy?: boolean;
}

export type RunExpression = (
  scope: CleanupScope,
  expression: EntityExpression,
  returnResult: (v: unknown) => void,
  variables?: (changes: ChangeListenerFunc<any>) => Record<string, any>,
) => void;
