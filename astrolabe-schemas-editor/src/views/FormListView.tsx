import { FormInfo, ViewContext } from "./index";
import useResizeObserver from "use-resize-observer";
import { Tree } from "react-arborist";
import React from "react";

export function FormListView({ context }: { context: ViewContext }) {
  const { ref, width, height } = useResizeObserver();
  return (
    <div ref={ref}>
      <Tree<FormInfo>
        width={width}
        height={height}
        data={context.formList}
        onSelect={(n) => {
          const formId = n[0]?.data.id;
          context.currentForm.value = formId;
          if (formId) context.openForm(formId);
        }}
        selection={context.currentForm.value}
      />
    </div>
  );
}
