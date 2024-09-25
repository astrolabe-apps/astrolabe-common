"use client";

import { useApiClient } from "@astroapps/client/hooks/useApiClient";
import { CarClient, CarEdit } from "../../client";
import { useEffect, useMemo } from "react";
import {
  Control,
  RenderArrayElements,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  ControlRenderer,
  DefaultSchemaInterface,
  SchemaDataNode,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { FormDefinitions } from "../../forms";
import { CarSearchPageForm, defaultCarSearchPageForm } from "../../schemas";
import { createStdFormRenderer } from "../../renderers";
import { makeFilterFunc } from "@astroapps/searchstate";

const renderer = createStdFormRenderer(null);
export default function SearchPage() {
  const carClient = useApiClient(CarClient);
  const pageControl = useControl<CarSearchPageForm>(defaultCarSearchPageForm);
  const allResults = useControl<CarEdit[]>();
  const schemaInterface = useMemo(
    () => new DataBackedSchema(allResults),
    [allResults],
  );

  const { results, request } = pageControl.fields;

  useControlEffect(
    () => [allResults.value, request.fields.filters.value],
    ([x, fv]) => {
      if (x) {
        const f = makeFilterFunc<CarEdit>(
          (field) => (r) => r[field as keyof CarEdit] as string,
          fv,
        );
        results.value = f ? x.filter(f) : x;
      }
    },
  );

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div>
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
    allResults.value = await carClient.listPublished();
  }
}

class DataBackedSchema extends DefaultSchemaInterface {
  constructor(private results: Control<CarEdit[] | undefined>) {
    super();
  }
  getFilterOptions(array: SchemaDataNode, sdn: SchemaNode) {
    const allResults = this.results.value;
    if (allResults) {
      const field = sdn.field;
      const allValues = new Set(
        allResults.map((x) => x[field.field as keyof CarEdit] as any),
      );
      return [...allValues].map((x) => ({
        name: this.textValue(field, x) ?? "<null>",
        value: x,
      }));
    }
    return super.getFilterOptions(array, sdn);
  }
}
