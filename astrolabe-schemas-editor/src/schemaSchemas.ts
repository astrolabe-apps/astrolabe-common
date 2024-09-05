import {
  FieldType,
  makeScalarField,
  buildSchema,
  defaultValueForFields,
  FieldOption,
  applyDefaultValues,
  DateComparison,
  SchemaValidator,
  makeCompoundField,
  SchemaField,
  EntityExpression,
  DynamicProperty,
  AdornmentPlacement,
  ControlAdornment,
  GroupRenderOptions,
  IconMapping,
  SyncTextType,
  RenderOptions,
  DisplayData,
  ControlDefinition,
} from "@react-typed-forms/schemas";

export interface FieldOptionForm {
  name: string;
  value: any;
  description: string | null;
  disabled: boolean | null;
}

export const FieldOptionSchema = buildSchema<FieldOptionForm>({
  name: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Name",
  }),
  value: makeScalarField({
    type: FieldType.Any,
    notNullable: true,
    required: true,
    displayName: "Value",
  }),
  description: makeScalarField({
    type: FieldType.String,
    displayName: "Description",
  }),
  disabled: makeScalarField({
    type: FieldType.Bool,
    displayName: "Disabled",
  }),
});

export const defaultFieldOptionForm: FieldOptionForm =
  defaultValueForFields(FieldOptionSchema);

export function toFieldOptionForm(v: FieldOption): FieldOptionForm {
  return applyDefaultValues(v, FieldOptionSchema);
}

export interface SchemaValidatorForm {
  type: string;
  expression: string;
  comparison: DateComparison;
  fixedDate: string | null;
  daysFromCurrent: number | null;
  min: number | null;
  max: number | null;
}

export const SchemaValidatorSchema = buildSchema<SchemaValidatorForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    notNullable: true,
    required: true,
    displayName: "Type",
    options: [
      {
        name: "Jsonata",
        value: "Jsonata",
      },
      {
        name: "Date",
        value: "Date",
      },
      {
        name: "Length",
        value: "Length",
      },
    ],
  }),
  expression: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Jsonata"],
    notNullable: true,
    required: true,
    displayName: "Expression",
  }),
  comparison: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Date"],
    notNullable: true,
    required: true,
    displayName: "Comparison",
    options: [
      {
        name: "Not Before",
        value: "NotBefore",
      },
      {
        name: "Not After",
        value: "NotAfter",
      },
    ],
  }),
  fixedDate: makeScalarField({
    type: FieldType.Date,
    onlyForTypes: ["Date"],
    displayName: "Fixed Date",
  }),
  daysFromCurrent: makeScalarField({
    type: FieldType.Int,
    onlyForTypes: ["Date"],
    displayName: "Days From Current",
  }),
  min: makeScalarField({
    type: FieldType.Int,
    onlyForTypes: ["Length"],
    displayName: "Min",
  }),
  max: makeScalarField({
    type: FieldType.Int,
    onlyForTypes: ["Length"],
    displayName: "Max",
  }),
});

export const defaultSchemaValidatorForm: SchemaValidatorForm =
  defaultValueForFields(SchemaValidatorSchema);

export function toSchemaValidatorForm(v: SchemaValidator): SchemaValidatorForm {
  return applyDefaultValues(v, SchemaValidatorSchema);
}

export interface SchemaFieldForm {
  type: string;
  field: string;
  displayName: string | null;
  system: boolean | null;
  tags: string[] | null;
  onlyForTypes: string[] | null;
  required: boolean | null;
  notNullable: boolean | null;
  collection: boolean | null;
  defaultValue: any | null;
  isTypeField: boolean | null;
  searchable: boolean | null;
  singularName: string | null;
  requiredText: string | null;
  options: FieldOptionForm[] | null;
  validators: SchemaValidatorForm[] | null;
  entityRefType: string;
  parentField: string | null;
  children: SchemaFieldForm[];
  treeChildren: boolean | null;
  schemaRef: string | null;
}

