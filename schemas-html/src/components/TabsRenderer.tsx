import {
  controlTitle,
  createGroupRenderer,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
} from "@react-typed-forms/schemas";
import React from "react";
import { useControl } from "@react-typed-forms/core";
import clsx from "clsx";

export interface TabsRendererOptions {
  className?: string;
  tabListClass?: string;
  tabClass?: string;
  labelClass?: string;
  activeClass?: string;
  inactiveClass?: string;
  contentClass?: string;
}

export function createTabsRenderer(options: TabsRendererOptions = {}) {
  return createGroupRenderer(
    (p, renderer) => <TabsGroupRenderer {...p} options={options} />,
    {
      renderType: GroupRenderType.Tabs,
    },
  );
}

export function TabsGroupRenderer({
  childDefinitions,
  className,
  options,
  renderChild,
  designMode,
}: GroupRendererProps & { options: TabsRendererOptions }) {
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
  const actualDefinitions = designMode
    ? childDefinitions.map((x) => [x])
    : [childDefinitions];
  return (
    <>
      {actualDefinitions.map((tabs, i) => (
        <div key={i} className={rendererClass(className, options.className)}>
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
                  {x.title ? x.title : "<untitled>"}
                </span>
              </li>
            ))}
          </ul>
          <div className={rendererClass(null, contentClass)}>
            {renderChild(currentTab, tabs[currentTab])}
          </div>
        </div>
      ))}
    </>
  );
}
