"use client";
import {
  basicEnv,
  collectErrorsWithLocations,
  defaultCheckEnv,
  extractAllPaths,
  nativeType,
  parseEval,
  partialEnv,
  PartialEvalEnv,
  printExpr,
  printPath,
  toNative,
  toValue,
  ValueExpr,
} from "@astroapps/evaluator";
import {
  Fcheckbox,
  useControl,
  useControlEffect,
  useDebounced,
} from "@react-typed-forms/core";
import React, { useCallback, useState } from "react";
import sample from "./sample.json";
import { useApiClient } from "@astroapps/client";
import { EvalClient, EvalResult, ErrorWithLocation } from "../../client";
import { basicSetup, EditorView } from "codemirror";
import { evalCompletions, Evaluator } from "@astroapps/codemirror-evaluator";
import { autocompletion } from "@codemirror/autocomplete";
import { JsonEditor } from "@astroapps/schemas-editor";
import { IJsonModel, Layout, Model, TabNode } from "flexlayout-react";
import "flexlayout-react/style/light.css";

const layoutModel: IJsonModel = {
  global: {
    tabEnableClose: false,
  },
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "row",
        weight: 1,
        children: [
          {
            type: "tabset",
            children: [{ type: "tab", id: "editor", name: "Editor" }],
          },
          {
            type: "tabset",
            children: [{ type: "tab", id: "output", name: "Output" }],
          },
        ],
      },
      {
        type: "tabset",
        weight: 1,
        children: [{ type: "tab", id: "data", name: "Data" }],
      },
    ],
  },
};

export default function EvalPage() {
  const client = useApiClient(EvalClient);
  const serverMode = useControl(false);
  const showDeps = useControl(false);
  const partialEvalMode = useControl(false);
  const input = useControl("");
  const data = useControl(sample);
  const dataText = useControl(() => JSON.stringify(sample, null, 2));
  const outputJson = useControl<string>("");
  const editor = useControl<EditorView>();
  const [model] = useState(() => Model.fromJson(layoutModel));
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
    () =>
      [
        input.value,
        data.value,
        serverMode.value,
        showDeps.value,
        partialEvalMode.value,
      ] as const,
    useDebounced(
      async ([v, dv, sm, showDeps, partialMode]: [
        string,
        any,
        any,
        boolean,
        boolean,
      ]) => {
        try {
          if (sm) {
            try {
              setEvalResult(
                await client.eval(showDeps, partialMode, {
                  expression: v,
                  data: dv,
                }),
              );
            } catch (e) {
              setOutput(e);
            }
          } else if (partialMode) {
            // Partial evaluation mode - treat data fields as variables
            try {
              const exprTree = parseEval(v);
              // Create variables from data fields instead of data context
              const variables = Object.fromEntries(
                Object.entries(dv).map((x) => [x[0], toValue(undefined, x[1])]),
              );
              const env = partialEnv().newScope(variables) as PartialEvalEnv;
              const partialResult = env.uninline(env.evaluateExpr(exprTree));
              setEvalResult({
                result: printExpr(partialResult),
                errors: collectErrorsWithLocations(partialResult) as ErrorWithLocation[],
              });
            } catch (e) {
              console.error(e);
              setOutput(e);
            }
          } else {
            const exprTree = parseEval(v);
            const env = basicEnv(dv);
            try {
              const value = env.evaluateExpr(exprTree) as ValueExpr;
              setEvalResult({
                result: showDeps ? toValueDeps(value) : toNative(value),
                errors: collectErrorsWithLocations(value) as ErrorWithLocation[],
              });
            } catch (e) {
              console.error(e);
              setOutput(e);
            }
          }
        } catch (e) {
          console.error(e);
        }
      },
      1000,
    ),
  );
  const editorRef = useCallback(setupEditor, [editor]);

  function renderTab(node: TabNode) {
    const id = node.getId();
    switch (id) {
      case "editor":
        return (
          <div className="flex flex-col h-full">
            <div className="p-2">
              <div className="flex gap-2 items-center">
                <Fcheckbox control={serverMode} /> Server Mode
                <Fcheckbox control={showDeps} /> Show Deps
                <Fcheckbox control={partialEvalMode} /> Partial Eval
              </div>
            </div>
            <div className="flex-1 overflow-y-scroll">
              <div ref={editorRef} />
            </div>
          </div>
        );
      case "output":
        return (
          <div className="h-full overflow-y-scroll">
            <JsonEditor control={outputJson} />
          </div>
        );
      case "data":
        return (
          <div className="h-full overflow-y-scroll">
            <JsonEditor control={dataText} />
          </div>
        );
      default:
        return <div>Unknown panel</div>;
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <Layout model={model} factory={renderTab} />
    </div>
  );

  function setEvalResult(result: EvalResult) {
    setOutput(result);
  }

  function setOutput(output: any) {
    outputJson.value = JSON.stringify(output, null, 2);
  }

  function setupEditor(elem: HTMLElement | null) {
    if (elem) {
      let updateListenerExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          input.value = update.state.doc.toString();
        }
      });

      editor.value = new EditorView({
        doc: input.value,
        extensions: [
          basicSetup,
          Evaluator(),
          autocompletion({
            override: [
              evalCompletions(() => ({
                ...defaultCheckEnv,
                dataType: nativeType(sample),
              })),
            ],
          }),
          updateListenerExtension,
        ],
        parent: elem,
      });
    } else {
      editor.value?.destroy();
    }
  }
}

function toValueDeps({ value, path, deps }: ValueExpr): unknown {
  let converted: unknown = value;
  if (Array.isArray(value)) {
    converted = value.map(toValueDeps);
  } else if (
    typeof value === "object" &&
    value != null &&
    !Array.isArray(value)
  ) {
    const objValue = value as Record<string, ValueExpr>;
    const result: Record<string, unknown> = {};
    for (const key in objValue) {
      result[key] = toValueDeps(objValue[key]);
    }
    converted = result;
  }
  return {
    value: converted,
    path: path ? printPath(path) : undefined,
    deps: deps?.flatMap(extractAllPaths).map(printPath),
  };
}
