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
  useControlEffect,
} from "@react-typed-forms/core";

export const PagerDefinition: CustomRenderOptions = {
  name: "Pager",
  value: "Pager",
};

export const PagerExtension: ControlDefinitionExtension = {
  RenderOptions: PagerDefinition,
};

export interface PagerRendererOptions {
  classes: PagerClasses;
  defaultPerPage: number;
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
  defaultPerPage: 50,
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
  const { classes, defaultPerPage } = options;
  const {
    buttonGroupClass,
    currentClass,
    numberClass,
    className: cn,
  } = classes;

  const { fields } = dataNode.control! as Control<{
    page: number;
    perPage: number;
  }>;
  const { page, perPage } = fields
    ? fields
    : { page: { value: 0 }, perPage: { value: defaultPerPage } };

  const total = schemaDataForFieldPath(["results", "totalRows"], parent)
    .control as Control<number>;

  const totalPages = useComputed(() => {
    const pp = perPage.value ?? defaultPerPage;
    return Math.floor((total.value - 1) / pp) + 1;
  });

  useControlEffect(
    () => [totalPages.value, page.value] as const,
    ([total, current]) => {
      if (total > 0 && total < current + 1) {
        page.value = current < 0 ? 0 : current - 1;
      }
    },
  );

  const currentPage = page.value ?? 0;

  function changePage(dir: number) {
    if (!designMode) page.value = currentPage + dir;
  }
  const nextAction = createAction("nextPage", () => changePage(1), "Next", {
    disabled: currentPage >= totalPages.value - 1,
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
        Showing page {numText(currentPage + 1)} of {numText(totalPages.value)}
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
