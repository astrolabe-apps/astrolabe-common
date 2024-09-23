import {
  FieldType,
  makeScalarField,
  buildSchema,
  defaultValueForFields,
  applyDefaultValues,
} from "@react-typed-forms/schemas";
import { SearchQueryState } from "./client";

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

export const SchemaMap = {
  SearchQueryState: SearchQueryStateSchema,
};
