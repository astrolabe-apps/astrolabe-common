import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import React, { useRef } from "react";
import {
  buildSchema,
  ControlDefinitionExtension,
  createDataRenderer,
  CustomRenderOptions,
  DataRendererProps,
  FormRenderer,
  RenderOptions,
  stringField,
  stringOptionsField,
} from "@react-typed-forms/schemas";
import clsx from "clsx";

export interface TurnstileRendererOptions {
  /** Default site key to use if not specified per-field */
  siteKey?: string;
  /** Default theme */
  theme?: "light" | "dark" | "auto";
  /** Default size */
  size?: "normal" | "compact";
  /** Container class for the turnstile widget */
  containerClass?: string;
}

export const defaultTurnstileOptions: TurnstileRendererOptions = {
  theme: "auto",
  size: "normal",
  containerClass: "",
};

interface TurnstileFieldOptions {
  /** Cloudflare Turnstile site key */
  siteKey?: string;
  /** Widget theme */
  theme?: string;
  /** Widget size */
  size?: string;
  /** Action name for analytics */
  action?: string;
}

export interface TurnstileRenderOptions
  extends RenderOptions,
    TurnstileFieldOptions {
  type: "Turnstile";
}

interface TurnstileComponentProps {
  props: DataRendererProps & {
    renderOptions: TurnstileRenderOptions;
  };
  options: TurnstileRendererOptions;
  renderer: FormRenderer;
}

function TurnstileComponent({
  props,
  options,
  renderer,
}: TurnstileComponentProps) {
  const { control, readonly, designMode, renderOptions } = props;
  const { Div } = renderer.html;
  const turnstileRef = useRef<TurnstileInstance>(null);

  const dto = defaultTurnstileOptions;
  const {
    containerClass = dto.containerClass,
    siteKey: defaultSiteKey,
    theme: defaultTheme = dto.theme,
    size: defaultSize = dto.size,
  } = options;

  const siteKey = renderOptions.siteKey || defaultSiteKey;
  const theme = (renderOptions.theme as "light" | "dark" | "auto") || defaultTheme;
  const size = (renderOptions.size as "normal" | "compact") || defaultSize;
  const action = renderOptions.action;

  if (!siteKey) {
    return (
      <Div className={clsx(containerClass, "text-red-500")}>
        Turnstile site key is required
      </Div>
    );
  }

  if (designMode) {
    return (
      <Div className={clsx(containerClass, "border border-dashed border-gray-400 p-4 text-center text-gray-500")}>
        Turnstile Captcha (preview)
      </Div>
    );
  }

  return (
    <Div className={clsx(containerClass)}>
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        options={{
          theme,
          size,
          action,
        }}
        onSuccess={(token) => {
          control.value = token;
        }}
        onExpire={() => {
          control.value = null;
          turnstileRef.current?.reset();
        }}
        onError={() => {
          control.value = null;
        }}
      />
    </Div>
  );
}

/**
 * Creates a Turnstile captcha renderer for schema-driven forms.
 *
 * The control stores the verification token in the form control value.
 * This token should be verified server-side with Cloudflare's API.
 *
 * @see https://developers.cloudflare.com/turnstile/
 */
export function createTurnstileRenderer(options?: TurnstileRendererOptions) {
  return createDataRenderer(
    (props, renderer) => (
      <TurnstileComponent
        props={
          props as DataRendererProps & { renderOptions: TurnstileRenderOptions }
        }
        options={options ?? {}}
        renderer={renderer}
      />
    ),
    {
      renderType: "Turnstile",
    }
  );
}

export function isTurnstileRenderer(
  options: RenderOptions
): options is TurnstileRenderOptions {
  return options.type === "Turnstile";
}

export const turnstileFields = buildSchema<TurnstileFieldOptions>({
  siteKey: stringField("Site Key"),
  theme: stringOptionsField(
    "Theme",
    { name: "Auto", value: "auto" },
    { name: "Light", value: "light" },
    { name: "Dark", value: "dark" }
  ),
  size: stringOptionsField(
    "Size",
    { name: "Normal", value: "normal" },
    { name: "Compact", value: "compact" }
  ),
  action: stringField("Action"),
});

export const TurnstileDefinition: CustomRenderOptions = {
  name: "Turnstile",
  value: "Turnstile",
  fields: turnstileFields,
};

export const TurnstileExtension: ControlDefinitionExtension = {
  RenderOptions: TurnstileDefinition,
};
