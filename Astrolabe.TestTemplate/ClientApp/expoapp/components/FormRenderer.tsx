import {
  createFormRenderer,
  fontAwesomeIcon,
} from "@react-typed-forms/schemas";
import { createDefaultRenderers } from "@react-typed-forms/schemas-html";
import { defaultRnTailwindTheme } from "@react-typed-forms/schemas-rn";
import { View } from "react-native";
import React from "react";

export const renderer = createFormRenderer(
  [],
  createDefaultRenderers({
    ...defaultRnTailwindTheme,
    label: {
      ...defaultRnTailwindTheme.label,
      className: "font-bold py-4",
      groupLabelClass: "text-2xl",
      labelContainer: (c) => (
        <View className="flex flex-row gap-4 items-center" children={c} />
      ),
    },
    action: {
      className: "border text-primary-600 p-3 border-neutral-400 font-bold",
    },
    data: {
      ...defaultRnTailwindTheme.data,
      inputClass: "form-control",
      selectOptions: { className: "form-control" },
      radioOptions: {
        className: "flex flex-row flex-wrap gap-x-4",
        entryClass: "flex flex-row items-center gap-2",
      },
      checkOptions: {
        className: "flex flex-row flex-wrap gap-x-4",
        entryClass: "flex flex-row items-center gap-2",
      },
      checkListOptions: {
        className: "flex flex-wrap gap-x-4",
        entryClass: "flex items-center gap-2",
      },
    },
    display: {
      htmlClassName: "html",
    },
    group: {
      ...defaultRnTailwindTheme.group,
      defaultGridColumns: 1,
      defaultFlexGap: "1em",
    },
    adornment: {
      accordion: {
        className: "flex flex-row items-center gap-2 my-2 p-0",
        titleClass: "cursor-pointer font-bold text-black",
        iconOpen: fontAwesomeIcon("chevron-up"),
        iconClosed: fontAwesomeIcon("chevron-down"),
      },
      helpText: {
        triggerContainerClass:
          "flex flex-row gap-2 items-center bg-surface-100 px-2 font-bold text-sm rounded-md whitespace-nowrap",
        contentContainerClass:
          "bg-neutral-900 text-sm text-center font-semibold leading-none text-white w-56 rounded-md px-4 py-2",
        contentTextClass: "text-white text-center",
        iconName: "info-circle",
        iconClass: "!text-[16px] text-black-500",
      },
    },
  }),
);
