import { createFormRenderer } from "@react-typed-forms/schemas";
import { createDatePickerRenderer } from "@astroapps/schemas-datepicker";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

export function createStdFormRenderer() {
  return createFormRenderer(
    [
      createDatePickerRenderer(undefined, {
        containerClass: "w-full",
      }),
    ],
    createDefaultRenderers({
      ...defaultTailwindTheme,
      data: {
        ...defaultTailwindTheme.data,
        defaultEmptyText: "<empty>",
      },
    }),
  );
}
