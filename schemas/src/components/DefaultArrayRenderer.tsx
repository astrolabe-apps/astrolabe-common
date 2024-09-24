import {
  ArrayRendererRegistration,
  createDataRenderer,
  DataRendererRegistration,
} from "../renderers";
import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayRendererProps,
  createArrayActions,
  getLengthRestrictions,
} from "../controlRender";
import clsx from "clsx";
import React, { Fragment, ReactNode } from "react";
import { RenderElements } from "@react-typed-forms/core";
import {
  ArrayActionOptions,
  ArrayRenderOptions,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  isArrayRenderer,
} from "../types";
import { cc } from "../internal";
import { mergeObjects } from "../util";

export function createDefaultArrayDataRenderer(
  defaultActions?: ArrayActionOptions,
): DataRendererRegistration {
  return createDataRenderer(
    (
      {
        definition,
        control,
        required,
        field,
        renderChild,
        className,
        style,
        renderOptions,
      },
      renderers,
    ) => {
      const { addText, noAdd, noRemove, noReorder, removeText } = mergeObjects(
        isArrayRenderer(renderOptions)
          ? renderOptions
          : ({} as ArrayRenderOptions),
        defaultActions as ArrayRenderOptions,
      );
      const childOptions = isArrayRenderer(renderOptions)
        ? renderOptions.childOptions
        : undefined;

      const arrayProps = {
        ...createArrayActions(control, field, {
          addText,
          removeText,
          noAdd,
          noRemove,
        }),
        required,
        renderElement: (i) =>
          renderChild(
            control.elements?.[i].uniqueId ?? i,
            {
              type: ControlDefinitionType.Data,
              field: definition.field,
              children: definition.children,
              renderOptions: childOptions ?? { type: DataRenderType.Standard },
              hideTitle: true,
            } as DataControlDefinition,
            { elementIndex: i },
          ),
        className: cc(className),
        style,
        ...getLengthRestrictions(definition),
      } satisfies ArrayRendererProps;
      return renderers.renderArray(arrayProps);
    },
    { renderType: DataRenderType.Array, collection: true },
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
            removeAction ? (
              <>
                <div className={clsx(childClass, removableChildClass)}>
                  {renderElement(x)}
                </div>
                <div className={removeActionClass}>
                  {renderAction(removeAction(x))}
                </div>
              </>
            ) : (
              <div className={childClass}>{renderElement(x)}</div>
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
