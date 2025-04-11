import { normalizeProps, useMachine } from "@zag-js/react";
import * as signaturePad from "@zag-js/signature-pad";
import { useId, useState } from "react";

import React from "react";
import {
  boolField,
  buildSchema,
  ControlDefinitionExtension,
  createDataRenderer,
  CustomRenderOptions,
  DataRendererProps,
  fontAwesomeIcon,
  FormRenderer,
  HtmlInputProperties,
  IconReference,
  RenderOptions,
  stringField,
} from "@react-typed-forms/schemas";
import clsx from "clsx";

export interface SignatureRendererOptions {
  containerClass?: string;
  canvasClass?: string;
  clearButton?: IconReference;
  clearButtonClass?: string;
  /** The path currently being drawn */
  currentSegmentClass?: string;
  /** The parent SVG element */
  segmentClass?: string;
  /** The paths already drawn */
  segmentPathClass?: string;
  /** If the `control` is `disabled`, applies this instead of `segmentPathClass` */
  disabledSegmentPathClass?: string;
  /** A line element that is used to help keep signatures straight */
  guideClass?: string;
}

interface SignatureFieldOptions {
  /** Hides the guide line used for signatures */
  noGuideLine?: boolean;
  /** The name of the field to be submitted in a form */
  formName?: string;
}
export interface SignatureRenderOptions
  extends RenderOptions,
    SignatureFieldOptions {
  type: "Signature";
}

interface SignatureRendererProps {
  props: DataRendererProps & {
    renderOptions: SignatureRenderOptions;
  };
  options: Omit<signaturePad.Props, "id"> & SignatureRendererOptions;
  renderer: FormRenderer;
}

/** Built on top of ZagJS' Signature component
 * Binds the control to the path content, and the imageURL to a hidden input with the control's `uniqueId` for inclusion in forms.
 * @see https://zagjs.com/components/react/signature-pad
 */
function SignatureRenderer({
  props,
  options,
  renderer,
}: SignatureRendererProps) {
  const { control, readonly, required, designMode, renderOptions } = props;

  const { Button, I, Div, Input } = renderer.html;
  const [imageURL, setImageURL] = useState<string>("");

  const {
    containerClass = defaultSignatureClasses.containerClass,
    canvasClass = defaultSignatureClasses.canvasClass,
    clearButton = defaultSignatureClasses.clearButton,
    clearButtonClass,
    currentSegmentClass = defaultSignatureClasses.currentSegmentClass,
    guideClass = defaultSignatureClasses.guideClass,
    segmentClass = defaultSignatureClasses.segmentClass,
    segmentPathClass = defaultSignatureClasses.segmentPathClass,
    disabledSegmentPathClass = defaultSignatureClasses.disabledSegmentPathClass,
    ...otherOptions
  } = options;

  const service = useMachine(signaturePad.machine, {
    ids: {
      hiddenInput: `c${control.uniqueId}`,
      ...options.ids,
    },
    id: useId(),
    readOnly: readonly,
    name: options.name || renderOptions.formName,
    onDraw: options?.onDraw,
    disabled: control.disabled,
    required: required,
    onDrawEnd(details) {
      control.value = details.paths;
      details.getDataUrl("image/png").then((url) => {
        setImageURL(url);
      });
      options?.onDrawEnd?.(details);
    },
    ...otherOptions,
  });

  const api = signaturePad.connect(service, normalizeProps);
  return (
    <Div className={clsx(containerClass)} {...api.getRootProps()}>
      {!designMode && (
        <Div className={clsx(canvasClass)} {...api.getControlProps()}>
          <svg className={clsx(segmentClass)} {...api.getSegmentProps()}>
            {api.paths.map((path, i) => (
              <path
                className={clsx(
                  control.disabled
                    ? disabledSegmentPathClass
                    : segmentPathClass,
                )}
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
            onClick={() => {
              api.getClearTriggerProps().onClick?.(null as any);
            }}
          >
            {clearButton && (
              <I
                iconLibrary={clearButton.library}
                iconName={clearButton.name}
              />
            )}
          </Button>
          {/* the `getHiddenInputProps` can return a string[] which doesn't fit the schema, hence the coersion */}
          <Input
            {...(api.getHiddenInputProps({
              value: imageURL,
            }) as HtmlInputProperties)}
          />
          {!renderOptions.noGuideLine && (
            <Div className={clsx(guideClass)} {...api.getGuideProps()} />
          )}
        </Div>
      )}
    </Div>
  );
}

/** Built on top of ZagJS' Signature component
 * Binds the control to the path content, and the imageURL to a hidden input with the control's `uniqueId` for inclusion in forms.
 * @see https://zagjs.com/components/react/signature-pad
 */
export function createSignatureRenderer(
  options: Omit<signaturePad.Props, "id"> & SignatureRendererOptions,
) {
  return createDataRenderer(
    (props, renderer) => (
      <SignatureRenderer
        props={
          props as DataRendererProps & { renderOptions: SignatureRenderOptions }
        }
        options={options}
        renderer={renderer}
      />
    ),
    {
      renderType: "Signature",
      type: "data",
      collection: true,
      match: (p, renderOptions) => isSignatureRenderer(renderOptions),
    },
  );
}

export function isSignatureRenderer(
  options: RenderOptions,
): options is SignatureRenderOptions {
  return options.type === "Signature";
}

export const defaultSignatureClasses = {
  containerClass: "min-h-[100px] border border-surface-300 rounded-lg px-2",
  canvasClass: "w-full h-full min-h-[100px] relative",
  clearButton: fontAwesomeIcon("rotate-left"),
  segmentClass: "fill-black z-20",
  segmentPathClass: "fill-black",
  disabledSegmentPathClass: "fill-surface-800",
  currentSegmentClass: "fill-blue-500 z-30",
  guideClass:
    "border-b border-surface-500 border-dashed h-[1px] px-4 absolute inset-x-4 bottom-[12%] z-10",
} satisfies SignatureRendererOptions;

export const signatureFields = buildSchema<SignatureFieldOptions>({
  noGuideLine: boolField("Hide guide line", {
    defaultValue: false,
    description: "Hides the guide line used for signatures.",
  }),
  formName: stringField("Form name", {
    defaultValue: "signature",
    description: "The name of the field to be submitted in a form.",
  }),
});

export const SignatureDefinition: CustomRenderOptions = {
  name: "Signature",
  value: "Signature",
  applies: (sf) => !!sf.field.collection,
  fields: signatureFields,
};
export const SignatureExtension: ControlDefinitionExtension = {
  RenderOptions: SignatureDefinition,
};
