import React, { useRef } from "react";
import { useControlEffect } from "@react-typed-forms/core";
import {
  createDataRenderer,
  DataRendererProps,
  rendererClass,
  TextfieldRenderOptions,
} from "@react-typed-forms/schemas";

export function createMultilineFieldRenderer(
  className?: string,
  useContentEditable?: boolean,
) {
  return createDataRenderer((p) => (
    <MultilineTextfield
      {...p}
      useContentEditable={useContentEditable}
      className={rendererClass(p.className, className)}
    />
  ));
}

export function MultilineTextfield({
  useContentEditable,
  ...props
}: DataRendererProps & { useContentEditable?: boolean }) {
  return useContentEditable ? (
    <ContentEditableMultilineTextfield {...props} />
  ) : (
    <TextareaMultilineTextfield {...props} />
  );
}

function TextareaMultilineTextfield({
  control,
  readonly,
  className,
  ...props
}: DataRendererProps) {
  const { renderOptions } = props;
  const { placeholder } = renderOptions as TextfieldRenderOptions;

  return (
    <textarea
      value={control.value}
      className={className}
      onChange={(t) => (control.value = t.currentTarget.value)}
      placeholder={placeholder ?? ""}
      disabled={control.disabled}
      readOnly={readonly}
    />
  );
}

function ContentEditableMultilineTextfield({
  control,
  readonly,
  className,
  ...props
}: DataRendererProps) {
  const { renderOptions } = props;
  const { placeholder } = renderOptions as TextfieldRenderOptions;
  const codeRef = useRef<HTMLElement | null>(null);
  useControlEffect(
    () => control.value,
    (v) => {
      const c = codeRef.current;
      if (c && c.textContent !== v) {
        c.textContent = v;
      }
    },
    true,
  );
  return (
    <code
      contentEditable={!control.disabled && !readonly}
      className={className}
      onInput={(t) => (control.value = t.currentTarget.textContent)}
      ref={codeRef}
      aria-disabled={control.disabled}
      aria-readonly={readonly}
      aria-placeholder={placeholder ?? ""}
      role={"textbox"}
      aria-multiline={true}
    />
  );
}
