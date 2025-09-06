import { DefaultRendererOptions } from "./rendererOptions";
import { defaultTailwindTheme } from "./defaultTailwindTheme";
import { View } from "react-native";
import { deepMerge } from "@react-typed-forms/schemas";

export const defaultRnTailwindTheme = deepMerge<DefaultRendererOptions>(
  {
    data: {
      checkOptions: {
        entryClass: "flex flex-row items-center gap-[8px]",
        labelClass: "flex-1",
      },
      selectOptions: { emptyText: "select" },
    },
    label: {
      labelContainer: (c) => (
        <View className="flex flex-row gap-4 items-center" children={c} />
      ),
    },
    array: {
      removableClass: "flex flex-col gap-y-2",
    },
    action: {
      buttonClass:
        "flex flex-row gap-2 bg-primary-500 rounded-lg p-3 web:hover:opacity-90 active:opacity-90",
      textClass: "text-white",
    },
    adornment: {
      accordion: {
        className: "flex flex-row items-center gap-2 my-2 p-0 self-start",
      },
      helpText: {
        iconName: "info-circle",
        iconClass: "text-[12px]",
        triggerContainerClass: "flex flex-row gap-2 items-baseline",
        triggerLabelClass: "text-sm font-bold",
        contentTextClass: "text-white font-semibold text-sm",
      },
    },
  },
  defaultTailwindTheme,
);