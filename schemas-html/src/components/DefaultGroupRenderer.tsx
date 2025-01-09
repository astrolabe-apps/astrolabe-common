import {
  ControlLayoutProps,
  FlexRenderer,
  FormRenderer,
  GridRenderer,
  GroupRendererProps,
  GroupRendererRegistration,
  isFlexRenderer,
  isGridRenderer,
  isSelectChildRenderer,
  isTabsRenderer,
  rendererClass,
  SelectChildRenderer,
} from "@react-typed-forms/schemas";
import clsx from "clsx";
import React, { CSSProperties, useCallback } from "react";
import { useTrackedComponent } from "@react-typed-forms/core";
import { createTabsRenderer, TabsRendererOptions } from "./TabsRenderer";

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
  tabs?: TabsRendererOptions;
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

  function render(props: GroupRendererProps, renderers: FormRenderer) {
    const { renderChild, renderOptions, childDefinitions } = props;
    if (isTabsRenderer(renderOptions))
      return tabsRenderer.render(props, renderers);
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

    return (
      <div
        className={rendererClass(props.className, clsx(className, gcn))}
        style={style}
      >
        {childDefinitions?.map((c, i) => renderChild(i, c))}
      </div>
    );
  }

  return { type: "group", render };
}

type SelectChildProps = Pick<
  GroupRendererProps,
  "useEvalExpression" | "dataContext" | "childDefinitions" | "renderChild"
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
      return (
        <div>
          {typeof childIndex === "number" &&
            childIndex < p.childDefinitions.length &&
            childIndex >= 0 &&
            p.renderChild(childIndex, p.childDefinitions[childIndex])}
        </div>
      );
    },
    [dynHook.deps],
  );
  return <Render {...props} />;
}
