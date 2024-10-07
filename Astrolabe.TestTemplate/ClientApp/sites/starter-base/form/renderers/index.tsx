import { createDefaultRenderers } from "./createDefaultRenderers";
import React from "react";
import {
  createFormRenderer,
  DefaultRendererOptions,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas";
import { Text } from "react-native";
import { createDatePickerRenderer } from "~/form/renderers/DatePickerRenderer";
import { createHelpTextRenderer } from "~/form/renderers/HelpTextRenderer";

const theme: DefaultRendererOptions = {
  ...defaultTailwindTheme,
  label: {
    requiredElement: <Text className="text-red-500"></Text>,
    className: "font-bold py-4",
    groupLabelClass: "text-2xl",
    labelContainer: (c) => (
      <Text className="flex flex-row items-baseline gap-4" children={c} />
    ),
  },
  action: {
    className: "border text-primary-600 p-3 border-neutral-400 font-bold",
  },
  layout: {
    ...defaultTailwindTheme.layout,
    renderError: (e) => <Text className={"text-red-500"} children={e} />,
  },
  data: {
    ...defaultTailwindTheme.data,
    inputClass: "border bg-white p-2",
    selectOptions: { className: "form-control" },
    radioOptions: {
      className: "flex flex-row flex-wrap gap-x-4",
      entryClass: "flex flex-row items-center gap-2",
    },
    checkOptions: {
      entryClass: "flex flex-row items-center gap-1",
    },
    checkListOptions: {
      className: "flex flex-row flex-wrap gap-x-4",
      entryClass: "flex flex-row items-center gap-2",
    },
  },
  display: {
    htmlClassName: "html",
  },
  group: {
    ...defaultTailwindTheme.group,
    defaultGridColumns: 1,
    defaultFlexGap: "1em",
  },
  adornment: {
    accordion: {
      className: "flex items-center gap-2 my-2 p-0",
      titleClass: "cursor-pointer",
      iconOpenClass: "fa fa-chevron-up",
      iconClosedClass: "fa fa-chevron-down",
    },
  },
};

export const formRenderer = createFormRenderer(
  [createDatePickerRenderer(), createHelpTextRenderer()],
  {
    ...createDefaultRenderers(theme),
  },
);
