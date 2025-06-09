import {
  ChangeListenerFunc,
  Control,
  delayedValue,
  trackedValue,
  useComputed,
} from "@react-typed-forms/core";
import React from "react";
import {
  coerceToString,
  ControlDataContext,
  createDataRenderer,
  DataRenderType,
  ExpressionType,
  FormContextData,
  getJsonPath,
  JsonataExpression,
  JsonataRenderOptions,
  rendererClass,
  RunExpression,
  SchemaDataNode,
  useExpression,
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
        runExpression={p.runExpression}
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
  runExpression,
}: {
  control: Control<any>;
  renderOptions: JsonataRenderOptions;
  className?: string;
  dataContext: ControlDataContext;
  dataNode: SchemaDataNode;
  readonly: boolean;
  runExpression: RunExpression;
}) {
  const sdn = dataNode.elementIndex != null ? dataNode : dataContext.parentNode;
  const bindings = (changes: ChangeListenerFunc<any>) => ({
    value: trackedValue(control, changes),
    readonly,
    disabled: control.disabled,
    dataPath: getJsonPath(dataNode),
  });
  const rendered = useExpression(
    "",
    runExpression,
    {
      type: ExpressionType.Jsonata,
      expression: renderOptions.expression,
    } as JsonataExpression,
    coerceToString,
    bindings,
  );
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered.value }}
    />
  );
}
