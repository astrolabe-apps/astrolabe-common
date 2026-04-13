import {
  FieldType,
  makeScalarField,
  buildSchema,
  defaultValueForFields,
  makeCompoundField,
  SchemaField,
} from "@react-typed-forms/schemas";
import {
  SearchOptions,
  ItemInfo,
  ItemSearchResults,
  ItemDashboardData,
  AdminItemDashboardData,
  ExportDefinitionDashboardInfoData,
  ExportDefinitionDashboardData,
  ExportColumnData,
  ExportDefinitionEditData,
  ExportDefinitionSelectionData,
  ExportDefinitionSelectionsData,
  TableDefinitionSelectionData,
  ItemEventData,
  ItemNoteResultData,
  ItemViewData,
  FormConfigData,
  FormLayoutMode,
  PageNavigationStyle,
} from "./types";

export const SearchOptionsSchema = buildSchema<SearchOptions>({
  offset: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Offset",
  }),
  length: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Length",
  }),
  query: makeScalarField({
    type: FieldType.String,
    displayName: "Query",
  }),
  sort: makeScalarField({
    type: FieldType.String,
    collection: true,
    displayName: "Sort",
  }),
  filters: makeScalarField({
    type: FieldType.Any,
    displayName: "Filters",
  }),
});

export const defaultSearchOptions: SearchOptions =
  defaultValueForFields(SearchOptionsSchema);

export const ItemInfoSchema = buildSchema<ItemInfo>({
  id: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Id",
  }),
  firstName: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "First Name",
  }),
  lastName: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Last Name",
  }),
  createdOn: makeScalarField({
    type: FieldType.DateTime,
    notNullable: true,
    required: true,
    displayName: "Created On",
  }),
  status: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Status",
  }),
  formType: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Form Type",
  }),
  submittedOn: makeScalarField({
    type: FieldType.DateTime,
    displayName: "Submitted On",
  }),
});

export const ItemSearchResultsSchema = buildSchema<ItemSearchResults>({
  total: makeScalarField({
    type: FieldType.Int,
    displayName: "Total",
  }),
  entries: makeCompoundField({
    children: ItemInfoSchema,
    schemaRef: "ItemInfo",
    collection: true,
    notNullable: true,
    displayName: "Entries",
  }),
});

export const ItemDashboardSchema = buildSchema<ItemDashboardData>({
  request: makeCompoundField({
    children: SearchOptionsSchema,
    schemaRef: "SearchOptions",
    notNullable: true,
    displayName: "Request",
  }),
  results: makeCompoundField({
    children: ItemSearchResultsSchema,
    schemaRef: "ItemSearchResults",
    displayName: "Results",
  }),
  createType: makeScalarField({
    type: FieldType.String,
    displayName: "Create Type",
  }),
});

export const AdminItemDashboardSchema = buildSchema<AdminItemDashboardData>({
  request: makeCompoundField({
    children: SearchOptionsSchema,
    schemaRef: "SearchOptions",
    notNullable: true,
    displayName: "Request",
  }),
  results: makeCompoundField({
    children: ItemSearchResultsSchema,
    schemaRef: "ItemSearchResults",
    displayName: "Results",
  }),
});

export const ExportDefinitionDashboardInfoSchema =
  buildSchema<ExportDefinitionDashboardInfoData>({
    id: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Id",
    }),
    name: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Name",
    }),
    tableDefinitionName: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Table Definition Name",
    }),
    tableDefinitionId: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Table Definition Id",
    }),
  });

export const ExportDefinitionDashboardSchema =
  buildSchema<ExportDefinitionDashboardData>({
    request: makeCompoundField({
      children: SearchOptionsSchema,
      schemaRef: "SearchOptions",
      notNullable: true,
      displayName: "Request",
    }),
    definitionInfos: makeCompoundField({
      children: ExportDefinitionDashboardInfoSchema,
      schemaRef: "ExportDefinitionDashboardInfo",
      collection: true,
      displayName: "Definition Infos",
    }),
  });

export const ExportColumnSchema = buildSchema<ExportColumnData>({
  field: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Field",
  }),
  columnName: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Column Name",
  }),
  expression: makeScalarField({
    type: FieldType.String,
    displayName: "Expression",
  }),
});

export const ExportDefinitionEditSchema =
  buildSchema<ExportDefinitionEditData>({
    tableDefinitionId: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Table Definition Id",
    }),
    name: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Name",
    }),
    exportColumns: makeCompoundField({
      children: ExportColumnSchema,
      schemaRef: "ExportColumn",
      collection: true,
      notNullable: true,
      displayName: "Export Columns",
    }),
  });

