import clsx from "clsx";
import React, { Fragment, ReactNode } from "react";
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
  HtmlComponents,
  isArrayRenderer,
  isCompoundField,
  lookupDataNode,
  makeHookDepString,
  mergeObjects,
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
  const childDefinition: FormNode = formNode.tree.createTempNode(
    formNode.id + "child",
    !renderAsElement
      ? ({
          type: ControlDefinitionType.Group,
          groupOptions: { type: GroupRenderType.Standard, hideTitle: true },
        } as GroupedControlsDefinition)
      : ({
          type: ControlDefinitionType.Data,
          field: definition.field,
          renderOptions: childOptions ?? { type: DataRenderType.Standard },
          hideTitle: true,
        } as DataControlDefinition),
    formNode.getChildNodes(),
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
    render: (props, { renderAction, html }) => (
      <DefaultArrayRenderer
        {...props}
        {...options}
        renderAction={renderAction}
        html={html}
      />
    ),
    type: "array",
  };
}

export interface DefaultArrayRendererProps
  extends DefaultArrayRendererOptions,
    ArrayRendererProps {
  renderAction: (props: ActionRendererProps) => ReactNode;
  html: HtmlComponents;
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
    html: { Div },
  } = props;
  const { addAction, removeAction } = applyArrayLengthRestrictions(props);
  return (
    <Div style={style}>
      <Div className={clsx(className, removeAction && removableClass)}>
        <RenderElements control={arrayControl}>
          {(_, x) =>
            renderElement(x, (children) =>
              removeAction || editAction ? (
                <>
                  <Div className={clsx(childClass, removableChildClass)}>
                    {children}
                  </Div>
                  <Div className={removeActionClass}>
                    {editAction && renderAction(editAction(x))}
                    {removeAction && renderAction(removeAction(x))}
                  </Div>
                </>
              ) : (
                <Div className={childClass}>{children}</Div>
              ),
            )
          }
        </RenderElements>
      </Div>
      {addAction && (
        <Div className={addActionClass}>{renderAction(addAction)}</Div>
      )}
    </Div>
  );
}
