import { normalizeProps, useMachine } from "@zag-js/react";
import * as signaturePad from "@zag-js/signature-pad";
import { useEffect, useId, useState } from "react";

import React from "react";
import {
  createDataRenderer,
  DataRenderType,
  IconReference,
  LabelType,
  rendererClass,
} from "@react-typed-forms/schemas";
import clsx from "clsx";

export interface SignatureRendererOptions {
  className?: string;
  canvasClass?: string;
  buttonClass?: string;
  clearButtonClass?: IconReference | string;
  currentSegmentClass?: string;
  segmentClass?: string;
  segmentPathClass?: string;
  guideClass?: string;
}

export function createSignatureRenderer(
  options: Omit<signaturePad.Props, "id"> & SignatureRendererOptions,
) {
  return createDataRenderer(
    (props, renderer) => {
      const { control, className } = props;
      const [imageURL, setImageURL] = useState<string>("");
      const {
        canvasClass,
        buttonClass,
        clearButtonClass,
        currentSegmentClass,
        guideClass,
        segmentClass,
        segmentPathClass,
      } = options;
      const service = useMachine(signaturePad.machine, {
        // ...props,
        ids: {
          hiddenInput: `c${control.uniqueId}`,
        },
        id: useId(),
        readOnly: props.readonly,
        disabled: control.disabled,
        required: props.required,
        onDrawEnd(details) {
          control.value = details.paths;
          details.getDataUrl("image/png").then((url) => {
            // set the image URL in local state
            setImageURL(url);
          });
        },
      });
      const api = signaturePad.connect(service, normalizeProps);
      return (
        <div className={className} {...api.getRootProps()}>
          <div className={clsx(canvasClass)} {...api.getControlProps()}>
            <svg className={clsx(segmentClass)} {...api.getSegmentProps()}>
              {api.paths.map((path, i) => (
                <path
                  className={clsx(segmentPathClass)}
                  key={i}
                  {...api.getSegmentPathProps({ path })}
                />
              ))}
              {api.currentPath && (
                <path
                  className={clsx(currentSegmentClass)}
                  {...api.getSegmentPathProps({ path: api.currentPath })}
                />
              )}
            </svg>

            <button
              className={clsx(clearButtonClass)}
              type="button"
              {...api.getClearTriggerProps()}
            >
              X
            </button>
            <input {...api.getHiddenInputProps({ value: imageURL })} />
            <div className={clsx(guideClass)} {...api.getGuideProps()} />
          </div>
        </div>
      );
    },
    { renderType: DataRenderType.Signature },
  );
}
