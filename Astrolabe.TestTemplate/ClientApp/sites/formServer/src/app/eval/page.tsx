"use client";
import {
  basicEnv,
  evaluate,
  flatmapEnv,
  parseEval,
  printExpr,
  resolve,
} from "@astroapps/evaluator";
import {
  Fcheckbox,
  useControl,
  useControlEffect,
  useDebounced,
} from "@react-typed-forms/core";
import React, { useCallback } from "react";
import sample from "./sample.json";
import { useApiClient } from "@astroapps/client/hooks/useApiClient";
import { Client } from "../../client";
import { basicSetup, EditorView } from "codemirror";
import { Evaluator } from "@astroapps/codemirror-evaluator";

export default function EvalPage() {
  const client = useApiClient(Client);
  const serverMode = useControl(false);
  const input = useControl("");
  const data = useControl(sample);
  const dataText = useControl(() => JSON.stringify(sample, null, 2));
  const output = useControl<any>();
  const editor = useControl<EditorView>();
  useControlEffect(
    () => dataText.value,
    (v) => {
      try {
        data.value = JSON.parse(v);
      } catch (e) {
        console.error(e);
      }
    },
  );
  useControlEffect(
    () => [input.value, data.value, serverMode.value] as const,
    useDebounced(async ([v, dv, sm]: [string, any, any]) => {
      try {
        if (sm) {
          const result = await client.eval({ expression: v, data: dv });
          output.value = result;
        } else {
          const exprTree = parseEval(v);

          const resolved = resolve(basicEnv(dv), exprTree);
          console.log(printExpr(resolved[1]));
          let result;
          try {
            result = flatmapEnv(resolved, evaluate)[1];
          } catch (e) {
            console.error(e);
            result = e?.toString();
          }
          output.value = result;
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000),
  );
  const editorRef = useCallback(setupEditor, [editor]);
  return (
    <div className="h-screen flex flex-col">
      <div>
        <Fcheckbox control={serverMode} /> Server Mode
      </div>
      <div className="flex grow">
        <div className="w-80 grow" ref={editorRef} />
        <textarea
          className="grow"
          value={dataText.value}
          onChange={(e) => (dataText.value = e.target.value)}
        />
        <textarea
          className="grow"
          value={JSON.stringify(output.value, null, 2)}
        />
      </div>
    </div>
  );

  function setupEditor(elem: HTMLElement | null) {
    if (elem) {
      let updateListenerExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          input.value = update.state.doc.toString();
        }
      });

      editor.value = new EditorView({
        doc: input.value,
        extensions: [basicSetup, Evaluator(), updateListenerExtension],
        parent: elem,
      });
    } else {
      editor.value?.destroy();
    }
  }
}
