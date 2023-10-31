import {
  FieldType,
  makeScalarField,
  buildSchema,
  defaultValueForFields,
  FieldOption,
  applyDefaultValues,
  makeCompoundField,
  SchemaRestrictions,
  SchemaField,
  EntityExpression,
  DynamicProperty,
  ControlAdornment,
  IconMapping,
  SyncTextType,
  RenderOptions,
  GroupRenderOptions,
  DisplayData,
  ControlDefinition,
} from "@react-typed-forms/schemas";

export interface FieldOptionForm {
  name: string;
  value: any;
}

export const FieldOptionSchema = buildSchema<FieldOptionForm>({
  name: makeScalarField({
    type: FieldType.String,
    required: true,
    displayName: "Name",
  }),
  value: makeScalarField({
    type: FieldType.Any,
    required: true,
    displayName: "Value",
  }),
});

export const defaultFieldOptionForm: FieldOptionForm =
  defaultValueForFields(FieldOptionSchema);

export function toFieldOptionForm(v: FieldOption): FieldOptionForm {
  return applyDefaultValues(v, FieldOptionSchema);
}

export interface SchemaRestrictionsForm {
  options: FieldOptionForm[] | null;
}

export const SchemaRestrictionsSchema = buildSchema<SchemaRestrictionsForm>({
  options: makeCompoundField({
    children: FieldOptionSchema,
    collection: true,
    displayName: "Options",
  }),
});

export const defaultSchemaRestrictionsForm: SchemaRestrictionsForm =
  defaultValueForFields(SchemaRestrictionsSchema);

export function toSchemaRestrictionsForm(
  v: SchemaRestrictions,
): SchemaRestrictionsForm {
  return applyDefaultValues(v, SchemaRestrictionsSchema);
}

export interface SchemaFieldForm {
  type: string;
  field: string;
  displayName: string | null;
  system: boolean | null;
  tags: string[] | null;
  onlyForTypes: string[] | null;
  required: boolean | null;
  collection: boolean | null;
  defaultValue: any | null;
  isTypeField: boolean | null;
  searchable: boolean | null;
  options: FieldOptionForm[] | null;
  restrictions: SchemaRestrictionsForm | null;
  entityRefType: string;
  parentField: string | null;
  children: SchemaFieldForm[];
  treeChildren: boolean | null;
}

export const SchemaFieldSchema = buildSchema<SchemaFieldForm>({
  type: makeScalarField({
    type: FieldType.String,
    required: true,
    displayName: "Type",
  }),
  field: makeScalarField({
    type: FieldType.String,
    required: true,
    displayName: "Field",
  }),
  displayName: makeScalarField({
    type: FieldType.String,
    displayName: "DisplayName",
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
    displayName: "OnlyForTypes",
  }),
  required: makeScalarField({
    type: FieldType.Bool,
    displayName: "Required",
  }),
  collection: makeScalarField({
    type: FieldType.Bool,
    displayName: "Collection",
  }),
  defaultValue: makeScalarField({
    type: FieldType.Any,
    displayName: "DefaultValue",
  }),
  isTypeField: makeScalarField({
    type: FieldType.Bool,
    displayName: "IsTypeField",
  }),
  searchable: makeScalarField({
    type: FieldType.Bool,
    displayName: "Searchable",
  }),
  options: makeCompoundField({
    children: FieldOptionSchema,
    collection: true,
    displayName: "Options",
  }),
  restrictions: makeCompoundField({
    children: SchemaRestrictionsSchema,
    displayName: "Restrictions",
  }),
  entityRefType: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["EntityRef"],
    required: true,
    displayName: "EntityRefType",
  }),
  parentField: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["EntityRef"],
    displayName: "ParentField",
  }),
  children: makeCompoundField({
    treeChildren: true,
    collection: true,
    onlyForTypes: ["Compound"],
    required: true,
    displayName: "Children",
  }),
  treeChildren: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Compound"],
    displayName: "TreeChildren",
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
    required: true,
    displayName: "Type",
  }),
  expression: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Jsonata"],
    required: true,
    displayName: "Expression",
  }),
  field: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["FieldValue"],
    required: true,
    displayName: "Field",
    tags: ["_SchemaField"],
  }),
  value: makeScalarField({
    type: FieldType.Any,
    onlyForTypes: ["FieldValue"],
    required: true,
    displayName: "Value",
    tags: ["_ValuesOf:field"],
  }),
  userMatch: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["UserMatch"],
    required: true,
    displayName: "UserMatch",
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
    ],
  }),
  expr: makeCompoundField({
    children: EntityExpressionSchema,
    required: true,
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
  tooltip: string;
  title: string;
  defaultExpanded: boolean;
}

export const ControlAdornmentSchema = buildSchema<ControlAdornmentForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
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
    ],
  }),
  tooltip: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Tooltip"],
    required: true,
    displayName: "Tooltip",
  }),
  title: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Accordion"],
    required: true,
    displayName: "Title",
  }),
  defaultExpanded: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Accordion"],
    required: true,
    displayName: "DefaultExpanded",
  }),
});

export const defaultControlAdornmentForm: ControlAdornmentForm =
  defaultValueForFields(ControlAdornmentSchema);

export function toControlAdornmentForm(
  v: ControlAdornment,
): ControlAdornmentForm {
  return applyDefaultValues(v, ControlAdornmentSchema);
}

export interface IconMappingForm {
  value: string;
  materialIcon: string | null;
}

