import { createDataRenderer } from "../renderers";
import { useJsonataExpression } from "../hooks";
import { DataRenderType, JsonataRenderOptions } from "../types";
import { ControlDataContext, rendererClass } from "../util";
import { Control } from "@react-typed-forms/core";
import React from "react";

export function createJsonataRenderer(className?: string) {
  return createDataRenderer(
    (p) => (
      <JsonataRenderer
        renderOptions={p.renderOptions as JsonataRenderOptions}
        className={rendererClass(p.className, className)}
        dataContext={p.parentContext}
        control={p.control}
        readonly={p.readonly}
      />
    ),
    { renderType: DataRenderType.Jsonata },
  );
}

export function JsonataRenderer({
  control,
  renderOptions: { expression },
  readonly,
  className,
  dataContext,
}: {
  control: Control<any>;
  renderOptions: JsonataRenderOptions;
  className?: string;
  dataContext: ControlDataContext;
  readonly: boolean;
}) {
  const rendered = useJsonataExpression(
    expression,
    dataContext,
    () => ({
      value: control.value,
      readonly,
      disabled: control.disabled,
    }),
    (v) =>
      v == null
        ? ""
        : typeof v === "object"
          ? "error: " + JSON.stringify(v)
          : v.toString(),
  );
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered.value }}
    />
  );
}
