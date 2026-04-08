import { createFormRenderer, deepMerge } from "@react-typed-forms/schemas";
import {
  createDataGridRenderer,
  createPagerRenderer,
  DataGridGroupRenderer,
} from "@astroapps/schemas-datagrid";
import {
  createDatePickerRenderer,
  DatePickerOptions,
} from "@astroapps/schemas-datepicker";
import {
  createDefaultRenderers,
  DefaultRendererOptions,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { createQuickstreamCC } from "@astroapps/schemas-quickstream";
import { createSignatureRenderer } from "@astroapps/schemas-signature";
import { createRechartsRenderer } from "@astroapps/schemas-rechart";
import { createTurnstileRenderer } from "@astroapps/schemas-turnstile";
import { createRecaptchaRenderer } from "@astroapps/schemas-recaptcha";

export function createStdFormRenderer(container: HTMLElement | null) {
  return createFormRenderer(
    [
      createQuickstreamCC(process.env.NEXT_PUBLIC_QS_PUBLIC_KEY!, {
        config: {
          supplierBusinessCode: process.env.NEXT_PUBLIC_QS_BUSINESS_CODE!,
        },
      }),
      createPagerRenderer(),
      createDataGridRenderer(
        {
          addText: "Add",
          removeText: "Delete",
        },
        { rowClass: "group contents", cellClass: "group-hover:bg-gray-100" },
      ),
      createSignatureRenderer({}),
      createRechartsRenderer(),
      createTurnstileRenderer({
        siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      }),
      createRecaptchaRenderer({
        sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      }),
      DataGridGroupRenderer,
      createDatePickerRenderer(undefined, {
        portalContainer: container ? container : undefined,
        containerClass: "w-full",
      } as DatePickerOptions),
    ],
    createDefaultRenderers(
      deepMerge<DefaultRendererOptions>(
        {
          data: {
            defaultEmptyText: "<empty>",
          },
          group: {
            wizard: {
              actions: {
                prev: { hide: true },
                next: { hide: true },
                validateActionId: "validate",
              },
            },
          },
        },
        defaultTailwindTheme,
      ),
    ),
  );
}
