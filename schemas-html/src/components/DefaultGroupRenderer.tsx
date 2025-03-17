import {
  FlexRenderer,
  FormRenderer,
  GridRenderer,
  GroupRendererProps,
  GroupRendererRegistration,
  GroupRenderType,
  isFlexRenderer,
  isGridRenderer,
  isSelectChildRenderer,
  isTabsRenderer,
  rendererClass,
  SelectChildRenderer,
} from "@react-typed-forms/schemas";
import clsx from "clsx";
import React, { CSSProperties } from "react";
import { useTrackedComponent } from "@react-typed-forms/core";
import { createTabsRenderer, DefaultTabsRenderOptions } from "./TabsRenderer";

interface StyleProps {
  className?: string;
  style?: CSSProperties;
}

export interface DefaultGroupRendererOptions {
  className?: string;
  standardClassName?: string;
  gridStyles?: (columns: GridRenderer) => StyleProps;
  gridClassName?: string;
  defaultGridColumns?: number;
  flexClassName?: string;
  defaultFlexGap?: string;
  tabs?: DefaultTabsRenderOptions;
}

export function createDefaultGroupRenderer(
  options?: DefaultGroupRendererOptions,
): GroupRendererRegistration {
  const tabsRenderer = createTabsRenderer(options?.tabs);
  const {
    className,
    gridStyles = defaultGridStyles,
    defaultGridColumns = 2,
    gridClassName,
    standardClassName,
    flexClassName,
    defaultFlexGap,
  } = options ?? {};

  function defaultGridStyles({
    columns = defaultGridColumns,
  }: GridRenderer): StyleProps {
    return {
      className: gridClassName,
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      },
    };
  }

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
    if (isSelectChildRenderer(renderOptions) && !props.designMode) {
      return (
        <SelectChildGroupRenderer {...props} renderOptions={renderOptions} />
      );
    }

    const { style, className: gcn } = isGridRenderer(renderOptions)
      ? gridStyles(renderOptions)
      : isFlexRenderer(renderOptions)
        ? flexStyles(renderOptions)
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
