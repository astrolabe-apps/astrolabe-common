import clsx from "clsx";
import React, { Fragment, ReactNode } from "react";
import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayActionOptions,
  ArrayRendererProps,
  ArrayRendererRegistration,
  ArrayRenderOptions,
  createArrayActions,
  createDataRenderer,
  DataRendererProps,
  DataRendererRegistration,
  DataRenderType,
  FormRenderer,
  getLengthRestrictions,
  HtmlComponents,
  isArrayRenderer,
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

  const arrayProps = {
    ...createArrayActions(control.as(), () => formNode.getChildCount(), field, {
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
    renderElement: (i, wrap) => {
      const n = formNode.getChild(i);
      return !n || !n.visible ? undefined : wrap(n.childKey, renderChild(n));
    },
    className: className ? className : undefined,
    style,
    ...getLengthRestrictions(definition),
  } satisfies ArrayRendererProps;

  return renderers.renderArray(arrayProps);
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
          renderElement(x, (key, children) =>
            removeAction || editAction ? (
              <Fragment key={key}>
                <Div className={clsx(childClass, removableChildClass)}>
                  {children}
                </Div>
                <Div className={removeActionClass}>
                  {editAction && renderAction(editAction(x))}
                  {removeAction && renderAction(removeAction(x))}
                </Div>
              </Fragment>
            ) : (
              <Div key={key} className={childClass}>
                {children}
              </Div>
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