export const IconMappingSchema = buildSchema<IconMappingForm>({
  value: makeScalarField({
    type: FieldType.String,
    required: true,
    displayName: "Value",
  }),
  materialIcon: makeScalarField({
    type: FieldType.String,
    displayName: "MaterialIcon",
  }),
});

export const defaultIconMappingForm: IconMappingForm =
  defaultValueForFields(IconMappingSchema);

export function toIconMappingForm(v: IconMapping): IconMappingForm {
  return applyDefaultValues(v, IconMappingSchema);
}

export interface RenderOptionsForm {
  type: string;
  noGroups: boolean;
  noUsers: boolean;
  format: string | null;
  fieldToSync: string;
  syncType: SyncTextType;
  iconMappings: IconMappingForm[];
  allowImages: boolean;
}

export const RenderOptionsSchema = buildSchema<RenderOptionsForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
    required: true,
    defaultValue: "Standard",
    displayName: "Type",
    options: [
      {
        name: "Default",
        value: "Standard",
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
    ],
  }),
  noGroups: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["UserSelection"],
    required: true,
    displayName: "NoGroups",
  }),
  noUsers: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["UserSelection"],
    required: true,
    displayName: "NoUsers",
  }),
  format: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["DateTime"],
    displayName: "Format",
  }),
  fieldToSync: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Synchronised"],
    required: true,
    displayName: "FieldToSync",
    tags: ["_SchemaField"],
  }),
  syncType: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Synchronised"],
    required: true,
    displayName: "SyncType",
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
    collection: true,
    onlyForTypes: ["IconList"],
    required: true,
    displayName: "IconMappings",
  }),
  allowImages: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["HtmlEditor"],
    required: true,
    displayName: "AllowImages",
  }),
});

export const defaultRenderOptionsForm: RenderOptionsForm =
  defaultValueForFields(RenderOptionsSchema);

export function toRenderOptionsForm(v: RenderOptions): RenderOptionsForm {
  return applyDefaultValues(v, RenderOptionsSchema);
}

export interface GroupRenderOptionsForm {
  type: string;
  hideTitle: boolean | null;
  columns: number | null;
  value: any;
}

export const GroupRenderOptionsSchema = buildSchema<GroupRenderOptionsForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
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
        name: "GroupElement",
        value: "GroupElement",
      },
    ],
  }),
  hideTitle: makeScalarField({
    type: FieldType.Bool,
    displayName: "HideTitle",
  }),
  columns: makeScalarField({
    type: FieldType.Int,
    onlyForTypes: ["Grid"],
    displayName: "Columns",
  }),
  value: makeScalarField({
    type: FieldType.Any,
    onlyForTypes: ["GroupElement"],
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

export interface DisplayDataForm {
  type: string;
  text: string;
  html: string;
}

export const DisplayDataSchema = buildSchema<DisplayDataForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
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
    ],
  }),
  text: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Text"],
    required: true,
    displayName: "Text",
  }),
  html: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Html"],
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
  field: string;
  required: boolean | null;
  renderOptions: RenderOptionsForm | null;
  defaultValue: any | null;
  readonly: boolean | null;
  children: ControlDefinitionForm[];
  compoundField: string | null;
  groupOptions: GroupRenderOptionsForm | null;
  displayData: DisplayDataForm;
  actionId: string;
}

export const ControlDefinitionSchema = buildSchema<ControlDefinitionForm>({
  type: makeScalarField({
    type: FieldType.String,
    isTypeField: true,
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
    collection: true,
    displayName: "Dynamic",
  }),
  adornments: makeCompoundField({
    children: ControlAdornmentSchema,
    collection: true,
    displayName: "Adornments",
  }),
  field: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Data"],
    required: true,
    displayName: "Field",
    tags: ["_SchemaField"],
  }),
  required: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Data"],
    displayName: "Required",
  }),
  renderOptions: makeCompoundField({
    children: RenderOptionsSchema,
    onlyForTypes: ["Data"],
    displayName: "RenderOptions",
  }),
  defaultValue: makeScalarField({
    type: FieldType.Any,
    onlyForTypes: ["Data"],
    displayName: "DefaultValue",
  }),
  readonly: makeScalarField({
    type: FieldType.Bool,
    onlyForTypes: ["Data"],
    displayName: "Readonly",
  }),
  children: makeCompoundField({
    treeChildren: true,
    collection: true,
    onlyForTypes: ["Group"],
    required: true,
    displayName: "Children",
    tags: ["_NoControl"],
  }),
  compoundField: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Group"],
    displayName: "CompoundField",
    tags: ["_NestedSchemaField"],
  }),
  groupOptions: makeCompoundField({
    children: GroupRenderOptionsSchema,
    onlyForTypes: ["Group"],
    displayName: "GroupOptions",
  }),
  displayData: makeCompoundField({
    children: DisplayDataSchema,
    onlyForTypes: ["Display"],
    required: true,
    displayName: "DisplayData",
  }),
  actionId: makeScalarField({
    type: FieldType.String,
    onlyForTypes: ["Action"],
    required: true,
    displayName: "ActionId",
  }),
});

export const defaultControlDefinitionForm: ControlDefinitionForm =
  defaultValueForFields(ControlDefinitionSchema);

export function toControlDefinitionForm(
  v: ControlDefinition,
): ControlDefinitionForm {
  return applyDefaultValues(v, ControlDefinitionSchema);
}