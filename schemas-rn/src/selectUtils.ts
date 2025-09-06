import { Control } from "@react-typed-forms/core";
import {
  FieldOption,
  FieldType,
} from "@react-typed-forms/schemas";

// Type for select conversion function
type SelectConversion = (a: any) => string | number;

// Props interface for SelectDataRenderer (if needed by RN components)
export interface SelectDataRendererProps {
  id?: string;
  className?: string;
  options: FieldOption[];
  emptyText?: string;
  requiredText?: string;
  readonly: boolean;
  required: boolean;
  state: Control<any>;
  convert: SelectConversion;
}

// Utility function to create select conversion based on field type
export function createSelectConversion(ft: string): SelectConversion {
  switch (ft) {
    case FieldType.String:
    case FieldType.Int:
    case FieldType.Double:
      return (a) => a;
    default:
      return (a) => a?.toString() ?? "";
  }
}