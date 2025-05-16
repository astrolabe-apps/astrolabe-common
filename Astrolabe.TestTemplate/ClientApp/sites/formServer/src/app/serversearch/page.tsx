"use client";

import { useApiClient } from "@astroapps/client";
import { CarClient, CarEdit, CarInfo } from "../../client";
import { useEffect, useMemo } from "react";
import {
  Control,
  RenderArrayElements,
  useControl,
  useControlEffect,
  useDebounced,
} from "@react-typed-forms/core";
import {
  ControlRenderer,
  createSchemaLookup,
  DefaultSchemaInterface,
  SchemaDataNode,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { FormDefinitions } from "../../forms";
import {
  CarSearchPageForm,
  defaultCarSearchPageForm,
  SchemaMap,
} from "../../schemas";
import { createStdFormRenderer } from "../../renderers";
import {
  defaultSearchOptions,
  useClientSearching,
} from "@astroapps/schemas-datagrid";
import { SearchOptions } from "@astroapps/searchstate";
import { CircularProgress } from "@astrolabe/ui/CircularProgress";

const renderer = createStdFormRenderer(null);
const schemaLookup = createSchemaLookup(SchemaMap);
const carInfoNode = schemaLookup.getSchema("CarInfo")!;

export default function SearchPage() {
  const carClient = useApiClient(CarClient);
  const pageControl = useControl<CarSearchPageForm>({
    ...defaultCarSearchPageForm,
    request: { ...defaultSearchOptions, length: 5 },
  });
  const { results, request, loading } = pageControl.fields;
  useEffect(() => {
    doSearch();
  }, []);

  useControlEffect(
    () => pageControl.fields.request.value,
    useDebounced(doSearch, 300),
  );

  return (
    <div className="container">
      <RenderArrayElements array={FormDefinitions.CarSearch.controls}>
        {(c) => (
          <ControlRenderer
            definition={c}
            fields={FormDefinitions.CarSearch.schema}
            renderer={renderer}
            control={pageControl}
          />
        )}
      </RenderArrayElements>
      {loading.value && <CircularProgress />}
    </div>
  );

  async function doSearch() {
    loading.value = true;
    try {
      results.value = await carClient.searchCars(request.value);
    } finally {
      loading.value = false;
    }
  }
}
