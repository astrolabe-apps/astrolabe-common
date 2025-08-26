import {
  ControlLayoutProps,
  FlexRenderer,
  FormRenderer,
  GroupRendererProps,
  GroupRendererRegistration,
  GroupRenderType,
  isAccordionRenderer,
  isDialogRenderer,
  isFlexRenderer,
  isGridRenderer,
  isInlineRenderer,
  isSelectChildRenderer,
  isTabsRenderer,
  isWizardRenderer,
  rendererClass,
  SelectChildRenderer,
  useExpression,
} from "@react-typed-forms/schemas";
import clsx from "clsx";
import React, { CSSProperties, ReactElement } from "react";
import { createTabsRenderer, DefaultTabsRenderOptions } from "./TabsRenderer";
import { createGridRenderer, DefaultGridRenderOptions } from "./GridRenderer";
import {
  createWizardRenderer,
  DefaultWizardRenderOptions,
} from "./DefaultWizardRenderer";
import {
  createDialogRenderer,
  DefaultDialogRenderOptions,
} from "./DefaultDialogRenderer";
import { createAccordionGroupRenderer } from "./DefaultAccordion";
import {
  DefaultAccordionRendererOptions,
  DefaultAdornmentRendererOptions,
} from "../createDefaultRenderers";

interface StyleProps {
  className?: string;
  style?: CSSProperties;
}

export interface DefaultGroupRendererOptions {
  className?: string;
  standardClassName?: string;
  grid?: DefaultGridRenderOptions;
  flexClassName?: string;
  defaultFlexGap?: string;
  inlineClass?: string;
  tabs?: DefaultTabsRenderOptions;
  wizard?: DefaultWizardRenderOptions;
  dialog?: DefaultDialogRenderOptions;
  accordion?: DefaultAccordionRendererOptions;
}

export function createDefaultGroupRenderer(
  options?: DefaultGroupRendererOptions,
  adornmentOptions?: DefaultAdornmentRendererOptions,
): GroupRendererRegistration {
  const gridRenderer = createGridRenderer(options?.grid);
  const tabsRenderer = createTabsRenderer(options?.tabs);
  const wizardRenderer = createWizardRenderer(options?.wizard);
  const dialogRenderer = createDialogRenderer(options?.dialog);
  const accordionRenderer = createAccordionGroupRenderer(
    options?.accordion ?? adornmentOptions?.accordion,
  );
  const {
    className,
    standardClassName,
    flexClassName,
    inlineClass,
    defaultFlexGap,
  } = options ?? {};

  function flexStyles(options: FlexRenderer): StyleProps {
    return {
      className: flexClassName,
      style: {
        display: "flex",
        gap: options.gap ? options.gap : defaultFlexGap,
        flexDirection: options.direction
          ? (options.direction as any)
          : undefined,
      },
    };
  }

  function render(props: GroupRendererProps, renderer: FormRenderer) {
    const { renderChild, renderOptions, formNode } = props;
    if (isTabsRenderer(renderOptions))
      return tabsRenderer.render(props, renderer);
    if (isGridRenderer(renderOptions))
      return gridRenderer.render(props, renderer);
    if (isWizardRenderer(renderOptions))
      return wizardRenderer.render(props, renderer);
    if (isDialogRenderer(renderOptions))
      return dialogRenderer.render(props, renderer);
    if (isAccordionRenderer(renderOptions))
      return accordionRenderer.render(props, renderer);
    if (isSelectChildRenderer(renderOptions) && !props.designMode) {
      return (
        <SelectChildGroupRenderer
          props={{ ...props, renderOptions }}
          renderer={renderer}
        />
      );
    }

    const { style, className: gcn } = isFlexRenderer(renderOptions)
      ? flexStyles(renderOptions)
      : isInlineRenderer(renderOptions)
        ? ({ className: inlineClass } as StyleProps)
        : ({ className: standardClassName } as StyleProps);
    const { Div } = renderer.html;
    const inline = renderOptions.type == GroupRenderType.Inline;
    const children = formNode.children.map((c, i) =>
      renderChild(c, {
        inline,
      }),
    );
    return (
      <Div
        className={rendererClass(props.className, clsx(className, gcn))}
        textClass={props.textClass}
        style={style}
        inline={inline}
      >
        {children}
      </Div>
    );
  }

  function renderLayout(
    props: GroupRendererProps,
    renderer: FormRenderer,
  ): ReactElement | ((layout: ControlLayoutProps) => ControlLayoutProps) {
    if (props.renderOptions.type === GroupRenderType.Contents) {
      const { formNode, renderChild } = props;
      const children = formNode.children.map((c) => renderChild(c));
      return (layout) => {
        return {
          ...layout,
          inline: true,
          children,
        };
      };
    }
    return render(props, renderer);
  }

  return { type: "group", render: renderLayout };
}

type SelectChildProps = Pick<
  GroupRendererProps,
  "runExpression" | "dataContext" | "formNode" | "renderChild"
> & {
  renderOptions: SelectChildRenderer;
};
function SelectChildGroupRenderer({
  props,
  renderer,
}: {
  props: SelectChildProps;
  renderer: FormRenderer;
}) {
  const { Div } = renderer.html;
  const { runExpression, renderOptions } = props;
  const ctrl = useExpression(
    undefined,
    runExpression,
    renderOptions?.childIndexExpression,
    (x) => (typeof x == "string" ? parseInt(x) : x),
  );
  const childIndex = ctrl?.value;
  const childCount = props.formNode.getChildCount();
  return (
    <Div>
      {typeof childIndex === "number" &&
        childIndex < childCount &&
        childIndex >= 0 &&
        props.renderChild(props.formNode.getChild(childIndex)!)}
    </Div>
  );
}
