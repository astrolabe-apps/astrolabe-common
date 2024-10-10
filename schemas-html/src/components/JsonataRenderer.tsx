import { Control, useComputed } from "@react-typed-forms/core";
import React from "react";
import {
  coerceToString,
  ControlDataContext,
  createDataRenderer,
  DataRenderType,
  getJsonPath,
  getRootDataNode,
  JsonataRenderOptions,
  rendererClass,
  SchemaDataNode,
  useJsonataExpression,
} from "@react-typed-forms/schemas";

export function createJsonataRenderer(className?: string) {
  return createDataRenderer(
    (p) => (
      <JsonataRenderer
        renderOptions={p.renderOptions as JsonataRenderOptions}
        className={rendererClass(p.className, className)}
        dataNode={p.dataNode}
        dataContext={p.dataContext}
        control={p.control}
        readonly={p.readonly}
      />
    ),
    { renderType: DataRenderType.Jsonata },
  );
}

export function JsonataRenderer({
  control,
  renderOptions,
  readonly,
  className,
  dataContext,
  dataNode,
}: {
  control: Control<any>;
  renderOptions: JsonataRenderOptions;
  className?: string;
  dataContext: ControlDataContext;
  dataNode: SchemaDataNode;
  readonly: boolean;
}) {
  const sdn = dataContext.parentNode;
  const bindings = useComputed(() => ({
    value: control.value,
    readonly,
    disabled: control.disabled,
    formData: dataContext.formData,
    dataPath: getJsonPath(dataNode),
  }));
  const rendered = useJsonataExpression(
    renderOptions.expression,
    getRootDataNode(sdn).control!,
    getJsonPath(sdn),
    bindings,
    coerceToString,
  );
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered.value }}
    />
  );
}
