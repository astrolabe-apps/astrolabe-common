import React, { CSSProperties, Fragment, ReactElement } from "react";
import { useControl } from "@react-typed-forms/core";
import clsx from "clsx";
import { DefaultAccordionRendererOptions } from "../createDefaultRenderers";
import { AccordionAdornment, FormRenderer } from "@react-typed-forms/schemas";

export function DefaultAccordion({
  children,
  accordion,
  contentStyle,
  contentClassName,
  designMode,
  iconOpenClass,
  iconClosedClass,
  className,
  renderTitle = (t) => t,
  renderToggler,
  renderers,
  titleClass,
}: {
  children: ReactElement;
  accordion: Partial<AccordionAdornment>;
  contentStyle?: CSSProperties;
  contentClassName?: string;
  designMode?: boolean;
  renderers: FormRenderer;
} & DefaultAccordionRendererOptions) {
  const open = useControl(!!accordion.defaultExpanded);
  const isOpen = open.value;
  const fullContentStyle =
    isOpen || designMode ? contentStyle : { ...contentStyle, display: "none" };
  const title = renderers.renderLabelText(renderTitle(accordion.title, open));
  const toggler = renderToggler ? (
    renderToggler(open, title)
  ) : (
    <button className={className} onClick={() => open.setValue((x) => !x)}>
      <label className={titleClass}>{title}</label>
      <i className={clsx(isOpen ? iconOpenClass : iconClosedClass)} />
    </button>
  );

  return (
    <>
      {toggler}
      <div style={fullContentStyle} className={contentClassName}>
        {children}
      </div>
    </>
  );
}
