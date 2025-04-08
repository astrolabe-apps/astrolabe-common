import { normalizeProps, useMachine } from "@zag-js/react";
import * as signaturePad from "@zag-js/signature-pad";
import { useId, useState } from "react";

import React from "react";
import {
  createDataRenderer,
  CustomRenderOptions,
  DataRenderType,
  fontAwesomeIcon,
  IconReference,
} from "@react-typed-forms/schemas";
import clsx from "clsx";

export { SignatureExtension } from "./extensions";

export interface SignatureRendererOptions {
  canvasClass?: string;
  clearButton?: IconReference;
  clearButtonClass?: string;
  currentSegmentClass?: string;
  segmentClass?: string;
  segmentPathClass?: string;
  guideClass?: string;
}

/** Built on top of ZagJS' Signature component
 * Binds the control to the path content, and the imageURL to a hidden input with the control's `uniqueId` for inclusion in forms.
 * @see https://zagjs.com/components/react/signature-pad
 */
export function createSignatureRenderer(
  options: Omit<signaturePad.Props, "id"> & SignatureRendererOptions,
) {
  return createDataRenderer(
    (props, renderer) => {
      const { control, className } = props;
      const { Button, I, Div } = renderer.html;
      const [imageURL, setImageURL] = useState<string>("");
      const {
        canvasClass,
        clearButton,
        clearButtonClass,
        currentSegmentClass,
        guideClass,
        segmentClass,
        segmentPathClass,
        ...otherOptions
      } = options;
      const service = useMachine(signaturePad.machine, {
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
            setImageURL(url);
          });
        },
        ...otherOptions,
      });
      const api = signaturePad.connect(service, normalizeProps);

      return (
        <Div className={className} {...api.getRootProps()}>
          <Div className={clsx(canvasClass)} {...api.getControlProps()}>
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

            <Button
              className={clsx(clearButtonClass)}
              {...api.getClearTriggerProps()}
              onClick={() => api.getClearTriggerProps().onClick?.(null as any)}
            >
              {clearButton && (
                <I
                  iconLibrary={clearButton.library}
                  iconName={clearButton.name}
                />
              )}
            </Button>
            <input {...api.getHiddenInputProps({ value: imageURL })} />
            <Div className={clsx(guideClass)} {...api.getGuideProps()} />
          </Div>
        </Div>
      );
    },
    { renderType: DataRenderType.Signature },
  );
}

export const defaultSignatureClasses = {
  canvasClass: "h-20 border border-surface-300 rounded-lg px-2",
  clearButton: fontAwesomeIcon("rotate-left"),
  // "aspect-square bg-danger-500 text-white rounded-lg p-2 hover:bg-danger-600",
  segmentClass: "fill-black z-20",
  segmentPathClass: "fill-black",
  currentSegmentClass: "fill-blue-500",
  guideClass:
    "border-b border-surface-500 border-dashed h-[1px] px-4 absolute inset-x-4 bottom-[12%] z-10",
} satisfies SignatureRendererOptions;

export const SignatureDefinition: CustomRenderOptions = {
  name: "Signature",
  value: "Signature",
  applies: (sf) => true,
  groups: [
    {
      parent: "RenderOptions",
      group: {
        type: "Group",
        children: [],
        id: "SignatureOptions",
      },
    },
  ],
};
