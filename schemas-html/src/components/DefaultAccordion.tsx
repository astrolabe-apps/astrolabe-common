import React, { CSSProperties, ReactElement, Fragment } from "react";
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
  iconOpen,
  iconClosed,
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
  const { Button, I, Div, Label } = renderers.html;
  const dataControl = (dataContext.dataNode ?? dataContext.parentNode).control;
  const open = useControl(!!accordion.defaultExpanded);
  if (dataControl && !dataControl.meta.accordionState) {
    dataControl.meta.accordionState = open;
  }
  const isOpen = open.value;
  const fullContentStyle =
    isOpen || designMode ? contentStyle : { ...contentStyle, display: "none" };
  const title = renderers.renderLabelText(renderTitle(accordion.title, open));
  const currentIcon = isOpen ? iconOpen : iconClosed;
  const toggler = renderToggler ? (
    renderToggler(open, title)
  ) : (
    <Button className={className} onClick={() => open.setValue((x) => !x)}>
      <Label className={titleClass}>{title}</Label>
      {currentIcon && (
        <I iconLibrary={currentIcon.library} iconName={currentIcon.name} />
      )}
    </Button>
  );

  return (
    <>
      {toggler}
      {(useCss || isOpen || designMode) && (
        <Div style={fullContentStyle} className={contentClassName}>
          {children}
        </Div>
      )}
    </>
  );
}

export function getAccordionState(
  c: Control<unknown>,
): Control<boolean> | undefined {
  return c.meta.accordionState;
}
