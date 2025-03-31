import { normalizeProps, useMachine } from "@zag-js/react";
import * as signaturePad from "@zag-js/signature-pad";
import { useId, useState } from "react";

export function SignatureRenderer() {
  const service = useMachine(signaturePad.machine, {
    id: useId(),
  });

  const api = signaturePad.connect(service, normalizeProps);

  return (
    <div {...api.getRootProps()}>
      <label {...api.getLabelProps()}>Signature Pad</label>

      <div {...api.getControlProps()}>
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
