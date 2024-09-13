import { DefaultArrayRendererOptions } from "@react-typed-forms/schemas";
import clsx from "clsx";
import { RenderElements } from "@react-typed-forms/core";
import React from "react";
import { ArrayRendererProps, DefaultFormActions } from "./index";

export function createDefaultArrayRenderer(
  options?: DefaultArrayRendererOptions,
) {
  return (props: ArrayRendererProps) => (
    <DefaultArrayRenderer arrayProps={props} defaults={options ?? {}} />
  );
}

export function createDefaultArrayActions(
  options: DefaultArrayRendererOptions = {},
): DefaultFormActions {
  return {
    add: {
      actionId: "add",
      actionText: options.addText ?? "",
      className: options.addActionClass,
    },
    remove: {
      actionId: "remove",
      actionText: options.removeText ?? "",
      className: options.removeActionClass,
    },
  };
}

export function DefaultArrayRenderer({
  arrayProps,
  defaults,
}: {
  arrayProps: ArrayRendererProps;
  defaults: DefaultArrayRendererOptions;
}) {
  const {
    className,
    removableClass,
    childClass,
    removableChildClass,
    removeActionClass,
    addActionClass,
  } = defaults;
  const {
    renderElement,
    arrayControl,
    style,
    addAction,
    removeAction,
    renderAction,
  } = arrayProps;
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
