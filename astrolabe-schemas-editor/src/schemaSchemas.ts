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
  IconReference,
  AdornmentPlacement,
  ControlAdornment,
  GroupRenderOptions,
  IconMapping,
  SyncTextType,
  RenderOptions,
  DisplayData,
  ActionStyle,
  IconPlacement,
  ControlDisableType,
  ControlDefinition,
} from "@react-typed-forms/schemas";

export interface FieldOptionForm {
  name: string;
  value: any;
  description: string | null;
  disabled: boolean | null;
  group: string | null;
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
  group: makeScalarField({
    type: FieldType.String,
    displayName: "Group",
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
  meta: boolean | null;
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
    tags: ["_NoControl"],
  }),
  meta: makeScalarField({
    type: FieldType.Bool,
    displayName: "Meta",
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
    tags: ["_NoControl"],
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
  empty: boolean | null;
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
  empty: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["NotEmpty"],
    displayName: "Empty",
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
      {
        name: "GridColumns",
        value: "GridColumns",
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

export interface IconReferenceForm {
  library: string;
  name: string;
}

export const IconReferenceSchema = buildSchema<IconReferenceForm>({
  library: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Library",
    options: [
      {
        name: "FontAwesome",
        value: "FontAwesome",
      },
      {
        name: "Material",
        value: "Material",
      },
      {
        name: "CssClass",
        value: "CssClass",
      },
    ],
  }),
  name: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Name",
  }),
});

export const defaultIconReferenceForm: IconReferenceForm =
  defaultValueForFields(IconReferenceSchema);

export function toIconReferenceForm(v: IconReference): IconReferenceForm {
  return applyDefaultValues(v, IconReferenceSchema);
}