export const SchemaFieldSchema = buildSchema<SchemaFieldForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    notNullable: true,
    required: true,
    displayName: "Type",
    options: [
      {
        name: "String",
        value: "String",
      },
      {
        name: "Bool",
        value: "Bool",
      },
      {
        name: "Int",
        value: "Int",
      },
      {
        name: "Date",
        value: "Date",
      },
      {
        name: "DateTime",
        value: "DateTime",
      },
      {
        name: "Time",
        value: "Time",
      },
      {
        name: "Double",
        value: "Double",
      },
      {
        name: "EntityRef",
        value: "EntityRef",
      },
      {
        name: "Compound",
        value: "Compound",
      },
      {
        name: "AutoId",
        value: "AutoId",
      },
      {
        name: "Image",
        value: "Image",
      },
      {
        name: "Any",
        value: "Any",
      },
    ],
  }),
  field: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Field",
  }),
  displayName: makeScalarField({
    type: FieldType.String,
    displayName: "Display Name",
  }),
  system: makeScalarField({
    type: FieldType.Bool,
    displayName: "System",
  }),
  tags: makeScalarField({
    type: FieldType.String,
    collection: true,
    displayName: "Tags",
  }),
  onlyForTypes: makeScalarField({
    type: FieldType.String,
    collection: true,
    displayName: "Only For Types",
  }),
  required: makeScalarField({
    type: FieldType.Bool,
    displayName: "Required",
  }),
  notNullable: makeScalarField({
    type: FieldType.Bool,
    displayName: "Not Nullable",
  }),
  collection: makeScalarField({
    type: FieldType.Bool,
    displayName: "Collection",
  }),
  defaultValue: makeScalarField({
    type: FieldType.Any,
    displayName: "Default Value",
  }),
  isTypeField: makeScalarField({
    type: FieldType.Bool,
    displayName: "Is Type Field",
  }),
  searchable: makeScalarField({
    type: FieldType.Bool,
    displayName: "Searchable",
  }),
  singularName: makeScalarField({
    type: FieldType.String,
    displayName: "Singular Name",
  }),
  requiredText: makeScalarField({
    type: FieldType.String,
    displayName: "Required Text",
  }),
  options: makeCompoundField({
    children: FieldOptionSchema,
    schemaRef: "FieldOption",
    collection: true,
    displayName: "Options",
  }),
  validators: makeCompoundField({
    children: SchemaValidatorSchema,
    schemaRef: "SchemaValidator",
    collection: true,
    displayName: "Validators",
  }),
  entityRefType: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["EntityRef"],
    notNullable: true,
    required: true,
    displayName: "Entity Ref Type",
  }),
  parentField: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["EntityRef"],
    displayName: "Parent Field",
  }),
  children: makeCompoundField({
    treeChildren: true,
    collection: true,
    onlyForTypes: ["Compound"],
    notNullable: true,
    displayName: "Children",
  }),
  treeChildren: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Compound"],
    displayName: "Tree Children",
  }),
  schemaRef: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Compound"],
    displayName: "Schema Ref",
  }),
});

export const defaultSchemaFieldForm: SchemaFieldForm =
  defaultValueForFields(SchemaFieldSchema);

export function toSchemaFieldForm(v: SchemaField): SchemaFieldForm {
  return applyDefaultValues(v, SchemaFieldSchema);
}

export interface EntityExpressionForm {
  type: string;
  expression: string;
  field: string;
  value: any;
  userMatch: string;
}

export const EntityExpressionSchema = buildSchema<EntityExpressionForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    notNullable: true,
    required: true,
    displayName: "Type",
    options: [
      {
        name: "Jsonata",
        value: "Jsonata",
      },
      {
        name: "Data Match",
        value: "FieldValue",
      },
      {
        name: "User Match",
        value: "UserMatch",
      },
      {
        name: "Data",
        value: "Data",
      },
      {
        name: "Not Empty",
        value: "NotEmpty",
      },
      {
        name: "UUID",
        value: "UUID",
      },
    ],
  }),
  expression: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Jsonata"],
    notNullable: true,
    required: true,
    displayName: "Expression",
  }),
  field: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["FieldValue", "NotEmpty", "Data"],
    notNullable: true,
    required: true,
    displayName: "Field",
    tags: ["_SchemaField"],
  }),
  value: makeScalarField({
    type: FieldType.Any,
    onlyForTypes: ["FieldValue"],
    notNullable: true,
    required: true,
    displayName: "Value",
    tags: ["_ValuesOf:field"],
  }),
  userMatch: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["UserMatch"],
    notNullable: true,
    required: true,
    displayName: "User Match",
  }),
});

