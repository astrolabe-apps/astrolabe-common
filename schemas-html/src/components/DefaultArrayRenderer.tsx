import clsx from "clsx";
import React, { Fragment, ReactNode } from "react";
import {
  Control,
  RenderElements,
  useTrackedComponent,
} from "@react-typed-forms/core";
import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayActionOptions,
  ArrayRendererProps,
  ArrayRendererRegistration,
  ArrayRenderOptions,
  ChildRenderer,
  ControlDataContext,
  ControlDefinition,
  ControlDefinitionType,
  createArrayActions,
  createDataRenderer,
  DataControlDefinition,
  DataRendererProps,
  DataRendererRegistration,
  DataRenderType,
  EvalExpressionHook,
  FormRenderer,
  getLengthRestrictions,
  isArrayRenderer,
  lookupDataNode,
  makeHookDepString,
  mergeObjects,
} from "@react-typed-forms/schemas";

export function createDefaultArrayDataRenderer(
  defaultActions?: ArrayActionOptions,
): DataRendererRegistration {
  return createDataRenderer(
    (props, renderers) => {
      return (
        <DataArrayRenderer
          dataProps={props}
          renderers={renderers}
          defaultActions={defaultActions}
        />
      );
    },
    { renderType: DataRenderType.Array, collection: true },
  );
}

export function DataArrayRenderer({
  dataProps,
  renderers,
  defaultActions,
}: {
  renderers: FormRenderer;
  dataProps: DataRendererProps;
  defaultActions?: ArrayActionOptions;
}) {
  const {
    renderOptions,
    control,
    field,
    readonly,
    designMode,
    required,
    renderChild,
    definition,
    className,
    style,
    useChildVisibility,
    dataContext,
  } = dataProps;
  const { addText, noAdd, noRemove, noReorder, removeText } = mergeObjects(
    isArrayRenderer(renderOptions) ? renderOptions : ({} as ArrayRenderOptions),
    defaultActions as ArrayRenderOptions,
  );
  const childOptions = isArrayRenderer(renderOptions)
    ? renderOptions.childOptions
    : undefined;

  const childDefinition = {
    type: ControlDefinitionType.Data,
    field: definition.field,
    children: definition.children,
    renderOptions: childOptions ?? { type: DataRenderType.Standard },
    hideTitle: true,
  } as DataControlDefinition;

  const visibilities = (definition.children ?? []).map(
    (x) => [useChildVisibility(x, undefined, true), x] as const,
  );
  const deps = makeHookDepString(visibilities, (x) => x[0].deps);
  const Entry = useTrackedComponent(RenderEntry, [deps]);

  const arrayProps = {
    ...createArrayActions(control, field, {
      addText,
      removeText,
      noAdd,
      noRemove,
      readonly,
      disabled: control.disabled,
      designMode,
    }),
    required,
    renderElement: (i, wrap) => (
      <Entry
        index={i}
        renderChild={renderChild}
        control={control}
        dataContext={dataContext}
        definition={childDefinition}
        visibilities={visibilities}
        wrap={wrap}
      />
    ),
    className: className ? className : undefined,
    style,
    ...getLengthRestrictions(definition),
  } satisfies ArrayRendererProps;

  return renderers.renderArray(arrayProps);
}

function RenderEntry({
  index: i,
  renderChild,
  control,
  definition,
  visibilities,
  wrap,
  dataContext,
}: {
  index: number;
  renderChild: ChildRenderer;
  control: Control<any>;
  visibilities: (readonly [EvalExpressionHook<boolean>, ControlDefinition])[];
  definition: DataControlDefinition;
  dataContext: ControlDataContext;
  wrap: (n: ReactNode) => ReactNode;
}) {
  const parentNode = dataContext.dataNode!.getChildElement(i);
  const childVis = visibilities.map(
    ([hook, def]) =>
      hook.runHook(
        {
          ...dataContext,
          parentNode,
          dataNode: lookupDataNode(def, parentNode),
        },
        hook.state,
      ).value,
  );
  const anyVisible = childVis.length == 0 || childVis.some((x) => x === true);
  if (!anyVisible) return undefined;
  return wrap(
    renderChild(control.elements?.[i].uniqueId ?? i, definition, {
      elementIndex: i,
    }),
  );
}

export interface DefaultArrayRendererOptions extends ArrayActionOptions {
  className?: string;
  removableClass?: string;
  childClass?: string;
  removableChildClass?: string;
  removeActionClass?: string;
  addActionClass?: string;
}

export function createDefaultArrayRenderer(
  options?: DefaultArrayRendererOptions,
): ArrayRendererRegistration {
  return {
    render: (props, { renderAction }) => (
      <DefaultArrayRenderer
        {...props}
        {...options}
        renderAction={renderAction}
      />
    ),
    type: "array",
  };
}

export interface DefaultArrayRendererProps
  extends DefaultArrayRendererOptions,
    ArrayRendererProps {
  renderAction: (props: ActionRendererProps) => ReactNode;
}

export function DefaultArrayRenderer(props: DefaultArrayRendererProps) {
  const {
    renderElement,
    className,
    removableClass,
    childClass,
    removableChildClass,
    removeActionClass,
    addActionClass,
    arrayControl,
    renderAction,
    style,
  } = props;
  const { addAction, removeAction } = applyArrayLengthRestrictions(props);
  return (
    <div style={style}>
      <div className={clsx(className, removeAction && removableClass)}>
        <RenderElements control={arrayControl}>
          {(_, x) =>
            renderElement(x, (children) =>
              removeAction ? (
                <>
                  <div className={clsx(childClass, removableChildClass)}>
                    {children}
                  </div>
                  <div className={removeActionClass}>
                    {renderAction(removeAction(x))}
                  </div>
                </>
              ) : (
                <div className={childClass}>{children}</div>
              ),
            )
          }
        </RenderElements>
      </div>
      {addAction && (
        <div className={addActionClass}>{renderAction(addAction)}</div>
      )}
    </div>
  );
}
