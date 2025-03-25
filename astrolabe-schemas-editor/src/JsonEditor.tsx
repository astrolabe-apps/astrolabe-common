import { Control, useControl, useControlEffect } from "@react-typed-forms/core";
import { basicSetup, EditorView } from "codemirror";
import React, { useCallback, useRef } from "react";
import { json } from "@codemirror/lang-json";

export function JsonEditor({
  control,
  className,
}: {
  className?: string;
  control: Control<string>;
}) {
  const editor = useControl<EditorView>();
  const editorRef = useCallback(setupEditor, [editor]);
  const docString = useRef("");

  useControlEffect(
    () => control.value,
    (x) => {
      const ed = editor.current.value;
      if (ed && x !== docString.current) {
        ed.dispatch({
          changes: { from: 0, to: ed.state.doc.length, insert: x },
        });
      }
    },
  );
  return (
    <div className={className}>
      <div className="h-full overflow-auto" ref={editorRef} />
    </div>
  );

  function setupEditor(elem: HTMLElement | null) {
    if (elem) {
      let updateListenerExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          docString.current = update.state.doc.toString();
          control.value = docString.current;
        }
      });

      editor.value = new EditorView({
        doc: control.value,
        extensions: [basicSetup, updateListenerExtension, json()],
        parent: elem,
      });
    } else {
      editor.value?.destroy();
    }
  }
}
