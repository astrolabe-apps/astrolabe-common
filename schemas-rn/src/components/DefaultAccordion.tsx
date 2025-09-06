import React, {
  CSSProperties,
  Fragment,
  ReactElement,
  ReactNode,
  useId,
} from "react";
import { Control, useControl } from "@react-typed-forms/core";
import {
  AccordionRenderer,
  ControlDataContext,
  createGroupRenderer,
  FormRenderer,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
} from "@react-typed-forms/schemas";
import { DefaultAccordionRendererOptions } from "../rendererOptions";

export function DefaultAccordion({
  children,
  contentStyle,
  className,
  contentClassName,
  designMode,
  renderers,
  dataContext,
  title,
  options,
  defaultExpanded,
  isGroup,
  titleTextClass,
}: {
  children: ReactElement;
  title: ReactNode;
  isGroup: boolean;
  className?: string;
  titleTextClass?: string;
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
    togglerClass,
    renderTitle = (t: ReactNode) => t,
    renderToggler,
    useCss,
  } = options ?? {};
  const panelId = useId();
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
  const accordionClassName = rendererClass(className, options?.className);
  const accordionTitleTextClass = rendererClass(
    titleTextClass,
    options?.titleTextClass,
  );
  const accordionTitle = isGroup ? (
    title
  ) : (
    <Label textClass={accordionTitleTextClass}>{title}</Label>
  );

  const toggler = renderToggler ? (
    renderToggler(open, renderTitle(title, open))
  ) : (
    <Button
      className={accordionClassName}
      notWrapInText
      onClick={() => open.setValue((x) => !x)}
      aria-expanded={isOpen}
      aria-controls={panelId}
    >
      {accordionTitle}
      {currentIcon && (
        <I
          className={togglerClass}
          iconLibrary={currentIcon.library}
          iconName={currentIcon.name}
        />
      )}
    </Button>
  );

  // The content class name not currently used since if the content is wrapped in a group, the group will handle the styling
  return (
    <>
      {toggler}
      {(useCss || isOpen || designMode) && (
        <Div
          id={panelId}
          role="region"
          style={fullContentStyle}
          className={contentClassName}
        >
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
      isGroup={true}
      options={options}
      children={<>{contentChildren.map((x) => groupProps.renderChild(x))}</>}
      title={<>{titleChildren.map((x) => groupProps.renderChild(x))}</>}
      renderers={renderer}
      className={groupProps.className}
      dataContext={groupProps.dataContext}
      designMode={groupProps.designMode}
      defaultExpanded={renderOptions.defaultExpanded}
      contentStyle={groupProps.style}
    />
  );
}