export interface ControlAdornmentForm {
  type: string;
  placement: AdornmentPlacement | null;
  allowNull: boolean | null;
  editSelectable: boolean | null;
  iconClass: string;
  icon: IconReferenceForm | null;
  tooltip: string;
  title: string;
  defaultExpanded: boolean | null;
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
      {
        name: "Optional",
        value: "Optional",
      },
    ],
  }),
  placement: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Optional", "Icon", "HelpText"],
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
  allowNull: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Optional"],
    displayName: "Allow Null",
  }),
  editSelectable: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Optional"],
    displayName: "Edit Selectable",
  }),
  iconClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Icon"],
    notNullable: true,
    required: true,
    displayName: "Icon Class",
  }),
  icon: makeCompoundField({
    children: IconReferenceSchema,
    schemaRef: "IconReference",
    onlyForTypes: ["Icon"],
    displayName: "Icon",
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
    tags: ["_ControlGroup:Expression"],
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
  childStyleClass: string | null;
  childLayoutClass: string | null;
  childLabelClass: string | null;
  displayOnly: boolean | null;
  contentClass: string | null;
  title: string | null;
  direction: string | null;
  gap: string | null;
  columns: number | null;
  rowClass: string | null;
  cellClass: string | null;
  value: any;
  childIndexExpression: EntityExpressionForm;
  defaultExpanded: boolean | null;
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
        name: "Tabs",
        value: "Tabs",
      },
      {
        name: "GroupElement",
        value: "GroupElement",
      },
      {
        name: "SelectChild",
        value: "SelectChild",
      },
      {
        name: "Inline",
        value: "Inline",
      },
      {
        name: "Wizard",
        value: "Wizard",
      },
      {
        name: "Dialog",
        value: "Dialog",
      },
      {
        name: "Contents",
        value: "Contents",
      },
      {
        name: "Accordion",
        value: "Accordion",
      },
    ],
  }),
  hideTitle: makeScalarField({
    type: FieldType.Bool,
    displayName: "Hide Title",
  }),
  childStyleClass: makeScalarField({
    type: FieldType.String,
    displayName: "Child Style Class",
  }),
  childLayoutClass: makeScalarField({
    type: FieldType.String,
    displayName: "Child Layout Class",
  }),
  childLabelClass: makeScalarField({
    type: FieldType.String,
    displayName: "Child Label Class",
  }),
  displayOnly: makeScalarField({
    type: FieldType.Bool,
    displayName: "Display Only",
  }),
  contentClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Tabs"],
    displayName: "Content Class",
  }),
  title: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Dialog"],
    displayName: "Title",
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
  rowClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Grid"],
    displayName: "Row Class",
  }),
  cellClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Grid"],
    displayName: "Cell Class",
  }),
  value: makeScalarField({
    type: FieldType.Any,
    onlyForTypes: ["GroupElement"],
    notNullable: true,
    required: true,
    displayName: "Value",
    tags: ["_DefaultValue"],
  }),
  childIndexExpression: makeCompoundField({
    children: EntityExpressionSchema,
    schemaRef: "EntityExpression",
    onlyForTypes: ["SelectChild"],
    notNullable: true,
    displayName: "Child Index Expression",
    tags: ["_ControlRef:Expression"],
  }),
  defaultExpanded: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Accordion"],
    displayName: "Default Expanded",
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
  addActionId: string | null;
  removeActionId: string | null;
  editText: string | null;
  editActionId: string | null;
  noAdd: boolean | null;
  noRemove: boolean | null;
  noReorder: boolean | null;
  editExternal: boolean | null;
  showInline: boolean | null;
  entryWrapperClass: string | null;
  selectedClass: string | null;
  notSelectedClass: string | null;
  listContainerClass: string | null;
  listEntryClass: string | null;
  chipContainerClass: string | null;
  chipCloseButtonClass: string | null;
  placeholder: string | null;
  multiline: boolean | null;
  groupOptions: GroupRenderOptionsForm;
  emptyText: string | null;
  sampleText: string | null;
  noGroups: boolean;
  noUsers: boolean;
  format: string | null;
  forceMidnight: boolean | null;
  forceStandard: boolean | null;
  fieldToSync: string;
  syncType: SyncTextType;
  iconMappings: IconMappingForm[];
  allowImages: boolean;
  elementExpression: EntityExpressionForm;
  bottomActionId: string | null;
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
        name: "Autocomplete",
        value: "Autocomplete",
      },
      {
        name: "Jsonata",
        value: "Jsonata",
      },
      {
        name: "Array",
        value: "Array",
      },
      {
        name: "Array Element",
        value: "ArrayElement",
      },
      {
        name: "Element Selected",
        value: "ElementSelected",
      },
      {
        name: "Scroll List",
        value: "ScrollList",
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
  addActionId: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Array"],
    displayName: "Add Action Id",
  }),
  removeActionId: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Array"],
    displayName: "Remove Action Id",
  }),
  editText: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Array"],
    displayName: "Edit Text",
  }),
  editActionId: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Array"],
    displayName: "Edit Action Id",
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
  editExternal: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Array"],
    displayName: "Edit External",
  }),
  showInline: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["ArrayElement"],
    displayName: "Show Inline",
  }),
  entryWrapperClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Radio", "CheckList"],
    displayName: "Entry Wrapper Class",
  }),
  selectedClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Radio", "CheckList"],
    displayName: "Selected Class",
  }),
  notSelectedClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Radio", "CheckList"],
    displayName: "Not Selected Class",
  }),
  listContainerClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Autocomplete"],
    displayName: "List Container Class",
  }),
  listEntryClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Autocomplete"],
    displayName: "List Entry Class",
  }),
  chipContainerClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Autocomplete"],
    displayName: "Chip Container Class",
  }),
  chipCloseButtonClass: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Autocomplete"],
    displayName: "Chip Close Button Class",
  }),
  placeholder: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Autocomplete", "Textfield"],
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
    tags: ["_NoControl"],
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
  forceStandard: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["DateTime"],
    displayName: "Force Standard",
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
  elementExpression: makeCompoundField({
    children: EntityExpressionSchema,
    schemaRef: "EntityExpression",
    onlyForTypes: ["ElementSelected"],
    notNullable: true,
    displayName: "Element Expression",
    tags: ["_ControlRef:Expression"],
  }),
  bottomActionId: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["ScrollList"],
    displayName: "Bottom Action Id",
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
  icon: IconReferenceForm | null;
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
  icon: makeCompoundField({
    children: IconReferenceSchema,
    schemaRef: "IconReference",
    onlyForTypes: ["Icon"],
    displayName: "Icon",
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
  id: string | null;
  childRefId: string | null;
  disabled: boolean | null;
  hidden: boolean | null;
  readonly: boolean | null;
  dynamic: DynamicPropertyForm[] | null;
  adornments: ControlAdornmentForm[] | null;
  styleClass: string | null;
  textClass: string | null;
  layoutClass: string | null;
  labelClass: string | null;
  labelTextClass: string | null;
  placement: string | null;
  children: ControlDefinitionForm[] | null;
  field: string;
  hideTitle: boolean | null;
  required: boolean | null;
  renderOptions: RenderOptionsForm | null;
  defaultValue: any | null;
  dontClearHidden: boolean | null;
  requiredErrorText: string | null;
  validators: SchemaValidatorForm[] | null;
  compoundField: string | null;
  groupOptions: GroupRenderOptionsForm | null;
  displayData: DisplayDataForm;
  actionId: string;
  actionData: string | null;
  icon: IconReferenceForm | null;
  actionStyle: ActionStyle | null;
  iconPlacement: IconPlacement | null;
  disableType: ControlDisableType | null;
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
  id: makeScalarField({
    type: FieldType.String,
    displayName: "Id",
  }),
  childRefId: makeScalarField({
    type: FieldType.String,
    displayName: "Child Ref Id",
  }),
  disabled: makeScalarField({
    type: FieldType.Bool,
    defaultValue: false,
    displayName: "Disabled",
  }),
  hidden: makeScalarField({
    type: FieldType.Bool,
    defaultValue: false,
    displayName: "Hidden",
  }),
  readonly: makeScalarField({
    type: FieldType.Bool,
    defaultValue: false,
    displayName: "Readonly",
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
  textClass: makeScalarField({
    type: FieldType.String,
    displayName: "Text Class",
  }),
  layoutClass: makeScalarField({
    type: FieldType.String,
    displayName: "Layout Class",
  }),
  labelClass: makeScalarField({
    type: FieldType.String,
    displayName: "Label Class",
  }),
  labelTextClass: makeScalarField({
    type: FieldType.String,
    displayName: "Label Text Class",
  }),
  placement: makeScalarField({
    type: FieldType.String,
    displayName: "Placement",
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
  }),
  dontClearHidden: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Data"],
    displayName: "Dont Clear Hidden",
  }),
  requiredErrorText: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Data"],
    displayName: "Required Error Text",
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
  icon: makeCompoundField({
    children: IconReferenceSchema,
    schemaRef: "IconReference",
    onlyForTypes: ["Action"],
    displayName: "Icon",
  }),
  actionStyle: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Action"],
    displayName: "Action Style",
    options: [
      {
        name: "Button",
        value: "Button",
      },
      {
        name: "Secondary",
        value: "Secondary",
      },
      {
        name: "Link",
        value: "Link",
      },
      {
        name: "Group",
        value: "Group",
      },
    ],
  }),
  iconPlacement: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Action"],
    displayName: "Icon Placement",
    options: [
      {
        name: "BeforeText",
        value: "BeforeText",
      },
      {
        name: "AfterText",
        value: "AfterText",
      },
      {
        name: "ReplaceText",
        value: "ReplaceText",
      },
    ],
  }),
  disableType: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Action"],
    displayName: "Disable Type",
    options: [
      {
        name: "None",
        value: "None",
      },
      {
        name: "Self",
        value: "Self",
      },
      {
        name: "Global",
        value: "Global",
      },
    ],
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
  IconReference: IconReferenceSchema,
  ControlAdornment: ControlAdornmentSchema,
  GroupRenderOptions: GroupRenderOptionsSchema,
  IconMapping: IconMappingSchema,
  RenderOptions: RenderOptionsSchema,
  DisplayData: DisplayDataSchema,
  ControlDefinition: ControlDefinitionSchema,
};
