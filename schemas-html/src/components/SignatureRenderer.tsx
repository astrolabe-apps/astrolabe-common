import { normalizeProps, useMachine } from "@zag-js/react";
import * as signaturePad from "@zag-js/signature-pad";
import { useId, useState } from "react";

import React from "react";
import { Control, useControlEffect } from "@react-typed-forms/core";
import {
  createDataRenderer,
  DataRenderType,
  rendererClass,
} from "@react-typed-forms/schemas";

export function SignatureRenderer({
  ...props
}: Omit<signaturePad.Props, "id">) {
  const service = useMachine(signaturePad.machine, {
    id: useId(),
    ...props,
  });

  const api = signaturePad.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()}>
      <label {...api.getLabelProps()}>Signature Pad</label>

      <div className="h-20" {...api.getControlProps()}>
        <svg {...api.getSegmentProps()}>
          {api.paths.map((path, i) => (
            <path key={i} {...api.getSegmentPathProps({ path })} />
          ))}
          {api.currentPath && (
            <path {...api.getSegmentPathProps({ path: api.currentPath })} />
          )}
        </svg>

        <button {...api.getClearTriggerProps()}>X</button>

        <div {...api.getGuideProps()} />
      </div>
    </div>
  );
}

export interface SignatureRendererOptions {
  type: DataRenderType.Signature;
  className?: string;
}

export function createSignatureRenderer(options: { className?: string } = {}) {
  return createDataRenderer(
    (props, renderer) => {
      const { control, className } = props;

      return (
        <SignatureComponent
          control={control}
          className={rendererClass(className, options.className)}
        />
      );
    },
    { renderType: DataRenderType.Signature },
  );
}

function SignatureComponent({
  control,
  className,
}: {
  control: Control<any>;
  className?: string;
}) {
  return (
    <div className={className}>
      <SignatureRenderer
        onDrawEnd={(e) => {
          control.value = e.paths;
        }}
      />
    </div>
  );
}
