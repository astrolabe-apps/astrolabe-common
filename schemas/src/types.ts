import {
  ActionStyle,
  FormContextData,
  IconPlacement,
  IconReference,
  SchemaDataNode,
  SchemaInterface,
} from "@astroapps/forms-core";
import React, { Key } from "react";

/**
 * Interface representing the control data context.
 */
export interface ControlDataContext {
  schemaInterface: SchemaInterface;
  dataNode: SchemaDataNode | undefined;
  parentNode: SchemaDataNode;
  formData: FormContextData;
}

export type ControlActionHandler = (
  actionId: string,
  actionData: any,
  ctx: ControlDataContext,
) => (() => void) | undefined;

export interface ActionRendererProps {
  key?: Key;
  actionId: string;
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
  inline?: boolean;
}
