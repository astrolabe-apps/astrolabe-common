import { normalizeProps, useMachine } from "@zag-js/react";
import * as signaturePad from "@zag-js/signature-pad";
import { useId } from "react";

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
  IconReference,
  RenderOptions,
  stringField,
} from "@react-typed-forms/schemas";
import clsx from "clsx";

export interface SignatureRendererOptions {
  clearButton?: IconReference;
  onClear?: () => void;
  classes: Partial<{
    container: string;
    canvas: string;
    clearButton: string;
    /** The path currently being drawn */
    currentSegment: string;
    /** The parent SVG element */
    segment: string;
    /** The paths already drawn */
    segmentPath: string;
    /** If the `control` is `disabled`, applies this instead of `segmentPathClass` */
    disabledSegmentPath: string;
    /** A line element that is used to help keep signatures straight */
    guide: string;
  }>;
}

export const defaultSignatureOptions = {
  clearButton: fontAwesomeIcon("rotate-left"),
  classes: {
    container: "min-h-[100px] border border-surface-300 rounded-lg px-2",
    canvas: "w-full h-full min-h-[100px] relative",
    segment: "fill-black z-20",
    segmentPath: "fill-black",
    disabledSegmentPath: "fill-surface-800",
    currentSegment: "fill-blue-500 z-30",
    clearButton: "",
    guide:
      "border-b border-surface-500 border-dashed h-[1px] px-4 absolute inset-x-4 bottom-[12%] z-10",
  },
} satisfies SignatureRendererOptions;
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

  const { Button, I, Div } = renderer.html;
  const dso = defaultSignatureOptions;
  const { clearButton = dso.clearButton, classes, ...otherOptions } = options;
  const {
    container = dso.classes.container,
    canvas = dso.classes.canvas,
    clearButton: clearButtonClass = dso.classes.clearButton,
    currentSegment = dso.classes.currentSegment,
    guide = dso.classes.guide,
    segment = dso.classes.segment,
    segmentPath = dso.classes.segmentPath,
    disabledSegmentPath = dso.classes.disabledSegmentPath,
  } = classes;

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
      options?.onDrawEnd?.(details);
    },
    ...otherOptions,
  });

  const api = signaturePad.connect(service, normalizeProps);
  return (
    <Div className={clsx(container)} {...api.getRootProps()}>
      {!designMode && (
        <Div className={clsx(canvas)} {...api.getControlProps()}>
          <svg className={clsx(segment)} {...api.getSegmentProps()}>
            {api.paths.map((path, i) => (
              <path
                className={clsx(
                  control.disabled ? disabledSegmentPath : segmentPath,
                )}
                key={i}
                {...api.getSegmentPathProps({ path })}
              />
            ))}
            {api.currentPath && (
              <path
                className={clsx(currentSegment)}
                {...api.getSegmentPathProps({ path: api.currentPath })}
              />
            )}
          </svg>
          <Button
            className={clsx(clearButtonClass)}
            {...api.getClearTriggerProps()}
            onClick={() => {
              api.getClearTriggerProps().onClick?.(null as any);
              if (options?.onClear) {
                options.onClear();
              }
            }}
          >
            {clearButton && (
              <I
                iconLibrary={clearButton.library}
                iconName={clearButton.name}
              />
            )}
          </Button>
          {!renderOptions.noGuideLine && (
            <Div className={clsx(guide)} {...api.getGuideProps()} />
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
      collection: true,
    },
  );
}

export function isSignatureRenderer(
  options: RenderOptions,
): options is SignatureRenderOptions {
  return options.type === "Signature";
}

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
