// noinspection ES6UnusedImports
import React, {
  CSSProperties,
  Fragment,
  ReactElement,
  createElement as h,
} from "react";
import { Control, useControl } from "@react-typed-forms/core";
import clsx from "clsx";
import { DefaultAccordionRendererOptions } from "../createDefaultRenderers";
import {
  AccordionAdornment,
  ControlDataContext,
  FormRenderer,
} from "@react-typed-forms/schemas";

export function DefaultAccordion({
  children,
  accordion,
  contentStyle,
  contentClassName,
  designMode,
  iconOpenName,
  iconOpenClass,
  iconClosedName,
  iconClosedClass,
  className,
  renderTitle = (t) => t,
  renderToggler,
  renderers,
  titleClass,
  useCss,
  dataContext,
}: {
  children: ReactElement;
  accordion: Partial<AccordionAdornment>;
  contentStyle?: CSSProperties;
  contentClassName?: string;
  designMode?: boolean;
  renderers: FormRenderer;
  dataContext: ControlDataContext;
} & DefaultAccordionRendererOptions) {
  const h = renderers.h;
  const dataControl = (dataContext.dataNode ?? dataContext.parentNode).control;
  const open = useControl(!!accordion.defaultExpanded);
  if (dataControl && !dataControl.meta.accordionState) {
    dataControl.meta.accordionState = open;
  }
  const isOpen = open.value;
  const fullContentStyle =
    isOpen || designMode ? contentStyle : { ...contentStyle, display: "none" };
  const title = renderers.renderLabelText(renderTitle(accordion.title, open));
  const toggler = renderToggler ? (
    renderToggler(open, title)
  ) : (
    <button className={className} onClick={() => open.setValue((x) => !x)}>
      <label className={titleClass}>{title}</label>
      <i
        title={isOpen ? iconOpenName : iconClosedName}
        className={clsx(isOpen ? iconOpenClass : iconClosedClass)}
      />
    </button>
  );

  return (
    <>
      {toggler}
      {(useCss || isOpen || designMode) && (
        <div style={fullContentStyle} className={contentClassName}>
          {children}
        </div>
      )}
    </>
  );
}

export function getAccordionState(
  c: Control<unknown>,
): Control<boolean> | undefined {
  return c.meta.accordionState;
}