export const defaultEntityExpressionForm: EntityExpressionForm =
  defaultValueForFields(EntityExpressionSchema);

export function toEntityExpressionForm(
  v: EntityExpression,
): EntityExpressionForm {
  return applyDefaultValues(v, EntityExpressionSchema);
}

export interface DynamicPropertyForm {
  type: string;
  expr: EntityExpressionForm;
}

export const DynamicPropertySchema = buildSchema<DynamicPropertyForm>({
  type: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Type",
    options: [
      {
        name: "Visible",
        value: "Visible",
      },
      {
        name: "DefaultValue",
        value: "DefaultValue",
      },
      {
        name: "Readonly",
        value: "Readonly",
      },
      {
        name: "Disabled",
        value: "Disabled",
      },
      {
        name: "Display",
        value: "Display",
      },
      {
        name: "Style",
        value: "Style",
      },
      {
        name: "LayoutStyle",
        value: "LayoutStyle",
      },
      {
        name: "AllowedOptions",
        value: "AllowedOptions",
      },
      {
        name: "Label",
        value: "Label",
      },
      {
        name: "ActionData",
        value: "ActionData",
      },
    ],
  }),
  expr: makeCompoundField({
    children: EntityExpressionSchema,
    schemaRef: "EntityExpression",
    notNullable: true,
    displayName: "Expr",
  }),
});

export const defaultDynamicPropertyForm: DynamicPropertyForm =
  defaultValueForFields(DynamicPropertySchema);

export function toDynamicPropertyForm(v: DynamicProperty): DynamicPropertyForm {
  return applyDefaultValues(v, DynamicPropertySchema);
}

export interface ControlAdornmentForm {
  type: string;
  iconClass: string;
  placement: AdornmentPlacement | null;
  tooltip: string;
  title: string;
  defaultExpanded: boolean;
  helpText: string;
  defaultOnly: boolean | null;
  field: string;
  expression: EntityExpressionForm;
}

export const ControlAdornmentSchema = buildSchema<ControlAdornmentForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    notNullable: true,
    required: true,
    displayName: "Type",
    options: [
      {
        name: "Tooltip",
        value: "Tooltip",
      },
      {
        name: "Accordion",
        value: "Accordion",
      },
      {
        name: "Help Text",
        value: "HelpText",
      },
      {
        name: "Icon",
        value: "Icon",
      },
      {
        name: "SetField",
        value: "SetField",
      },
    ],
  }),
  iconClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Icon"],
    notNullable: true,
    required: true,
    displayName: "Icon Class",
  }),
  placement: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Icon", "HelpText"],
    displayName: "Placement",
    options: [
      {
        name: "Start of control",
        value: "ControlStart",
      },
      {
        name: "End of control",
        value: "ControlEnd",
      },
      {
        name: "Start of label",
        value: "LabelStart",
      },
      {
        name: "End of label",
        value: "LabelEnd",
      },
    ],
  }),
  tooltip: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Tooltip"],
    notNullable: true,
    required: true,
    displayName: "Tooltip",
  }),
  title: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Accordion"],
    notNullable: true,
    required: true,
    displayName: "Title",
  }),
  defaultExpanded: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Accordion"],
    notNullable: true,
    required: true,
    displayName: "Default Expanded",
  }),
  helpText: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["HelpText"],
    notNullable: true,
    required: true,
    displayName: "Help Text",
  }),
  defaultOnly: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["SetField"],
    displayName: "Default Only",
  }),
  field: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["SetField"],
    notNullable: true,
    required: true,
    displayName: "Field",
    tags: ["_SchemaField"],
  }),
  expression: makeCompoundField({
    children: EntityExpressionSchema,
    schemaRef: "EntityExpression",
    onlyForTypes: ["SetField"],
    notNullable: true,
    displayName: "Expression",
  }),
});

export const defaultControlAdornmentForm: ControlAdornmentForm =
  defaultValueForFields(ControlAdornmentSchema);

export function toControlAdornmentForm(
  v: ControlAdornment,
): ControlAdornmentForm {
  return applyDefaultValues(v, ControlAdornmentSchema);
}

export interface GroupRenderOptionsForm {
  type: string;
  hideTitle: boolean | null;
  direction: string | null;
  gap: string | null;
  columns: number | null;
  value: any;
}

