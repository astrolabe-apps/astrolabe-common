import {
  FieldType,
  makeScalarField,
  buildSchema,
  defaultValueForFields,
  applyDefaultValues,
  makeCompoundField,
} from "@react-typed-forms/schemas";
import { SearchQueryState, CarEdit, CarSearchPage } from "./client";

export interface SearchQueryStateForm {
  page: number;
  perPage: number;
  query: string | null;
  sort: string[] | null;
  filters: any | null;
}

export const SearchQueryStateSchema = buildSchema<SearchQueryStateForm>({
  page: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Page",
  }),
  perPage: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Per Page",
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

export const defaultSearchQueryStateForm: SearchQueryStateForm =
  defaultValueForFields(SearchQueryStateSchema);

export function toSearchQueryStateForm(
  v: SearchQueryState,
): SearchQueryStateForm {
  return applyDefaultValues(v, SearchQueryStateSchema);
}

export interface CarEditForm {
  make: string;
  model: string;
  year: number;
}

export const CarEditSchema = buildSchema<CarEditForm>({
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
});

export const defaultCarEditForm: CarEditForm =
  defaultValueForFields(CarEditSchema);

export function toCarEditForm(v: CarEdit): CarEditForm {
  return applyDefaultValues(v, CarEditSchema);
}

export interface CarSearchPageForm {
  request: SearchQueryStateForm;
  results: CarEditForm[];
}

export const CarSearchPageSchema = buildSchema<CarSearchPageForm>({
  request: makeCompoundField({
    children: SearchQueryStateSchema,
    schemaRef: "SearchQueryState",
    notNullable: true,
    displayName: "Request",
  }),
  results: makeCompoundField({
    children: CarEditSchema,
    schemaRef: "CarEdit",
    collection: true,
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
  SearchQueryState: SearchQueryStateSchema,
  CarEdit: CarEditSchema,
  CarSearchPage: CarSearchPageSchema,
};
