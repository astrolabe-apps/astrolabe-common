import {
  ArrayRendererRegistration,
  createDataRenderer,
  DataRendererRegistration,
} from "../renderers";
import {
  ActionRendererProps,
  applyArrayLengthRestrictions,
  ArrayRendererProps,
} from "../controlRender";
import clsx from "clsx";
import React, { Fragment, ReactNode } from "react";
import {
  addElement,
  removeElement,
  RenderElements,
} from "@react-typed-forms/core";
import { elementValueForField } from "../util";
import {
  ArrayRenderOptions,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  isArrayRenderer,
  LengthValidator,
  ValidatorType,
} from "../types";
import { cc } from "../internal";

export function createDefaultArrayDataRenderer(): DataRendererRegistration {
  return createDataRenderer(
    (
      {
        definition,
        control,
        required,
        field,
        renderChild,
        parentContext,
        className,
        style,
        renderOptions,
      },
      renderers,
    ) => {
      const lengthVal = definition.validators?.find(
        (x) => x.type === ValidatorType.Length,
      ) as LengthValidator | undefined;
      const { addText, noAdd, noRemove, noReorder, removeText } =
        isArrayRenderer(renderOptions)
          ? renderOptions
          : ({} as ArrayRenderOptions);
      const childOptions = isArrayRenderer(renderOptions)
        ? renderOptions.childOptions
        : undefined;
      const noun = field.displayName ?? field.field;
      const arrayProps = {
        arrayControl: control,
        required,
        addAction: !noAdd
          ? {
              actionId: "add",
              actionText: addText ? addText : "Add " + noun,
              onClick: () => addElement(control, elementValueForField(field)),
            }
          : undefined,
        removeAction: !noRemove
          ? (i: number) => ({
              actionId: "",
              actionText: removeText ? removeText : "Remove",
              onClick: () => removeElement(control, i),
            })
          : undefined,
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
            { elementIndex: i, dataContext: parentContext },
          ),
        className: cc(className),
        style,
        min: lengthVal?.min,
        max: lengthVal?.max,
      } satisfies ArrayRendererProps;
      return renderers.renderArray(arrayProps);
    },
  );
}

export interface DefaultArrayRendererOptions {
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
