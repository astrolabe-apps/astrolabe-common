import {
  CheckEnv,
  isFunctionType,
  isObjectType,
  parseEval,
  parser,
  typeCheck,
} from "@astroapps/evaluator";
import {
  delimitedIndent,
  foldInside,
  foldNodeProp,
  indentNodeProp,
  LanguageSupport,
  LRLanguage,
  syntaxTree,
} from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { Diagnostic, linter } from "@codemirror/lint";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

export const EvalLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: delimitedIndent({ closing: ")", align: false }),
      }),
      foldNodeProp.add({
        Application: foldInside,
      }),
      styleTags({
        Reference: t.definition(t.variableName),
        ConstantLiteral: t.bool,
        String: t.string,
        Number: t.number,
        LineComment: t.lineComment,
        BlockComment: t.blockComment,
        "( )": t.paren,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
  },
});

const syntaxLinter = linter((view) => {
  let diagnostics: Diagnostic[] = [];
  syntaxTree(view.state)
    .cursor()
    .iterate((node) => {
      if (node.type.isError)
        diagnostics.push({
          from: node.from,
          to: node.to,
          severity: "error",
          message: "Syntax error",
        });
    });
  return diagnostics;
});

const isLetter = /^[a-zA-Z]/;

export function evalCompletions(
  getCheckEnv: () => CheckEnv,
): (context: CompletionContext) => CompletionResult | null {
  return (context) => {
    let word = context.matchBefore(/\$?\w*/);
    if (!word || (word.from == word.to && !context.explicit)) return null;
    const outAst = parseEval(context.state.sliceDoc(0, word.from));
    const {
      env: { vars, dataType },
    } = typeCheck(getCheckEnv(), outAst);

    const dataCompletions = isObjectType(dataType)
      ? Object.entries(dataType.fields).map(([label, t]) => ({
          label,
          type: "text",
          detail: "(" + t.type + ")",
          boost: 1,
        }))
      : [];
    const varCompletions = word.text.startsWith("$")
      ? Object.entries(vars)
          .filter((x) => x[0].match(isLetter))
          .map(([label, t]) => ({
            label: "$" + label,
            type: isFunctionType(t) ? "function" : "variable",
            detail: "(" + t.type + ")",
          }))
      : [];

    return {
      from: word.from,
      options: [...dataCompletions, ...varCompletions],
    };
  };
}

export function Evaluator() {
  return new LanguageSupport(EvalLanguage, syntaxLinter);
}
