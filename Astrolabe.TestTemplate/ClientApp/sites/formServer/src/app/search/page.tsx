"use client";

import { useApiClient } from "@astroapps/client/hooks/useApiClient";
import { CarClient, CarEdit } from "../../client";
import { useEffect } from "react";
import {Control, RenderArrayElements, useControl} from "@react-typed-forms/core";
import {
  ControlRenderer,
  DefaultSchemaInterface,
} from "@react-typed-forms/schemas";
import { FormDefinitions } from "../../forms";
import {CarEditForm, CarSearchPageForm, defaultCarSearchPageForm} from "../../schemas";
import { createStdFormRenderer } from "../../renderers";

const renderer = createStdFormRenderer(null);
export default function SearchPage() {
  const carClient = useApiClient(CarClient);
  const pageControl = useControl<CarSearchPageForm>(defaultCarSearchPageForm);

  const results = pageControl.fields.results;

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
          />
        )}
      </RenderArrayElements>
    </div>
  );

  async function loadAll() {
    results.value = await carClient.listPublished();
  }
}

class DataBackedSchema extends DefaultSchemaInterface {
  constructor(results: Control<CarEditForm[]>) {
    super();
  }
  
}
