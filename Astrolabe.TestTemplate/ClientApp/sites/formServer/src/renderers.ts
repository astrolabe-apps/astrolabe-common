import {
  createDefaultRenderers,
  createFormRenderer,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas";
import {
  createDataGridRenderer,
  DataGridGroupRenderer,
} from "@astroapps/schemas-datagrid";
import { createDatePickerRenderer } from "@astroapps/schemas-datepicker";

export function createStdFormRenderer(container: HTMLElement | null) {
  return createFormRenderer(
    [
      createDataGridRenderer({ addText: "Add", removeText: "Delete" }),
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
