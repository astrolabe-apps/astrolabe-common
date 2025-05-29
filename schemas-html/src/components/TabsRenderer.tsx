import {
  createGroupRenderer,
  FormNode,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
  TabsRenderOptions,
} from "@react-typed-forms/schemas";
import React, { Fragment } from "react";
import clsx from "clsx";
import { VisibleChildrenRenderer } from "./VisibleChildrenRenderer";

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
      return (
        <VisibleChildrenRenderer
          render={renderAllTabs}
          dataContext={p.dataContext}
          parentFormNode={p.formNode}
          parent={p}
          props={{
            groupProps: p,
            tabOptions: p.renderOptions as TabsRenderOptions,
            options: options,
          }}
        />
      );
    },
    {
      renderType: GroupRenderType.Tabs,
    },
  );

  function renderAllTabs(
    {
      options,
      groupProps: { designMode, formNode, className, renderChild, state },
      tabOptions,
    }: {
      options: DefaultTabsRenderOptions;
      groupProps: GroupRendererProps;
      tabOptions: TabsRenderOptions;
    },
    isVisible: (i: number) => boolean,
  ) {
    const tabIndex = state.meta.fields.tabIndex.as<number | undefined>();
    const {
      tabClass,
      labelClass,
      tabListClass,
      inactiveClass,
      activeClass,
      contentClass,
    } = options;
    const currentTab = tabIndex.value ?? 0;
    return designMode ? (
      <>{formNode.getChildNodes().map((x, i) => renderTabs([x], i))}</>
    ) : (
      renderTabs(
        formNode.getChildNodes().filter((x, i) => isVisible(i)),
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
