"use client";
import {
  addDefaults,
  BasicEvalEnv,
  defaultEvaluate,
  emptyEnvState,
  EnvValue,
  EvalEnvState,
  EvalExpr,
  parseEval,
  printPath,
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
import { useApiClient } from "@astroapps/client/hooks/useApiClient";
import { Client, EvalResult } from "../../client";
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
          try {
            setEvalResult(await client.eval({ expression: v, data: dv }));
          } catch (e) {
            output.value = e;
          }
        } else {
          const exprTree = parseEval(v);
          const emptyState = emptyEnvState(dv);
          const env = addDefaults(new TrackDataEnv(emptyState));
          try {
            const [outEnv, value] = env.evaluate(exprTree);
            setEvalResult({
              result: toValueDeps(value),
              errors: outEnv.errors,
            });
          } catch (e) {
            console.error(e);
            output.value = e;
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
      </div>
      <textarea
        className="grow"
        value={JSON.stringify(output.value, null, 2)}
      />
    </div>
  );

  function setEvalResult(result: EvalResult) {
    output.value =
      result.errors && result.errors.length > 0 ? result : result.result;
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
        extensions: [basicSetup, Evaluator(), updateListenerExtension],
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

function toValueDeps({ value, path, deps }: ValueExpr): {
  value: unknown;
  path?: string;
  deps?: string[];
} {
  const val = Array.isArray(value) ? value.map(toValueDeps) : value;
  return {
    value: val,
    path: path ? printPath(path) : undefined,
    deps: deps?.map(printPath),
  };
}