export const GroupRenderOptionsSchema = buildSchema<GroupRenderOptionsForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    notNullable: true,
    required: true,
    defaultValue: "Standard",
    displayName: "Type",
    options: [
      {
        name: "Standard",
        value: "Standard",
      },
      {
        name: "Grid",
        value: "Grid",
      },
      {
        name: "Flex",
        value: "Flex",
      },
      {
        name: "GroupElement",
        value: "GroupElement",
      },
    ],
  }),
  hideTitle: makeScalarField({
    type: FieldType.Bool,
    displayName: "Hide Title",
  }),
  direction: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Flex"],
    displayName: "Direction",
  }),
  gap: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Flex"],
    displayName: "Gap",
  }),
  columns: makeScalarField({
    type: FieldType.Int,
    onlyForTypes: ["Grid"],
    displayName: "Columns",
  }),
  value: makeScalarField({
    type: FieldType.Any,
    onlyForTypes: ["GroupElement"],
    notNullable: true,
    required: true,
    displayName: "Value",
    tags: ["_DefaultValue"],
  }),
});

export const defaultGroupRenderOptionsForm: GroupRenderOptionsForm =
  defaultValueForFields(GroupRenderOptionsSchema);

export function toGroupRenderOptionsForm(
  v: GroupRenderOptions,
): GroupRenderOptionsForm {
  return applyDefaultValues(v, GroupRenderOptionsSchema);
}

export interface IconMappingForm {
  value: string;
  materialIcon: string | null;
}

export const IconMappingSchema = buildSchema<IconMappingForm>({
  value: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Value",
  }),
  materialIcon: makeScalarField({
    type: FieldType.String,
    displayName: "Material Icon",
  }),
});

export const defaultIconMappingForm: IconMappingForm =
  defaultValueForFields(IconMappingSchema);

export function toIconMappingForm(v: IconMapping): IconMappingForm {
  return applyDefaultValues(v, IconMappingSchema);
}

export interface RenderOptionsForm {
  type: string;
  expression: string;
  addText: string | null;
  removeText: string | null;
  noAdd: boolean | null;
  noRemove: boolean | null;
  noReorder: boolean | null;
  childOptions: RenderOptionsForm | null;
  placeholder: string | null;
  multiline: boolean | null;
  groupOptions: GroupRenderOptionsForm;
  emptyText: string | null;
  sampleText: string | null;
  noGroups: boolean;
  noUsers: boolean;
  format: string | null;
  forceMidnight: boolean | null;
  fieldToSync: string;
  syncType: SyncTextType;
  iconMappings: IconMappingForm[];
  allowImages: boolean;
}

