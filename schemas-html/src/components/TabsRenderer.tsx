import {
  createGroupRenderer,
  FormNode,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
  TabsRenderOptions,
  useDynamicHooks,
} from "@react-typed-forms/schemas";
import React, { Fragment } from "react";
import { useControl, useTrackedComponent } from "@react-typed-forms/core";
import clsx from "clsx";
import { EvalExpressionHook } from "@react-typed-forms/schemas";

export interface DefaultTabsRenderOptions {
  className?: string;
  tabListClass?: string;
  tabClass?: string;
  labelClass?: string;
  activeClass?: string;
  inactiveClass?: string;
  contentClass?: string;
}

export function createTabsRenderer(options: DefaultTabsRenderOptions = {}) {
  return createGroupRenderer(
    (p, renderer) => {
      const visibleChildren = Object.fromEntries(
        p.formNode
          .getChildNodes()
          .map((cd, i) => [i.toString(), p.useChildVisibility(cd.definition)]),
      );
      return (
        <TabsGroupRenderer
          {...p}
          visibleChildren={visibleChildren}
          tabOptions={p.renderOptions as TabsRenderOptions}
          options={options}
        />
      );
    },
    {
      renderType: GroupRenderType.Tabs,
    },
  );
}

interface TabsGroupRendererProps extends GroupRendererProps {
  options: DefaultTabsRenderOptions;
  visibleChildren: Record<string, EvalExpressionHook<boolean>>;
  tabOptions: TabsRenderOptions;
}

export function TabsGroupRenderer(props: TabsGroupRendererProps) {
  const visibilityHooks = useDynamicHooks(props.visibleChildren);

  const Render = useTrackedComponent(mainRender, [visibilityHooks]);

  return <Render {...props} />;

  function mainRender({
    formNode,
    className,
    options,
    renderChild,
    designMode,
    tabOptions,
    dataContext,
  }: TabsGroupRendererProps) {
    const visibilities = visibilityHooks(dataContext);
    const tabIndex = useControl(0);
    const {
      tabClass,
      labelClass,
      tabListClass,
      inactiveClass,
      activeClass,
      contentClass,
    } = options;
    const currentTab = tabIndex.value;
    return designMode ? (
      <>{formNode.getChildNodes().map((x, i) => renderTabs([x], i))}</>
    ) : (
      renderTabs(
        formNode.getChildNodes().filter((x, i) => !!visibilities[i].value),
        0,
      )
    );

    function renderTabs(tabs: FormNode[], key: number) {
      return (
        <div key={key} className={rendererClass(className, options.className)}>
          <ul className={rendererClass(null, tabListClass)}>
            {tabs.map((x, i) => (
              <li
                key={i}
                className={rendererClass(null, tabClass)}
                onClick={() => (tabIndex.value = i)}
              >
                <span
                  className={rendererClass(
                    null,
                    clsx(
                      labelClass,
                      i == currentTab ? activeClass : inactiveClass,
                    ),
                  )}
                >
                  {x.definition.title ? x.definition.title : "<untitled>"}
                </span>
              </li>
            ))}
          </ul>
          <div className={rendererClass(tabOptions.contentClass, contentClass)}>
            {renderChild(currentTab, tabs[currentTab])}
          </div>
        </div>
      );
    }
  }
}
