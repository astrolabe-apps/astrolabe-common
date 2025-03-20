import {
  createGroupRenderer,
  FormNode,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
  TabsRenderOptions,
} from "@react-typed-forms/schemas";
import React, { Fragment } from "react";
import { useControl } from "@react-typed-forms/core";
import clsx from "clsx";

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
    (p, renderer) => (
      <TabsGroupRenderer
        {...p}
        tabOptions={p.renderOptions as TabsRenderOptions}
        options={options}
      />
    ),
    {
      renderType: GroupRenderType.Tabs,
    },
  );
}

export function TabsGroupRenderer({
  formNode,
  className,
  options,
  renderChild,
  designMode,
  tabOptions,
}: GroupRendererProps & {
  options: DefaultTabsRenderOptions;
  tabOptions: TabsRenderOptions;
}) {
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
    renderTabs(formNode.getChildNodes(), 0)
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
