import React from "react";
import { DefaultRendererOptions } from "./rendererOptions";
import { fontAwesomeIcon } from "@react-typed-forms/schemas";

// Default tailwind theme adapted for React Native
export const defaultTailwindTheme = {
  label: {
    groupLabelClass: "font-bold",
    requiredElement: ({ Span }) =>
      React.createElement(Span, { className: "text-red-500" }, " *"),
  },
  array: {
    removableClass: "grid grid-cols-[1fr_auto] items-center gap-x-2",
    childClass: "grow my-2",
    addActionClass: "my-2",
    removeActionClass: "flex gap-2",
  },
  group: {
    standardClassName: "flex flex-col gap-4",
    grid: {
      className: "flex flex-col gap-4",
      rowClass: "flex flex-row gap-4 justify-between",
      cellClass: "flex-1",
    },
    flexClassName: "gap-2",
    inlineClass: "",
    tabs: {
      className: "",
      tabListClass:
        "flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200",
      tabClass: "me-2",
      labelClass: "flex items-center justify-center p-4 border-b-2",
      inactiveClass:
        "border-transparent rounded-t-lg text-gray-600 border-gray-300",
      activeClass:
        "text-blue-600 border-blue-600 rounded-t-lg text-blue-500 border-blue-500",
      contentClass: "my-2",
    },
  },
  action: {
    buttonClass: "rounded-lg p-3 text-white disabled:opacity-75",
    primaryClass: "bg-primary-500",
    secondaryClass: "bg-secondary-500",
    linkTextClass: "text-primary-500 underline",
    iconBeforeClass: "px-2",
    iconAfterClass: "px-2",
    busyIcon: fontAwesomeIcon("spinner fa-spin"),
  },
  layout: {
    className: "flex flex-col",
    errorClass: "text-sm text-red-500",
  },
  data: {
    inputClass: "border rounded p-2",
    displayOnlyClass: "flex flex-row items-center gap-2",
    checkOptions: {
      className: "flex gap-4",
      entryClass: "flex items-center gap-1",
    },
    selectOptions: { emptyText: "<select>" },
    arrayElementOptions: { actionsClass: "my-2 flex gap-2" },
    multilineClass: "border p-2",
    autocompleteOptions: {
      className:
        "w-full flex gap-[5px] pr-[5px] overflow-hidden rounded-lg bg-white border border-solid border-gray-200 min-h-[48px] py-1",
      listContainerClass:
        "w-full text-sm p-1.5 my-3 mx-0 min-w-[120px] rounded-xl max-h-[300px] bg-white border border-solid border-surface-200 text-surface-900",
      listEntryClass: "p-2 rounded-lg bg-primary-100 text-primary-900",
      chipContainerClass:
        "flex flex-row items-center px-3 py-1 rounded-full bg-surface-100 m-1 gap-2",
      chipCloseButtonClass:
        "p-1 bg-surface-300 rounded-full min-w-[24px] flex justify-center text-surface-50",
    },
    scrollListOptions: {
      loadingIcon: fontAwesomeIcon("spinner fa-spin"),
    },
  },
  adornment: {
    accordion: {
      className: "flex items-center gap-2 my-2 w-fit",
      titleTextClass: "cursor-pointer",
      iconOpen: fontAwesomeIcon("chevron-up"),
      iconClosed: fontAwesomeIcon("chevron-down"),
    },
    optional: {
      checkClass: "m-2",
      className: "flex items-center gap-2 w-full",
      multiValuesClass: "italic",
      childWrapperClass: "grow",
    },
  },
} satisfies DefaultRendererOptions;
