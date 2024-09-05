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
import React, { CSSProperties, Fragment, ReactNode } from "react";
import {
  addElement,
  Control,
  removeElement,
  RenderElements,
} from "@react-typed-forms/core";
import { applyLengthRestrictions, elementValueForField } from "../util";
import {
  ControlDefinitionType,
  DataControlDefinition,
  SchemaField,
} from "../types";
import { cc } from "../internal";

export function createDefaultArrayDataRenderer(): DataRendererRegistration {
  createDataRenderer((props, renderers) => {
    renderers.renderArray();
  });
}

// toArrayProps:
//     field.collection && props.elementIndex == null
//         ? () =>
//             defaultArrayProps(
//                 control,
//                 field,
//                 required,
//                 style,
//                 className,
//                 (elementIndex) =>
//                     props.renderChild(
//                         control.elements?.[elementIndex].uniqueId ?? elementIndex,
//                         {
//                           type: ControlDefinitionType.Data,
//                           field: definition.field,
//                           children: definition.children,
//                           hideTitle: true,
//                         } as DataControlDefinition,
//                         { elementIndex, dataContext: props.parentContext },
//                     ),
//                 lengthVal?.min,
//                 lengthVal?.max,
//             )
//         : undefined,

export function defaultArrayProps(
  arrayControl: Control<any[] | undefined | null>,
  field: SchemaField,
  required: boolean,
  style: CSSProperties | undefined,
  className: string | undefined,
  renderElement: (elemIndex: number) => ReactNode,
  min: number | undefined | null,
  max: number | undefined | null,
): ArrayRendererProps {
  const noun = field.displayName ?? field.field;
  return {
    arrayControl,
    required,
    addAction: {
      actionId: "add",
      actionText: "Add " + noun,
      onClick: () => addElement(arrayControl, elementValueForField(field)),
    },
    removeAction: (i: number) => ({
      actionId: "",
      actionText: "Remove",
      onClick: () => removeElement(arrayControl, i),
    }),
    renderElement: (i) => renderElement(i),
    className: cc(className),
    style,
    min,
    max,
  };
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
