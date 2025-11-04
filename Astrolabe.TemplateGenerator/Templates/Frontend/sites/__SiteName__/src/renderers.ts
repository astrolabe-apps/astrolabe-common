import { createFormRenderer } from "@react-typed-forms/schemas";
import { createDatePickerRenderer } from "@astroapps/schemas-datepicker";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

export function createStdFormRenderer(container: HTMLElement | null) {
  return createFormRenderer(
    [
      createDatePickerRenderer(undefined, {
        portalContainer: container ? container : undefined,
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
