import {
  ControlDefinitionExtension,
  createAction,
  createDataRenderer,
  CustomRenderOptions,
  FormRenderer,
  mergeObjects,
  rendererClass,
  schemaDataForFieldPath,
  SchemaDataNode,
} from "@react-typed-forms/schemas";
import {
  Control,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import React from "react";
import { SearchOptions } from "@astroapps/searchstate";

export const PagerDefinition: CustomRenderOptions = {
  name: "Pager",
  value: "Pager",
};

export const PagerExtension: ControlDefinitionExtension = {
  RenderOptions: PagerDefinition,
};

export interface PagerRendererOptions {
  classes: PagerClasses;
  initialPerPage: number;
}

export interface PagerClasses {
  className?: string;
  numberClass?: string;
  currentClass?: string;
  buttonGroupClass?: string;
}

export const defaultPagerClasses = {
  className: "mt-2 flex flex-col items-end",
  currentClass: "text-surface-700 dark:text-surface-400 text-sm",
  buttonGroupClass: "xs:mt-0 mt-2 inline-flex gap-2",
  numberClass: "text-surface-900 font-semibold dark:text-white",
} satisfies PagerClasses;

export const defaultPagerOptions = {
  classes: defaultPagerClasses,
  initialPerPage: 50,
} satisfies PagerRendererOptions;

export function createPagerRenderer(options?: Partial<PagerRendererOptions>) {
  return createDataRenderer(
    (p, formRenderer) => (
      <PagerRenderer
        dataNode={p.dataNode}
        parent={p.dataContext.parentNode}
        designMode={p.designMode}
        options={mergeObjects(
          defaultPagerOptions,
          options as PagerRendererOptions,
        )}
        className={p.className}
        formRenderer={formRenderer}
      />
    ),
    { renderType: PagerDefinition.value },
  );
}

export function PagerRenderer({
  dataNode,
  parent,
  designMode,
  options,
  className,
  formRenderer,
}: {
  className?: string;
  dataNode: SchemaDataNode;
  parent: SchemaDataNode;
  designMode?: boolean;
  options: PagerRendererOptions;
  formRenderer: FormRenderer;
}) {
  const { classes, initialPerPage } = options;
  const {
    buttonGroupClass,
    currentClass,
    numberClass,
    className: cn,
  } = classes;
  const { fields } = dataNode.control! as Control<SearchOptions>;
  const { offset, length } = fields
    ? fields
    : { offset: { value: 0 }, length: { value: initialPerPage } };

  const total = schemaDataForFieldPath(["results", "total"], parent)
    .control as Control<number>;
  const currentTotal = total.value ?? 0;

  const perPage = length.value ?? initialPerPage;
  const totalPages = Math.floor((currentTotal - 1) / perPage) + 1;
  const currentPage = Math.floor((offset.value ?? 0) / perPage);

  if (!currentTotal) return <></>;
  function changePage(dir: number) {
    if (!designMode) offset.value = (currentPage + dir) * perPage;
  }
  const nextAction = createAction("nextPage", () => changePage(1), "Next", {
    disabled: currentPage >= totalPages - 1,
  });
  const prevAction = createAction(
    "prevPage",
    () => changePage(-1),
    "Previous",
    { disabled: currentPage <= 0 },
  );
  return (
    <div className={rendererClass(className, cn)}>
      <span className={currentClass}>
        Showing page {numText(currentPage + 1)} of {numText(totalPages)}
      </span>
      <div className={buttonGroupClass}>
        {formRenderer.renderAction(prevAction)}
        {formRenderer.renderAction(nextAction)}
      </div>
    </div>
  );

  function numText(value: number) {
    return <span className={numberClass}>{value}</span>;
  }
}
