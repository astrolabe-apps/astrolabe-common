import {
  createGroupRenderer,
  createScoped,
  DefaultFormNodeUi,
  FormStateNode,
  GroupRendererProps,
  GroupRenderType,
  rendererClass,
  TabsRenderOptions,
} from "@react-typed-forms/schemas";
import React, { Fragment, useEffect } from "react";
import clsx from "clsx";
import { useControl } from "@react-typed-forms/core";
import { Control } from "@astroapps/controls";

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
        <TabsRenderer
          groupProps={p}
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

function TabsRenderer({
  options,
  groupProps: { designMode, formNode, className, renderChild },
  tabOptions,
}: {
  options: DefaultTabsRenderOptions;
  groupProps: GroupRendererProps;
  tabOptions: TabsRenderOptions;
}) {
  const tabIndex = useControl(0);

  useEffect(() => {
    formNode.attachUi(new TabUi(tabIndex, formNode));
  }, [formNode, tabIndex]);

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
    <>{formNode.children.map((x, i) => renderTabs([x], i))}</>
  ) : (
    renderTabs(
      formNode.children.filter((x, i) => x.visible),
      0,
    )
  );

  function renderTabs(tabs: FormStateNode[], key: number) {
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
          {renderChild(tabs[currentTab])}
        </div>
      </div>
    );
  }
}

class TabUi extends DefaultFormNodeUi {
  constructor(
    private tabIndex: Control<number>,
    node: FormStateNode,
  ) {
    super(node);
  }
  ensureChildVisible(childIndex: number) {
    this.tabIndex.value = childIndex;
    super.ensureChildVisible(childIndex);
  }
}
