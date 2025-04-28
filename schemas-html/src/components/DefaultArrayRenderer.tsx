import clsx from "clsx";
import React, { Fragment, ReactNode } from "react";
import { RenderElements } from "@react-typed-forms/core";
import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayActionOptions,
  ArrayRendererProps,
  ArrayRendererRegistration,
  ArrayRenderOptions,
  ControlDataContext,
  ControlDefinitionType,
  createArrayActions,
  createDataRenderer,
  DataRendererProps,
  DataRendererRegistration,
  DataRenderType,
  FormNode,
  FormRenderer,
  getLengthRestrictions,
  GroupRenderType,
  HtmlComponents,
  isArrayRenderer,
  isCompoundField,
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

/**
 * @trackControls
 */
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
    dataContext,
    formNode,
    getChildState,
  } = dataProps;

  const { addText, noAdd, noRemove, noReorder, removeText, editExternal } =
    mergeObjects(
      isArrayRenderer(renderOptions)
        ? renderOptions
        : ({} as ArrayRenderOptions),
      defaultActions as ArrayRenderOptions,
    );

  const childDefs = formNode.getResolvedChildren();
  const renderAsElement = !isCompoundField(field);
  const defaultChildDef = {
    type: ControlDefinitionType.Data,
    field: ".",
    renderOptions: { type: DataRenderType.Standard },
    hideTitle: true,
  };
  const childDef = {
    type: ControlDefinitionType.Group,
    groupOptions: { type: GroupRenderType.Standard, hideTitle: true },
    children:
      renderAsElement && childDefs.length == 0 ? [defaultChildDef] : childDefs,
  };
  const childNode: FormNode = formNode.createChildNode("child", childDef);
  const childNodes = childNode.getChildNodes();

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
      <RenderEntry
        index={i}
        renderChildElement={renderChildElement}
        dataContext={dataContext}
        wrap={wrap}
        isChildHidden={(dataNode) =>
          childNodes.every((x) => getChildState(x, dataNode).hidden)
        }
      />
    ),
    className: className ? className : undefined,
    style,
    ...getLengthRestrictions(definition),
  } satisfies ArrayRendererProps;

  return renderers.renderArray(arrayProps);

  function renderChildElement(i: number, elementNode: SchemaDataNode) {
    return renderChild(elementNode.control.uniqueId, childNode, {
      parentDataNode: elementNode,
    });
  }
}

/**
 * @trackControls
 */
function RenderEntry({
  index: i,
  renderChildElement,
  wrap,
  isChildHidden,
  dataContext,
}: {
  index: number;
  renderChildElement: (i: number, element: SchemaDataNode) => ReactNode;
  dataContext: ControlDataContext;
  wrap: (n: ReactNode) => ReactNode;
  isChildHidden: (dataNode: SchemaDataNode) => boolean;
}) {
  const elementNode = dataContext.dataNode!.getChildElement(i);
  if (isChildHidden(elementNode)) return undefined;
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
