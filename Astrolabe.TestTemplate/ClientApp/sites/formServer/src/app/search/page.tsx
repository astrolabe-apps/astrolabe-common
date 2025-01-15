"use client";

import { useApiClient } from "@astroapps/client";
import { CarClient, CarEdit, CarInfo } from "../../client";
import { useEffect, useMemo } from "react";
import {
  Control,
  RenderArrayElements,
  useControl,
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

const renderer = createStdFormRenderer(null);
const schemaLookup = createSchemaLookup(SchemaMap);
const carInfoNode = schemaLookup.getSchema("CarInfo")!;

export default function SearchPage() {
  const carClient = useApiClient(CarClient);
  const pageControl = useControl<CarSearchPageForm>({
    ...defaultCarSearchPageForm,
    request: { ...defaultSearchOptions, length: 1 },
  });
  const {
    fields: {
      results: {
        fields: { total },
      },
    },
  } = pageControl;
  const allResults = useControl<CarInfo[]>();
  const schemaInterface = useMemo(
    () => new DataBackedSchema(allResults),
    [allResults],
  );

  const { results, request } = pageControl.fields;
  useClientSearching(
    allResults,
    results.fields.entries,
    request as Control<SearchOptions>,
    carInfoNode,
    schemaInterface,
  );

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="container">
      <RenderArrayElements array={FormDefinitions.CarSearch.controls}>
        {(c) => (
          <ControlRenderer
            definition={c}
            fields={FormDefinitions.CarSearch.schema}
            renderer={renderer}
            control={pageControl}
            options={{ schemaInterface }}
          />
        )}
      </RenderArrayElements>
    </div>
  );

  async function loadAll() {
    allResults.value = await carClient.listAll();
    total.value = allResults.value.length;
  }
}

class DataBackedSchema extends DefaultSchemaInterface {
  constructor(private results: Control<CarInfo[] | undefined>) {
    super();
  }
  getFilterOptions(array: SchemaDataNode, sdn: SchemaNode) {
    const allResults = this.results.value;
    if (allResults) {
      const field = sdn.field;
      const allValues = new Set(
        allResults.map((x) => x[field.field as keyof CarInfo] as any),
      );
      return [...allValues].map((x) => ({
        name: this.textValue(field, x) ?? "<null>",
        value: x,
      }));
    }
    return super.getFilterOptions(array, sdn);
  }
}
