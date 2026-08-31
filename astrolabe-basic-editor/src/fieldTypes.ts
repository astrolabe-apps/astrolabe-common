import {
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  GroupedControlsDefinition,
  GroupRenderType,
  TextfieldRenderOptions,
  dataControl,
  groupedControl,
} from "@react-typed-forms/schemas";
import { FieldType, SchemaField } from "@react-typed-forms/schemas";
import { BasicFieldType } from "./types";

export interface FieldTypeConfig {
  label: string;
  icon: string;
  createControl: (fieldName: string) => ControlDefinition;
  createSchemaField: (fieldName: string) => SchemaField | undefined;
  matches?: (def: ControlDefinition) => boolean
}

const extraFieldTypes: Record<string, FieldTypeConfig> = {};

export function registerFieldType(key: string, config: FieldTypeConfig) { extraFieldTypes[key] = config; }

const fieldTypeConfigs: Record<BasicFieldType, FieldTypeConfig> = {
  [BasicFieldType.TextInput]: {
    label: "Text Input",
    icon: "T",
    createControl: (field) =>
      dataControl(field, field, {
        renderOptions: { type: DataRenderType.Textfield },
      }),
    createSchemaField: (field) => ({
      type: FieldType.String,
      field,
      displayName: field,
    }),
  },
  [BasicFieldType.TextArea]: {
    label: "Text Area",
    icon: "\u00b6",
    createControl: (field) =>
      dataControl(field, field, {
        renderOptions: {
          type: DataRenderType.Textfield,
          multiline: true,
        } as TextfieldRenderOptions,
      }),
    createSchemaField: (field) => ({
      type: FieldType.String,
      field,
      displayName: field,
    }),
  },
  [BasicFieldType.Radio]: {
    label: "Radio",
    icon: "\u25C9",
    createControl: (field) =>
      dataControl(field, field, {
        renderOptions: { type: DataRenderType.Radio },
      }),
    createSchemaField: (field) => ({
      type: FieldType.String,
      field,
      displayName: field,
      options: [
        { name: "Option 1", value: "option1" },
        { name: "Option 2", value: "option2" },
      ],
    }),
  },
  [BasicFieldType.Checkbox]: {
    label: "Checkbox",
    icon: "\u2611",
    createControl: (field) =>
      dataControl(field, field, {
        renderOptions: { type: DataRenderType.Checkbox },
      }),
    createSchemaField: (field) => ({
      type: FieldType.Bool,
      field,
      displayName: field,
    }),
  },
  [BasicFieldType.DatePicker]: {
    label: "Date Picker",
    icon: "\uD83D\uDCC5",
    createControl: (field) =>
      dataControl(field, field, {
        renderOptions: { type: DataRenderType.DateTime },
      }),
    createSchemaField: (field) => ({
      type: FieldType.Date,
      field,
      displayName: field,
    }),
  },
  [BasicFieldType.Dropdown]: {
    label: "Dropdown",
    icon: "\u25BE",
    createControl: (field) =>
      dataControl(field, field, {
        renderOptions: { type: DataRenderType.Dropdown },
      }),
    createSchemaField: (field) => ({
      type: FieldType.String,
      field,
      displayName: field,
      options: [
        { name: "Option 1", value: "option1" },
        { name: "Option 2", value: "option2" },
      ],
    }),
  },
  [BasicFieldType.SectionHeader]: {
    label: "Section",
    icon: "\u00A7",
    createControl: (_field) =>
      groupedControl([], "Section", {
        groupOptions: { type: GroupRenderType.Standard, hideTitle: false },
      }),
    createSchemaField: () => undefined,
  },
  [BasicFieldType.Page]: {
    label: "Page",
    icon: "\uD83D\uDCC4",
    createControl: (_field) =>
      groupedControl([], "Page", {
        groupOptions: { type: GroupRenderType.Standard, hideTitle: false },
      }),
    createSchemaField: () => undefined,
  },
};

export function getFieldTypeConfig(type: string): FieldTypeConfig {
  return fieldTypeConfigs[type as BasicFieldType] ?? extraFieldTypes[type];
}

export function getAllFieldTypes(): BasicFieldType | string[] {
  return [...Object.values(BasicFieldType), ...Object.keys(extraFieldTypes)];
}

let fieldCounter = 0;

export function generateFieldName(
  existingFields: SchemaField[],
): string {
  fieldCounter++;
  let name = `field${fieldCounter}`;
  while (existingFields.some((f) => f.field === name)) {
    fieldCounter++;
    name = `field${fieldCounter}`;
  }
  return name;
}

export function toCamelCase(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

export function getBasicFieldType(
  def: ControlDefinition,
): string | undefined {
  for (const [key, cfg] of Object.entries(extraFieldTypes)) {
      if (cfg.matches?.(def)) return key;
  }

  if (def.type === ControlDefinitionType.Group) {
    const group = def as GroupedControlsDefinition;
    if (
      !group.compoundField &&
      (!group.groupOptions ||
        group.groupOptions.type === GroupRenderType.Standard)
    ) {
      return BasicFieldType.SectionHeader;
    }
    return undefined;
  }
  if (def.type !== ControlDefinitionType.Data) return undefined;
  const data = def as DataControlDefinition;
  const renderType = data.renderOptions?.type;
  switch (renderType) {
    case DataRenderType.Textfield:
      return (data.renderOptions as any)?.multiline
        ? BasicFieldType.TextArea
        : BasicFieldType.TextInput;
    case DataRenderType.Radio:
      return BasicFieldType.Radio;
    case DataRenderType.Checkbox:
      return BasicFieldType.Checkbox;
    case DataRenderType.DateTime:
      return BasicFieldType.DatePicker;
    case DataRenderType.Dropdown:
      return BasicFieldType.Dropdown;
    default:
      return undefined;
  }
}
