import {
  ActionStyle,
  EntityExpression,
  FormContextData,
  IconPlacement,
  IconReference,
  SchemaDataNode,
  SchemaInterface,
} from "@astroapps/forms-core";
import React, { Key, ReactNode } from "react";
import { CleanupScope } from "@react-typed-forms/core";

/**
 * Interface representing the control data context.
 */
export interface ControlDataContext {
  schemaInterface: SchemaInterface;
  dataNode: SchemaDataNode | undefined;
  parentNode: SchemaDataNode;
  variables: Record<string, any>;
}

export type ControlActionHandler = (
  actionId: string,
  actionData: any,
  ctx: ControlDataContext,
) => (() => void) | undefined;

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
}

export type RunExpression = (
  scope: CleanupScope,
  expression: EntityExpression,
  returnResult: (v: unknown) => void,
  bindings?: FormContextData,
) => void;
