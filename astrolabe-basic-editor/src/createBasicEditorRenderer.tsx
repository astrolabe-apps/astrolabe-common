import React from "react";
import { createFormRenderer, FormRenderer } from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  DefaultRendererOptions,
} from "@react-typed-forms/schemas-html";

const violetTheme = {
  label: {
    groupLabelClass: "text-[15px] font-semibold text-slate-800",
    groupLabelTextClass: "border-b-2 border-violet-200 pb-2 block",
    controlLabelTextClass: "text-[13px] font-medium text-slate-700 mb-1.5",
    requiredElement: ({ Span }: FormRenderer["html"]) => (
      <Span className="text-red-400 ml-0.5"> *</Span>
    ),
  },
  array: {
    removableClass: "grid grid-cols-[1fr_auto] items-center gap-x-2",
    childClass: "grow my-2",
    addActionClass: "my-2",
    removeActionClass: "flex gap-2",
  },
  group: {
    standardClassName: "flex flex-col gap-3",
    grid: {
      className: "flex flex-col gap-3",
      rowClass: "flex flex-row gap-4 justify-between",
      cellClass: "flex-1",
    },
    flexClassName: "gap-2",
    inlineClass: "",
  },
  action: {
    buttonClass:
      "rounded-lg px-4 py-2 text-white font-medium disabled:opacity-75 disabled:cursor-not-allowed transition-all",
    primaryClass:
      "bg-gradient-to-r from-violet-600 to-violet-500 shadow-sm hover:shadow-md",
    secondaryClass: "bg-slate-500 hover:bg-slate-600",
  },
  layout: {
    className: "flex flex-col mb-3",
    errorClass: "text-red-500 text-xs mt-1",
  },
  data: {
    inputClass:
      "bg-violet-50/50 border border-violet-200 rounded-lg px-3 h-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none w-full",
    multilineClass:
      "bg-violet-50/50 border border-violet-200 rounded-lg px-3 py-2 h-[72px] text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none w-full whitespace-pre-wrap",
    displayOnlyClass: "flex flex-row items-center gap-2",
    checkOptions: {
      className: "flex flex-wrap items-center gap-x-4 gap-y-1.5",
      entryClass: "flex items-center gap-1.5 accent-violet-600",
    },
    selectOptions: {
      className:
        "bg-violet-50/50 border border-violet-200 rounded-lg px-3 h-9 text-sm text-slate-800 focus:border-violet-500 focus:outline-none w-full",
      emptyText: "Select...",
    },
  },
  adornment: {
    accordion: {
      className: "flex items-center gap-2 my-2 w-fit",
      titleTextClass: "cursor-pointer",
    },
    optional: {
      checkClass: "m-2 accent-violet-600",
      className: "flex items-center gap-2 w-full",
      multiValuesClass: "italic",
      childWrapperClass: "grow",
    },
  },
} satisfies DefaultRendererOptions;

export function createBasicEditorRenderer(): FormRenderer {
  return createFormRenderer([], createDefaultRenderers(violetTheme));
}
