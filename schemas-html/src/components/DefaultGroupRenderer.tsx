import {
  FlexRenderer,
  FormRenderer,
  GroupRendererProps,
  GroupRendererRegistration,
  GroupRenderType,
  isDialogRenderer,
  isFlexRenderer,
  isGridRenderer,
  isInlineRenderer,
  isSelectChildRenderer,
  isTabsRenderer,
  isWizardRenderer,
  rendererClass,
  SelectChildRenderer,
} from "@react-typed-forms/schemas";
import clsx from "clsx";
import React, { CSSProperties } from "react";
import { useTrackedComponent } from "@react-typed-forms/core";
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
}

export function createDefaultGroupRenderer(
  options?: DefaultGroupRendererOptions,
): GroupRendererRegistration {
  const gridRenderer = createGridRenderer(options?.grid);
  const tabsRenderer = createTabsRenderer(options?.tabs);
  const wizardRenderer = createWizardRenderer(options?.wizard);
  const dialogRenderer = createDialogRenderer(options?.wizard);
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
    if (isSelectChildRenderer(renderOptions) && !props.designMode) {
      return (
        <SelectChildGroupRenderer {...props} renderOptions={renderOptions} />
      );
    }

    const { style, className: gcn } = isFlexRenderer(renderOptions)
      ? flexStyles(renderOptions)
      : isInlineRenderer(renderOptions)
        ? ({ className: inlineClass } as StyleProps)
        : ({ className: standardClassName } as StyleProps);
    const { Div } = renderer.html;
    const inline = renderOptions.type == GroupRenderType.Inline;
    const children = formNode.getChildNodes().map((c, i) =>
      renderChild(i, c, {
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

  return { type: "group", render };
}

type SelectChildProps = Pick<
  GroupRendererProps,
  "useEvalExpression" | "dataContext" | "formNode" | "renderChild"
> & {
  renderOptions: SelectChildRenderer;
};
function SelectChildGroupRenderer(props: SelectChildProps) {
  const { useEvalExpression, renderOptions } = props;
  const dynHook = useEvalExpression(renderOptions?.childIndexExpression, (x) =>
    x == "string" ? parseInt(x) : x,
  );
  const Render = useTrackedComponent(
    (p: SelectChildProps) => {
      const ctrl = dynHook.runHook(p.dataContext, dynHook.state);
      const childIndex = ctrl?.value;
      const childDefinitions = p.formNode.getChildNodes();
      return (
        <div>
          {typeof childIndex === "number" &&
            childIndex < childDefinitions.length &&
            childIndex >= 0 &&
            p.renderChild(childIndex, childDefinitions[childIndex])}
        </div>
      );
    },
    [dynHook.deps],
  );
  return <Render {...props} />;
}
