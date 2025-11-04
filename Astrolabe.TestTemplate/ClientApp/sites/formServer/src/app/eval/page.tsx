"use client";
import {
  addDefaults,
  BasicEvalEnv,
  defaultCheckEnv,
  defaultEvaluate,
  emptyEnvState,
  EnvValue,
  EvalEnvState,
  EvalExpr,
  extractAllPaths,
  nativeType,
  parseEval,
  printPath,
  toNative,
  ValueExpr,
} from "@astroapps/evaluator";
import {
  Fcheckbox,
  useControl,
  useControlEffect,
  useDebounced,
} from "@react-typed-forms/core";
import React, { useCallback } from "react";
import sample from "./sample.json";
import { useApiClient } from "@astroapps/client";
import { EvalClient, EvalResult } from "../../client";
import { basicSetup, EditorView } from "codemirror";
import { Evaluator } from "@astroapps/codemirror-evaluator";
import { autocompletion } from "@codemirror/autocomplete";
import { evalCompletions } from "@astroapps/codemirror-evaluator";
import { JsonEditor } from "@astroapps/schemas-editor";

export default function EvalPage() {
  const client = useApiClient(EvalClient);
  const serverMode = useControl(false);
  const showDeps = useControl(false);
  const input = useControl("");
  const data = useControl(sample);
  const dataText = useControl(() => JSON.stringify(sample, null, 2));
  const outputJson = useControl<string>("");
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
    () => [input.value, data.value, serverMode.value, showDeps.value] as const,
    useDebounced(async ([v, dv, sm, showDeps]: [string, any, any, boolean]) => {
      try {
        if (sm) {
          try {
            setEvalResult(
              await client.eval(showDeps, { expression: v, data: dv }),
            );
          } catch (e) {
            setOutput(e);
          }
        } else {
          const exprTree = parseEval(v);
          const emptyState = emptyEnvState(dv);
          const env = addDefaults(new TrackDataEnv(emptyState));
          try {
            const [outEnv, value] = env.evaluate(exprTree);
            setEvalResult({
              result: showDeps ? toValueDeps(value) : toNative(value),
              errors: outEnv.errors,
            });
          } catch (e) {
            console.error(e);
            setOutput(e);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000),
  );
  const editorRef = useCallback(setupEditor, [editor]);
  return (
    <div className="h-screen flex flex-col">
      <div className="grow flex">
        <div className="basis-1/2 flex flex-col h-screen">
          <div>
            <div className="flex gap-2 items-center">
              <Fcheckbox control={serverMode} /> Server Mode
              <Fcheckbox control={showDeps} /> Show Deps
            </div>
          </div>
          <div className="basis-1/2 overflow-y-scroll">
            <div ref={editorRef} />
          </div>
          <div className="basis-1/2 overflow-y-scroll">
            <JsonEditor control={outputJson} />
          </div>
        </div>
        <div className="basis-1/2 flex flex-col">
          <div className="basis-1 grow overflow-y-scroll">
            <JsonEditor control={dataText} />
          </div>
        </div>
      </div>
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

class TrackDataEnv extends BasicEvalEnv {
  constructor(state: EvalEnvState) {
    super(state);
  }
  protected newEnv(newState: EvalEnvState): BasicEvalEnv {
    return new TrackDataEnv(newState);
  }

  evaluate(expr: EvalExpr): EnvValue<ValueExpr> {
    switch (expr.type) {
      case "value":
        if (expr.path) console.log(printPath(expr.path));
        return [this, expr];
      default:
        return defaultEvaluate(this, expr);
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
