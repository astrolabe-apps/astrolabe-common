export interface SimpleVisibilityCondition {
  field: string;
  operator: "equals" | "notEquals";
  value: any;
}

export enum BasicFieldType {
  TextInput = "TextInput",
  TextArea = "TextArea",
  Radio = "Radio",
  Checkbox = "Checkbox",
  DatePicker = "DatePicker",
  Dropdown = "Dropdown",
  SectionHeader = "SectionHeader",
}