export const RenderOptionsSchema = buildSchema<RenderOptionsForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    notNullable: true,
    required: true,
    defaultValue: "Standard",
    displayName: "Type",
    options: [
      {
        name: "Default",
        value: "Standard",
      },
      {
        name: "Textfield",
        value: "Textfield",
      },
      {
        name: "Radio buttons",
        value: "Radio",
      },
      {
        name: "HTML Editor",
        value: "HtmlEditor",
      },
      {
        name: "Icon list",
        value: "IconList",
      },
      {
        name: "Check list",
        value: "CheckList",
      },
      {
        name: "User Selection",
        value: "UserSelection",
      },
      {
        name: "Synchronised Fields",
        value: "Synchronised",
      },
      {
        name: "Icon Selection",
        value: "IconSelector",
      },
      {
        name: "Date/Time",
        value: "DateTime",
      },
      {
        name: "Checkbox",
        value: "Checkbox",
      },
      {
        name: "Dropdown",
        value: "Dropdown",
      },
      {
        name: "Display Only",
        value: "DisplayOnly",
      },
      {
        name: "Group",
        value: "Group",
      },
      {
        name: "Null Toggler",
        value: "NullToggle",
      },
      {
        name: "Jsonata",
        value: "Jsonata",
      },
      {
        name: "Array",
        value: "Array",
      },
    ],
  }),
  expression: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Jsonata"],
    notNullable: true,
    required: true,
    displayName: "Expression",
  }),
  addText: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Array"],
    displayName: "Add Text",
  }),
  removeText: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Array"],
    displayName: "Remove Text",
  }),
  noAdd: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Array"],
    displayName: "No Add",
  }),
  noRemove: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Array"],
    displayName: "No Remove",
  }),
  noReorder: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Array"],
    displayName: "No Reorder",
  }),
  childOptions: makeCompoundField({
    treeChildren: true,
    onlyForTypes: ["Array"],
    displayName: "Child Options",
  }),
  placeholder: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Textfield"],
    displayName: "Placeholder",
  }),
  multiline: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Textfield"],
    displayName: "Multiline",
  }),
  groupOptions: makeCompoundField({
    children: GroupRenderOptionsSchema,
    schemaRef: "GroupRenderOptions",
    onlyForTypes: ["Group"],
    notNullable: true,
    displayName: "Group Options",
  }),
  emptyText: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["DisplayOnly"],
    displayName: "Empty Text",
  }),
  sampleText: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["DisplayOnly"],
    displayName: "Sample Text",
  }),
  noGroups: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["UserSelection"],
    notNullable: true,
    required: true,
    displayName: "No Groups",
  }),
  noUsers: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["UserSelection"],
    notNullable: true,
    required: true,
    displayName: "No Users",
  }),
  format: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["DateTime"],
    displayName: "Format",
  }),
  forceMidnight: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["DateTime"],
    defaultValue: false,
    displayName: "Force Midnight",
  }),
  fieldToSync: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Synchronised"],
    notNullable: true,
    required: true,
    displayName: "Field To Sync",
    tags: ["_SchemaField"],
  }),
  syncType: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Synchronised"],
    notNullable: true,
    required: true,
    displayName: "Sync Type",
    options: [
      {
        name: "Camel",
        value: "Camel",
      },
      {
        name: "Snake",
        value: "Snake",
      },
      {
        name: "Pascal",
        value: "Pascal",
      },
    ],
  }),
  iconMappings: makeCompoundField({
    children: IconMappingSchema,
    schemaRef: "IconMapping",
    collection: true,
    onlyForTypes: ["IconList"],
    notNullable: true,
    displayName: "Icon Mappings",
  }),
  allowImages: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["HtmlEditor"],
    notNullable: true,
    required: true,
    displayName: "Allow Images",
  }),
});

export const defaultRenderOptionsForm: RenderOptionsForm =
  defaultValueForFields(RenderOptionsSchema);

export function toRenderOptionsForm(v: RenderOptions): RenderOptionsForm {
  return applyDefaultValues(v, RenderOptionsSchema);
}

export interface DisplayDataForm {
  type: string;
  iconClass: string;
  text: string;
  customId: string;
  html: string;
}

export const DisplayDataSchema = buildSchema<DisplayDataForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    notNullable: true,
    required: true,
    displayName: "Type",
    options: [
      {
        name: "Text",
        value: "Text",
      },
      {
        name: "Html",
        value: "Html",
      },
      {
        name: "Icon",
        value: "Icon",
      },
      {
        name: "Custom",
        value: "Custom",
      },
    ],
  }),
  iconClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Icon"],
    notNullable: true,
    required: true,
    displayName: "Icon Class",
  }),
  text: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Text"],
    notNullable: true,
    required: true,
    displayName: "Text",
  }),
  customId: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Custom"],
    notNullable: true,
    required: true,
    displayName: "Custom Id",
  }),
  html: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Html"],
    notNullable: true,
    required: true,
    displayName: "Html",
    tags: ["_HtmlEditor"],
  }),
});

export const defaultDisplayDataForm: DisplayDataForm =
  defaultValueForFields(DisplayDataSchema);

export function toDisplayDataForm(v: DisplayData): DisplayDataForm {
  return applyDefaultValues(v, DisplayDataSchema);
}

export interface ControlDefinitionForm {
  type: string;
  title: string | null;
  dynamic: DynamicPropertyForm[] | null;
  adornments: ControlAdornmentForm[] | null;
  styleClass: string | null;
  layoutClass: string | null;
  labelClass: string | null;
  children: ControlDefinitionForm[] | null;
  field: string;
  hideTitle: boolean | null;
  required: boolean | null;
  renderOptions: RenderOptionsForm | null;
  defaultValue: any | null;
  readonly: boolean | null;
  disabled: boolean | null;
  dontClearHidden: boolean | null;
  validators: SchemaValidatorForm[] | null;
  compoundField: string | null;
  groupOptions: GroupRenderOptionsForm | null;
  displayData: DisplayDataForm;
  actionId: string;
  actionData: string | null;
}

