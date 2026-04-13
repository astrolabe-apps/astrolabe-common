import ReCAPTCHA, { ReCAPTCHAProps } from "react-google-recaptcha";
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

export interface RecaptchaRendererOptions
  extends Pick<ReCAPTCHAProps, "theme" | "size" | "badge"> {
  /** Container class for the reCAPTCHA widget */
  containerClass?: string;
  sitekey?: string;
}

export const defaultRecaptchaOptions: RecaptchaRendererOptions = {
  theme: "light",
  size: "normal",
  badge: "bottomright",
  containerClass: "",
};

interface RecaptchaFieldOptions
  extends Pick<ReCAPTCHAProps, "theme" | "size" | "badge" | "sitekey"> {
  challengeType?: ReCAPTCHAProps["type"];
}

export interface RecaptchaRenderOptions
  extends RenderOptions,
    RecaptchaFieldOptions {
  type: "Recaptcha";
}

interface RecaptchaComponentProps {
  props: DataRendererProps & {
    renderOptions: RecaptchaRenderOptions;
  };
  options: RecaptchaRendererOptions;
  renderer: FormRenderer;
}

function RecaptchaComponent({
  props,
  options,
  renderer,
}: RecaptchaComponentProps) {
  const { control, readonly, designMode, renderOptions } = props;
  const { Div } = renderer.html;
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const recaptchaOptions = renderOptions as RecaptchaRenderOptions;
  const dto = defaultRecaptchaOptions;
  const {
    containerClass = dto.containerClass,
    sitekey: defaultSiteKey,
    theme: defaultTheme = dto.theme,
    size: defaultSize = dto.size,
    badge: defaultBadge = dto.badge,
  } = options;

  const siteKey = recaptchaOptions.sitekey || defaultSiteKey;
  const theme = recaptchaOptions.theme || defaultTheme;
  const size = recaptchaOptions.size || defaultSize;
  const badge = recaptchaOptions.badge || defaultBadge;
  const challengeType = recaptchaOptions.challengeType;

  if (!siteKey) {
    return (
      <Div className={clsx(containerClass, "text-red-500")}>
        reCAPTCHA site key is required
      </Div>
    );
  }

  if (designMode) {
    return (
      <Div
        className={clsx(
          containerClass,
          "border border-dashed border-gray-400 p-4 text-center text-gray-500",
        )}
      >
        reCAPTCHA Captcha (preview)
      </Div>
    );
  }

  return (
    <Div className={clsx(containerClass)}>
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        theme={theme}
        size={size}
        badge={badge}
        type={challengeType}
        onChange={(token) => {
          control.value = token;
        }}
        onExpired={() => {
          control.value = null;
          recaptchaRef.current?.reset();
        }}
        onErrored={() => {
          control.value = null;
        }}
      />
    </Div>
  );
}

/**
 * Creates a reCAPTCHA captcha renderer for schema-driven forms.
 *
 * The control stores the verification token in the form control value.
 * This token should be verified server-side with Google's API.
 *
 * @see https://developers.google.com/recaptcha/docs/display
 */
export function createRecaptchaRenderer(options?: RecaptchaRendererOptions) {
  return createDataRenderer(
    (props, renderer) => (
      <RecaptchaComponent
        props={
          props as DataRendererProps & { renderOptions: RecaptchaRenderOptions }
        }
        options={options ?? {}}
        renderer={renderer}
      />
    ),
    {
      renderType: "Recaptcha",
    },
  );
}

export function isRecaptchaRenderer(
  options: RenderOptions,
): options is RecaptchaRenderOptions {
  return options.type === "Recaptcha";
}

export const recaptchaFields = buildSchema<RecaptchaFieldOptions>({
  sitekey: stringField("Site Key"),
  theme: stringOptionsField(
    "Theme",
    { name: "Light", value: "light" },
    { name: "Dark", value: "dark" },
  ),
  size: stringOptionsField(
    "Size",
    { name: "Normal", value: "normal" },
    { name: "Compact", value: "compact" },
    { name: "Invisible", value: "invisible" },
  ),
  badge: stringOptionsField(
    "Badge Position",
    { name: "Bottom Right", value: "bottomright" },
    { name: "Bottom Left", value: "bottomleft" },
    { name: "Inline", value: "inline" },
  ),
  challengeType: stringOptionsField(
    "Challenge Type",
    { name: "Image", value: "image" },
    { name: "Audio", value: "audio" },
  ),
});

export const RecaptchaDefinition: CustomRenderOptions = {
  name: "Recaptcha",
  value: "Recaptcha",
  fields: recaptchaFields,
};

export const RecaptchaExtension: ControlDefinitionExtension = {
  RenderOptions: RecaptchaDefinition,
};