export const ExportDefinitionSelectionSchema =
  buildSchema<ExportDefinitionSelectionData>({
    tableDefinitionName: makeScalarField({
      type: FieldType.String,
      displayName: "Table Definition Name",
    }),
    tableDefinitionId: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Table Definition Id",
    }),
    exportDefinitionId: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Export Definition Id",
    }),
  });

export const ExportDefinitionSelectionsSchema =
  buildSchema<ExportDefinitionSelectionsData>({
    exportDefinitions: makeCompoundField({
      children: ExportDefinitionSelectionSchema,
      schemaRef: "ExportDefinitionSelection",
      collection: true,
      notNullable: true,
      displayName: "Export Definitions",
    }),
  });

export const TableDefinitionSelectionSchema =
  buildSchema<TableDefinitionSelectionData>({
    tableDefinitionId: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Table Definition Id",
    }),
  });

export const ItemEventSchema = buildSchema<ItemEventData>({
  eventType: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Event Type",
  }),
  timestamp: makeScalarField({
    type: FieldType.DateTime,
    notNullable: true,
    required: true,
    displayName: "Timestamp",
  }),
  message: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Message",
  }),
  personName: makeScalarField({
    type: FieldType.String,
    displayName: "Person Name",
  }),
  oldStatus: makeScalarField({
    type: FieldType.String,
    displayName: "Old Status",
  }),
  newStatus: makeScalarField({
    type: FieldType.String,
    displayName: "New Status",
  }),
});

export const ItemNoteResultSchema = buildSchema<ItemNoteResultData>({
  message: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Message",
  }),
  personName: makeScalarField({
    type: FieldType.String,
    displayName: "Person Name",
  }),
  timestamp: makeScalarField({
    type: FieldType.DateTime,
    notNullable: true,
    required: true,
    displayName: "Timestamp",
  }),
});

export const ItemViewSchema = buildSchema<ItemViewData>({
  actions: makeScalarField({
    type: FieldType.String,
    collection: true,
    notNullable: true,
    displayName: "Actions",
  }),
  formType: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Form Type",
  }),
  metadata: makeScalarField({
    type: FieldType.Any,
    notNullable: true,
    required: true,
    displayName: "Metadata",
  }),
  status: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Status",
  }),
  createdAt: makeScalarField({
    type: FieldType.DateTime,
    notNullable: true,
    required: true,
    displayName: "Created At",
  }),
  submittedAt: makeScalarField({
    type: FieldType.DateTime,
    displayName: "Submitted At",
  }),
  events: makeCompoundField({
    children: ItemEventSchema,
    schemaRef: "ItemEvent",
    collection: true,
    displayName: "Events",
  }),
  notes: makeCompoundField({
    children: ItemNoteResultSchema,
    schemaRef: "ItemNoteResult",
    collection: true,
    displayName: "Notes",
  }),
});

export const FormConfigSchema = buildSchema<FormConfigData>({
  layoutMode: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Layout Mode",
    options: [
      { name: "SinglePage", value: "SinglePage" },
      { name: "MultiPage", value: "MultiPage" },
    ],
  }),
  navigationStyle: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Navigation Style",
    options: [
      { name: "Wizard", value: "Wizard" },
      { name: "Stepper", value: "Stepper" },
      { name: "Tabs", value: "Tabs" },
    ],
  }),
  public: makeScalarField({
    type: FieldType.Bool,
    displayName: "Public",
  }),
  published: makeScalarField({
    type: FieldType.Bool,
    displayName: "Published",
  }),
});

/**
 * Default schema map containing all built-in schemas.
 */
export const DefaultSchemaMap: Record<string, SchemaField[]> = {
  SearchOptions: SearchOptionsSchema,
  ItemInfo: ItemInfoSchema,
  ItemSearchResults: ItemSearchResultsSchema,
  ItemDashboard: ItemDashboardSchema,
  AdminItemDashboard: AdminItemDashboardSchema,
  ExportDefinitionDashboardInfo: ExportDefinitionDashboardInfoSchema,
  ExportDefinitionDashboard: ExportDefinitionDashboardSchema,
  ExportColumn: ExportColumnSchema,
  ExportDefinitionEdit: ExportDefinitionEditSchema,
  ExportDefinitionSelection: ExportDefinitionSelectionSchema,
  ExportDefinitionSelections: ExportDefinitionSelectionsSchema,
  TableDefinitionSelection: TableDefinitionSelectionSchema,
  ItemEvent: ItemEventSchema,
  ItemNoteResult: ItemNoteResultSchema,
  ItemView: ItemViewSchema,
  FormConfig: FormConfigSchema,
};