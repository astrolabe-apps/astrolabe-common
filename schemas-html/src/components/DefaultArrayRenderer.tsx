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
  } = dataProps;

  const { addText, noAdd, noRemove, noReorder, removeText, editExternal } =
    mergeObjects(
      isArrayRenderer(renderOptions)
        ? renderOptions
        : ({} as ArrayRenderOptions),
      defaultActions as ArrayRenderOptions,
    );

  const childNodes = formNode.getChildNodes();

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
    renderElement: (i, wrap) =>
      childNodes[i].hidden ? undefined : wrap(renderChild(i, childNodes[i])),
    className: className ? className : undefined,
    style,
    ...getLengthRestrictions(definition),
  } satisfies ArrayRendererProps;

  return renderers.renderArray(arrayProps);

  function renderChildElement(i: number, elementNode: SchemaDataNode) {
    // TODO
    return <div>TODO - array</div>;
    // return renderChild(elementNode.control.uniqueId, childNode, {
    //   parentDataNode: elementNode,
    // });
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
    getElementCount,
    renderAction,
    style,
    editAction,
    html: { Div },
  } = props;
  const { addAction, removeAction } = applyArrayLengthRestrictions(props);

  return (
    <Div style={style}>
      <Div className={clsx(className, removeAction && removableClass)}>
        {Array.from({ length: getElementCount() }, (_, x) =>
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
          ),
        )}
      </Div>
      {addAction && (
        <Div className={addActionClass}>{renderAction(addAction)}</Div>
      )}
    </Div>
  );
}
