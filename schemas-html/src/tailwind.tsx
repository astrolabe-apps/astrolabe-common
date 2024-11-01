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