export const ControlDefinitionSchema = buildSchema<ControlDefinitionForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    notNullable: true,
    required: true,
    displayName: "Type",
    options: [
      {
        name: "Data",
        value: "Data",
      },
      {
        name: "Group",
        value: "Group",
      },
      {
        name: "Display",
        value: "Display",
      },
      {
        name: "Action",
        value: "Action",
      },
    ],
  }),
  title: makeScalarField({
    type: FieldType.String,
    displayName: "Title",
  }),
  dynamic: makeCompoundField({
    children: DynamicPropertySchema,
    schemaRef: "DynamicProperty",
    collection: true,
    displayName: "Dynamic",
  }),
  adornments: makeCompoundField({
    children: ControlAdornmentSchema,
    schemaRef: "ControlAdornment",
    collection: true,
    displayName: "Adornments",
  }),
  styleClass: makeScalarField({
    type: FieldType.String,
    displayName: "Style Class",
  }),
  layoutClass: makeScalarField({
    type: FieldType.String,
    displayName: "Layout Class",
  }),
  labelClass: makeScalarField({
    type: FieldType.String,
    displayName: "Label Class",
  }),
  children: makeCompoundField({
    treeChildren: true,
    collection: true,
    displayName: "Children",
    tags: ["_NoControl"],
  }),
  field: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Data"],
    notNullable: true,
    required: true,
    displayName: "Field",
    tags: ["_SchemaField"],
  }),
  hideTitle: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Data"],
    displayName: "Hide Title",
  }),
  required: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Data"],
    defaultValue: false,
    displayName: "Required",
  }),
  renderOptions: makeCompoundField({
    children: RenderOptionsSchema,
    schemaRef: "RenderOptions",
    onlyForTypes: ["Data"],
    displayName: "Render Options",
  }),
  defaultValue: makeScalarField({
    type: FieldType.Any,
    onlyForTypes: ["Data"],
    displayName: "Default Value",
    tags: ["_ValuesOf:field"],
  }),
  readonly: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Data"],
    defaultValue: false,
    displayName: "Readonly",
  }),
  disabled: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Data"],
    defaultValue: false,
    displayName: "Disabled",
  }),
  dontClearHidden: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Data"],
    displayName: "Dont Clear Hidden",
  }),
  validators: makeCompoundField({
    children: SchemaValidatorSchema,
    schemaRef: "SchemaValidator",
    collection: true,
    onlyForTypes: ["Data"],
    displayName: "Validators",
  }),
  compoundField: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Group"],
    displayName: "Compound Field",
    tags: ["_NestedSchemaField"],
  }),
  groupOptions: makeCompoundField({
    children: GroupRenderOptionsSchema,
    schemaRef: "GroupRenderOptions",
    onlyForTypes: ["Group"],
    displayName: "Group Options",
  }),
  displayData: makeCompoundField({
    children: DisplayDataSchema,
    schemaRef: "DisplayData",
    onlyForTypes: ["Display"],
    notNullable: true,
    displayName: "Display Data",
  }),
  actionId: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Action"],
    notNullable: true,
    required: true,
    displayName: "Action Id",
  }),
  actionData: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Action"],
    displayName: "Action Data",
  }),
});

export const defaultControlDefinitionForm: ControlDefinitionForm =
  defaultValueForFields(ControlDefinitionSchema);

export function toControlDefinitionForm(
  v: ControlDefinition,
): ControlDefinitionForm {
  return applyDefaultValues(v, ControlDefinitionSchema);
}

export const ControlDefinitionSchemaMap = {
  FieldOption: FieldOptionSchema,
  SchemaValidator: SchemaValidatorSchema,
  SchemaField: SchemaFieldSchema,
  EntityExpression: EntityExpressionSchema,
  DynamicProperty: DynamicPropertySchema,
  ControlAdornment: ControlAdornmentSchema,
  GroupRenderOptions: GroupRenderOptionsSchema,
  IconMapping: IconMappingSchema,
  RenderOptions: RenderOptionsSchema,
  DisplayData: DisplayDataSchema,
  ControlDefinition: ControlDefinitionSchema,
};
