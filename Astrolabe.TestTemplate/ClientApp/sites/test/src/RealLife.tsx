import { RenderArrayElements, useControl } from "@react-typed-forms/core";
import {
  ControlRenderer,
  createDefaultRenderers,
  createFormRenderer,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas";
import React from "react";
import {
  InitialFireRegistrationForm,
  InitialFireRegistrationSchema,
  TypeOfFireForm,
} from "./schemas";
import Controls from "./FireInitial.json";

const AllControls = Controls.controls;

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

export function RealLife() {
  const control = useControl<Partial<InitialFireRegistrationForm>>({
    burnRegistrationEnabled: true,
    initialType: TypeOfFireForm.Permit,
  });
  return (
    <div className="container">
      <RenderArrayElements array={AllControls}>
        {(c) => (
          <ControlRenderer
            definition={c}
            fields={InitialFireRegistrationSchema}
            renderer={formRenderer}
            control={control}
          />
        )}
      </RenderArrayElements>
      <pre>{JSON.stringify(control.value)}</pre>
    </div>
  );
}
