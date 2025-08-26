import React, { CSSProperties, Fragment, ReactElement, ReactNode } from "react";
import { Control, useControl } from "@react-typed-forms/core";
import { DefaultAccordionRendererOptions } from "../createDefaultRenderers";
import {
  AccordionRenderer,
  ControlDataContext,
  createGroupRenderer,
  FormRenderer,
  GroupRendererProps,
  GroupRenderType,
} from "@react-typed-forms/schemas";

export function DefaultAccordion({
  children,
  contentStyle,
  contentClassName,
  designMode,
  renderers,
  dataContext,
  title,
  options,
  defaultExpanded,
}: {
  children: ReactElement;
  title: ReactNode;
  defaultExpanded?: boolean | null;
  contentStyle?: CSSProperties;
  contentClassName?: string;
  designMode?: boolean;
  renderers: FormRenderer;
  dataContext: ControlDataContext;
  options?: DefaultAccordionRendererOptions;
}) {
  const {
    iconOpen,
    iconClosed,
    className,
    togglerClass,
    renderTitle = (t: ReactNode) => t,
    renderToggler,
    titleClass,
    useCss,
  } = options ?? {};

  const { Button, I, Div, Label } = renderers.html;
  const dataControl = (dataContext.dataNode ?? dataContext.parentNode).control;
  const open = useControl(!!defaultExpanded);
  if (dataControl && !dataControl.meta.accordionState) {
    dataControl.meta.accordionState = open;
  }
  const isOpen = open.value;
  const fullContentStyle =
    isOpen || designMode ? contentStyle : { ...contentStyle, display: "none" };
  const currentIcon = isOpen ? iconOpen : iconClosed;
  const toggler = renderToggler ? (
    renderToggler(open, renderTitle(title, open))
  ) : (
    <Button
      className={className}
      notWrapInText
      onClick={() => open.setValue((x) => !x)}
    >
      <Label textClass={titleClass}>{title}</Label>
      {currentIcon && (
        <I
          className={togglerClass}
          iconLibrary={currentIcon.library}
          iconName={currentIcon.name}
        />
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

export function createAccordionGroupRenderer(
  options?: DefaultAccordionRendererOptions,
) {
  return createGroupRenderer(
    (p, renderer) => (
      <AccordionGroupRenderer
        groupProps={p}
        renderer={renderer}
        options={options}
      />
    ),
    {
      renderType: GroupRenderType.Accordion,
    },
  );
}

function AccordionGroupRenderer({
  groupProps,
  renderer,
  options,
}: {
  groupProps: GroupRendererProps;
  renderer: FormRenderer;
  options?: DefaultAccordionRendererOptions;
}) {
  const allChildren = groupProps.formNode.children;
  const titleChildren = allChildren.filter(
    (x) => x.definition.placement === "title",
  );
  const contentChildren = allChildren.filter(
    (x) => x.definition.placement !== "title",
  );
  const renderOptions = groupProps.renderOptions as AccordionRenderer;
  return (
    <DefaultAccordion
      options={options}
      children={<>{contentChildren.map((x) => groupProps.renderChild(x))}</>}
      title={<>{titleChildren.map((x) => groupProps.renderChild(x))}</>}
      renderers={renderer}
      dataContext={groupProps.dataContext}
      designMode={groupProps.designMode}
      defaultExpanded={renderOptions.defaultExpanded}
      contentClassName={groupProps.className}
      contentStyle={groupProps.style}
    />
  );
}
