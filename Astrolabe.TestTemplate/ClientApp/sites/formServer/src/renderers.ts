import { createFormRenderer } from "@react-typed-forms/schemas";
import {
  createDataGridRenderer,
  createPagerRenderer,
  DataGridGroupRenderer,
} from "@astroapps/schemas-datagrid";
import { createDatePickerRenderer } from "@astroapps/schemas-datepicker";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { createQuickstreamCC } from "@astroapps/schemas-quickstream";

export function createStdFormRenderer(container: HTMLElement | null) {
  return createFormRenderer(
    [
      createQuickstreamCC(process.env.NEXT_PUBLIC_QS_PUBLIC_KEY!, {
        config: {
          supplierBusinessCode: process.env.NEXT_PUBLIC_QS_BUSINESS_CODE!,
        },
      }),
      createPagerRenderer(),
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
