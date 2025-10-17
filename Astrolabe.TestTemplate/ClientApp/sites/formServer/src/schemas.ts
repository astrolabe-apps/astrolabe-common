import {
  FieldType,
  makeScalarField,
  buildSchema,
  defaultValueForFields,
  applyDefaultValues,
  makeCompoundField,
} from "@react-typed-forms/schemas";
import {
  SearchOptions,
  ItemStatus,
  CarInfo,
  CarInfoSearchResults,
  CarSearchPage,
} from "./client";

export interface SearchOptionsForm {
  offset: number;
  length: number;
  query: string | null;
  sort: string[] | null;
  filters: any | null;
}

export const SearchOptionsSchema = buildSchema<SearchOptionsForm>({
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

export const defaultSearchOptionsForm: SearchOptionsForm =
  defaultValueForFields(SearchOptionsSchema);

export function toSearchOptionsForm(v: SearchOptions): SearchOptionsForm {
  return applyDefaultValues(v, SearchOptionsSchema);
}

export interface CarInfoForm {
  make: string;
  model: string;
  year: number;
  status: ItemStatus;
}

export const CarInfoSchema = buildSchema<CarInfoForm>({
  make: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Make",
  }),
  model: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Model",
  }),
  year: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Year",
  }),
  status: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Status",
    options: [
      {
        name: "Draft",
        value: "Draft",
      },
      {
        name: "Published",
        value: "Published",
      },
    ],
  }),
});

export const defaultCarInfoForm: CarInfoForm =
  defaultValueForFields(CarInfoSchema);

export function toCarInfoForm(v: CarInfo): CarInfoForm {
  return applyDefaultValues(v, CarInfoSchema);
}

export interface CarInfoSearchResultsForm {
  total: number | null;
  entries: CarInfoForm[];
}

export const CarInfoSearchResultsSchema = buildSchema<CarInfoSearchResultsForm>(
  {
    total: makeScalarField({
      type: FieldType.Int,
      displayName: "Total",
    }),
    entries: makeCompoundField({
      children: CarInfoSchema,
      schemaRef: "CarInfo",
      collection: true,
      notNullable: true,
      displayName: "Entries",
    }),
  },
);

export const defaultCarInfoSearchResultsForm: CarInfoSearchResultsForm =
  defaultValueForFields(CarInfoSearchResultsSchema);

export function toCarInfoSearchResultsForm(
  v: CarInfoSearchResults,
): CarInfoSearchResultsForm {
  return applyDefaultValues(v, CarInfoSearchResultsSchema);
}

export interface CarSearchPageForm {
  request: SearchOptionsForm;
  results: CarInfoSearchResultsForm;
  loading: boolean;
}

export const CarSearchPageSchema = buildSchema<CarSearchPageForm>({
  request: makeCompoundField({
    children: SearchOptionsSchema,
    schemaRef: "SearchOptions",
    notNullable: true,
    displayName: "Request",
  }),
  results: makeCompoundField({
    children: CarInfoSearchResultsSchema,
    schemaRef: "CarInfoSearchResults",
    notNullable: true,
    displayName: "Results",
  }),
  loading: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    required: true,
    displayName: "Loading",
  }),
});

export const defaultCarSearchPageForm: CarSearchPageForm =
  defaultValueForFields(CarSearchPageSchema);

export function toCarSearchPageForm(v: CarSearchPage): CarSearchPageForm {
  return applyDefaultValues(v, CarSearchPageSchema);
}

export interface ChartDatasetForm {
  label: string;
  data: number[];
  color?: string | null;
}

export const ChartDatasetSchema = buildSchema<ChartDatasetForm>({
  label: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Label",
  }),
  data: makeScalarField({
    type: FieldType.Double,
    collection: true,
    notNullable: true,
    required: true,
    displayName: "Data",
  }),
  color: makeScalarField({
    type: FieldType.String,
    displayName: "Color",
  }),
});

export interface ChartDataForm {
  labels: string[];
  datasets: ChartDatasetForm[];
}

export const ChartDataSchema = buildSchema<ChartDataForm>({
  labels: makeScalarField({
    type: FieldType.String,
    collection: true,
    notNullable: true,
    required: true,
    displayName: "Labels",
  }),
  datasets: makeCompoundField({
    children: ChartDatasetSchema,
    schemaRef: "ChartDataset",
    collection: true,
    notNullable: true,
    displayName: "Datasets",
  }),
});

export interface ChartsDemoForm {
  salesChart: ChartDataForm;
  performanceChart: ChartDataForm;
}

export const ChartsDemoSchema = buildSchema<ChartsDemoForm>({
  salesChart: makeCompoundField({
    children: ChartDataSchema,
    schemaRef: "ChartData",
    notNullable: true,
    displayName: "Sales Chart",
  }),
  performanceChart: makeCompoundField({
    children: ChartDataSchema,
    schemaRef: "ChartData",
    notNullable: true,
    displayName: "Performance Chart",
  }),
});

export const defaultChartsDemoForm: ChartsDemoForm =
  defaultValueForFields(ChartsDemoSchema);

export const SchemaMap = {
  SearchOptions: SearchOptionsSchema,
  CarInfo: CarInfoSchema,
  CarInfoSearchResults: CarInfoSearchResultsSchema,
  CarSearchPage: CarSearchPageSchema,
  ChartDataset: ChartDatasetSchema,
  ChartData: ChartDataSchema,
  ChartsDemo: ChartsDemoSchema,
};
