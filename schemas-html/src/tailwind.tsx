import React from "react";

import { DefaultRendererOptions } from "./createDefaultRenderers";

export const defaultTailwindTheme = {
  label: {
    groupLabelClass: "font-bold",
    requiredElement: <span className="text-red-500"> *</span>,
  },
  array: {
    removableClass: "grid grid-cols-[1fr_auto] items-center gap-x-2",
    childClass: "grow my-2",
    addActionClass: "my-2",
  },
  group: {
    standardClassName: "flex flex-col gap-4",
    gridClassName: "gap-x-2 gap-y-4",
    flexClassName: "gap-2",
    tabs: {
      className: "",
      tabListClass:
        "flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400",
      tabClass: "me-2",
      labelClass:
        "inline-flex items-center justify-center p-4 border-b-2 group",
      inactiveClass:
        "border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 cursor-pointer",
      activeClass:
        "text-blue-600 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500",
      contentClass: "my-2",
    },
  },
  action: {
    className: "bg-primary-500 rounded-lg p-3 text-white",
  },
  layout: {
    className: "flex flex-col",
    errorClass: "text-sm text-danger-500",
  },
  data: {
    displayOnlyClass: "flex flex-row items-center gap-2",
    checkOptions: {
      className: "flex items-center gap-4",
      entryClass: "flex gap-1 items-center",
    },
    selectOptions: { emptyText: "<select>" },
    multilineClass: "border p-2 outline-0 whitespace-pre-wrap",
    autocompleteOptions: {
      className:
        "w-full flex gap-[5px] pr-[5px] overflow-hidden rounded-lg bg-white border border-solid border-gray-200 hover:border-primary-400 focus-visible:outline-0 shadow-[0_2px_4px_rgb(0_0_0_/_0.05)] min-h-[48px] py-1",
      listContainerClass:
        "absolute w-full text-sm box-border p-1.5 my-3 mx-0 min-w-[120px] rounded-xl overflow-auto outline-0 max-h-[300px] z-[1] bg-white border border-solid border-surface-200 text-surface-900 shadow-[0_4px_30px_transparent] shadow-surface-200",
      listEntryClass:
        "list-none p-2 rounded-lg cursor-default last-of-type:border-b-0 hover:cursor-pointer hover:bg-primary-100 aria-selected:bg-primary-200 aria-selected:text-primary-900 focused:bg-surface-100 focus-visible:bg-surface-100 focused:text-surface-900 focus-visible:text-surface-900 focus-visible:shadow-[0_0_0_3px_transparent] focus-visible:shadow-primary-200  focused:aria-selected:bg-primary-200 focus-visible:aria-selected:bg-primary-200 focused:aria-selected:text-primary-900 focus-visible:aria-selected:text-primary-900",
      chipContainerClass:
        "flex flex-row items-center px-3 py-1 rounded-full bg-surface-100 m-1 gap-2 truncate",
      chipCloseButtonClass:
        "fa-solid fa-xmark p-1 bg-surface-300 rounded-full min-w-[24px] flex justify-center text-surface-50 hover:bg-surface-400 hover:text-surface-100 hover:cursor-pointer",
    },
  },
  adornment: {
    accordion: {
      className: "flex items-center gap-2 my-2",
      titleClass: "cursor-pointer",
      iconOpenClass: "fa fa-chevron-up",
      iconClosedClass: "fa fa-chevron-down",
    },
  },
} satisfies DefaultRendererOptions;
