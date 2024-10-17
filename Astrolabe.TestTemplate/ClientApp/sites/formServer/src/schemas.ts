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
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Status",
    options: [
      {
        name: "Draft",
        value: 0,
      },
      {
        name: "Published",
        value: 1,
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
});

export const defaultCarSearchPageForm: CarSearchPageForm =
  defaultValueForFields(CarSearchPageSchema);

export function toCarSearchPageForm(v: CarSearchPage): CarSearchPageForm {
  return applyDefaultValues(v, CarSearchPageSchema);
}

export const SchemaMap = {
  SearchOptions: SearchOptionsSchema,
  CarInfo: CarInfoSchema,
  CarInfoSearchResults: CarInfoSearchResultsSchema,
  CarSearchPage: CarSearchPageSchema,
};
