import { createDataRenderer } from "../renderers";
import { DataRendererProps } from "../controlRender";
import React, { useRef } from "react";
import { useControlEffect } from "@react-typed-forms/core";
import { rendererClass } from "../util";

export function createMultilineFieldRenderer(className?: string) {
  return createDataRenderer((p) => (
    <MultilineTextfield
      {...p}
      className={rendererClass(p.className, className)}
    />
  ));
}

export function MultilineTextfield({ control, className }: DataRendererProps) {
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
      contentEditable={!control.disabled}
      className={className}
      onInput={(t) => (control.value = t.currentTarget.textContent)}
      ref={codeRef}
    />
  );
}
