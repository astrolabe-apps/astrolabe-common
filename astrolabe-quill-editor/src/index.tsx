import { Control } from "@react-typed-forms/core";
import React, { useRef } from "react";
import ReactQuill from "react-quill-new";
import { createDataRenderer, DataRenderType } from "@react-typed-forms/schemas";

interface QuillOptions {
  modules?: {
    [key: string]: any;
  };
  theme?: string;
}

export const DefaultQuillModules = {
  toolbar: {
    container: [
      ["bold", "italic", "underline", "strike"], // toggled buttons
      ["blockquote", "code-block"],

      [{ header: 1 }, { header: 2 }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ direction: "rtl" }],

      [{ size: ["small", false, "large", "huge"] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["image"],
      ["link"],
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],
      ["clean"],
    ],
  },
};

export function createQuillEditor(
  ReactQuill: React.ComponentType<ReactQuill.ReactQuillProps>,
  options?: QuillOptions,
) {
  return createDataRenderer(
    ({ control, readonly }) => (
      <HtmlEditor
        state={control.as()}
        ReactQuill={ReactQuill}
        readonly={readonly}
        options={options}
      />
    ),
    { renderType: DataRenderType.HtmlEditor },
  );
}

export function HtmlEditor({
  state,
  readonly,
  ReactQuill,
  className,
  options,
}: {
  className?: string;
  readonly?: boolean;
  state: Control<string | null | undefined>;
  ReactQuill: React.ComponentType<ReactQuill.ReactQuillProps>;
  options?: QuillOptions;
}) {
  const { modules, theme } = {
    modules: DefaultQuillModules,
    theme: "snow",
    ...(options ?? {}),
  };
  const stateRef = useRef(state);
  return (
    <div>
      {state.disabled || readonly ? (
        <div
          className="ql-container ql-snow ql-editor"
          dangerouslySetInnerHTML={{ __html: state.value || "" }}
        />
      ) : (
        <ReactQuill
          modules={modules}
          theme={theme}
          value={state.value || ""}
          onChange={(v) => {
            stateRef.current.value = v;
          }}
          className={className}
        />
      )}
    </div>
  );
}
