import clsx from "clsx";
// noinspection ES6UnusedImports
import React, { createElement as h, Fragment, ReactNode } from "react";
import { RenderElements, useTrackedComponent } from "@react-typed-forms/core";
import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayActionOptions,
  ArrayRendererProps,
  ArrayRendererRegistration,
  ArrayRenderOptions,
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
  FormNode,
  FormRenderer,
  getLengthRestrictions,
  GroupedControlsDefinition,
  GroupRenderType,
  isArrayRenderer,
  isCompoundField,
  lookupDataNode,
  makeHookDepString,
  mergeObjects,
  nodeForControl,
  SchemaDataNode,
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
    formNode,
  } = dataProps;
  const { addText, noAdd, noRemove, noReorder, removeText, editExternal } =
    mergeObjects(
      isArrayRenderer(renderOptions)
        ? renderOptions
        : ({} as ArrayRenderOptions),
      defaultActions as ArrayRenderOptions,
    );

  const childOptions = isArrayRenderer(renderOptions)
    ? renderOptions.childOptions
    : undefined;

  const renderAsElement = !isCompoundField(field);
  const childDefinition: FormNode = nodeForControl(
    !renderAsElement
      ? ({
          type: ControlDefinitionType.Group,
          children: definition.children,
          groupOptions: { type: GroupRenderType.Standard, hideTitle: true },
        } as GroupedControlsDefinition)
      : ({
          type: ControlDefinitionType.Data,
          field: definition.field,
          children: definition.children,
          renderOptions: childOptions ?? { type: DataRenderType.Standard },
          hideTitle: true,
        } as DataControlDefinition),
    formNode.tree,
  );

  const visibilities = (definition.children ?? []).map(
    (x) => [useChildVisibility(x, undefined, true), x] as const,
  );
  const deps = makeHookDepString(visibilities, (x) => x[0].deps);
  const Entry = useTrackedComponent(RenderEntry, [deps]);

  const arrayProps = {
    ...createArrayActions(control.as(), field, {
      addText,
      removeText,
      noAdd,
      noRemove,
      readonly,
      disabled: control.disabled,
      designMode,
      editExternal,
    }),
    required,
    renderElement: (i, wrap) => (
      <Entry
        index={i}
        renderChildElement={renderChildElement}
        dataContext={dataContext}
        visibilities={visibilities}
        wrap={wrap}
      />
    ),
    className: className ? className : undefined,
    style,
    ...getLengthRestrictions(definition),
  } satisfies ArrayRendererProps;

  return renderers.renderArray(arrayProps);

  function renderChildElement(i: number, elementNode: SchemaDataNode) {
    return renderChild(
      control.elements?.[i].uniqueId ?? i,
      childDefinition,
      renderAsElement
        ? {
            elementIndex: i,
          }
        : { parentDataNode: elementNode },
    );
  }
}

function RenderEntry({
  index: i,
  renderChildElement,
  visibilities,
  wrap,
  dataContext,
}: {
  index: number;
  renderChildElement: (i: number, element: SchemaDataNode) => ReactNode;
  visibilities: (readonly [EvalExpressionHook<boolean>, ControlDefinition])[];
  dataContext: ControlDataContext;
  wrap: (n: ReactNode) => ReactNode;
}) {
  const elementNode = dataContext.dataNode!.getChildElement(i);
  const childVis = visibilities.map(
    ([hook, def]) =>
      hook.runHook(
        {
          ...dataContext,
          parentNode: elementNode,
          dataNode: lookupDataNode(def, elementNode),
        },
        hook.state,
      ).value,
  );
  const anyVisible = childVis.length == 0 || childVis.some((x) => x === true);
  if (!anyVisible) return undefined;
  return wrap(renderChildElement(i, elementNode));
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
    editAction,
  } = props;
  const { addAction, removeAction } = applyArrayLengthRestrictions(props);
  return (
    <div style={style}>
      <div className={clsx(className, removeAction && removableClass)}>
        <RenderElements control={arrayControl}>
          {(_, x) =>
            renderElement(x, (children) =>
              removeAction || editAction ? (
                <>
                  <div className={clsx(childClass, removableChildClass)}>
                    {children}
                  </div>
                  <div className={removeActionClass}>
                    {editAction && renderAction(editAction(x))}
                    {removeAction && renderAction(removeAction(x))}
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
