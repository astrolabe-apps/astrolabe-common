import { createFormRenderer } from "@react-typed-forms/schemas";
import {
  createDataGridRenderer,
  DataGridGroupRenderer,
} from "@astroapps/schemas-datagrid";
import { createDatePickerRenderer } from "@astroapps/schemas-datepicker";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

export function createStdFormRenderer(container: HTMLElement | null) {
  return createFormRenderer(
    [
      createDataGridRenderer({
        addText: "Add",
        removeText: "Delete",
      }),
      DataGridGroupRenderer,
      createDatePickerRenderer(undefined, {
        portalContainer: container ? container : undefined,
      }),
    ],
    createDefaultRenderers({
      ...defaultTailwindTheme,
    }),
  );
}
