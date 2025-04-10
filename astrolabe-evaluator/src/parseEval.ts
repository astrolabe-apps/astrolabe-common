import { parser } from "./parser";
import { SyntaxNode, Tree } from "@lezer/common";
import {
  arrayExpr,
  callExpr,
  EvalExpr,
  lambdaExpr,
  letExpr,
  propertyExpr,
  ValueExpr,
  valueExpr,
  VarExpr,
  varExpr,
} from "./ast";

export function parseEval(input: string) {
  const parseTree = parser.parse(input);
  return convertTree(parseTree, (node) => input.substring(node.from, node.to));
}

export function convertTree(
  parseTree: Tree,
  getNodeText: (n: { from: number; to: number }) => string,
): EvalExpr {
  return visit(parseTree.topNode);

  function visit(node: SyntaxNode | null): EvalExpr {
    if (node == null) return valueExpr(null);
    const nodeName = node.type.name;
    switch (nodeName) {
      case "ParenthesizedExpression":
      case "EvalProgram":
        return visit(node.getChild("Expression"));
      case "Reference":
        return varExpr(getNodeText(node).substring(1));
      case "LetExpression":
        const assignments = node.getChildren("VariableAssignment");
        return letExpr(
          assignments.map((a) => {
            const [assign, expr] = a.getChildren("Expression");
            return [(visit(assign) as VarExpr).variable, visit(expr)];
          }),
          visit(node.getChild("Expression")),
        );
      case "Lambda":
        const [v, e] = node.getChildren("Expression").map(visit);
        return lambdaExpr((v as VarExpr).variable, e);
      case "ConstantLiteral":
        const constText = getNodeText(node);
        return valueExpr(
          constText === "true" ? true : constText === "false" ? false : null,
        );
      case "UnaryExpression":
        const expr = visit(node.getChild("Expression"));
        switch (getNodeText(node).charAt(0)) {
          case "!":
            return callExpr("!", [expr]);
          case "+":
            return expr;
          case "-":
            return callExpr("-", [valueExpr(0), expr]);
        }
        throw new Error("Unknown unary: " + getNodeText(node));
      case "CallExpression":
        const func = visit(node.getChild("Expression"));
        const args = node
          .getChild("ArgList")!
          .getChildren("Expression")
          .map(visit);
        return callExpr((func as VarExpr).variable, args);
      case "Number":
        return valueExpr(parseFloat(getNodeText(node)));
      case "String":
        return unescapeString(
          getNodeText({ from: node.from + 1, to: node.to - 1 }),
        );
      case "TemplateString":
        const parts = [];
        let textOffset = node.from + 1;
        let child = node.firstChild;
        while (child) {
          const childStart = child.from;
          if (textOffset < childStart) {
            parts.push(
              unescapeString(getNodeText({ from: textOffset, to: childStart })),
            );
          }
          textOffset = child.to;
          if (child.type.name === "Interpolation") {
            // Expression inside curly braces
            parts.push(visit(child.getChild("Expression")));
          }
          child = child.nextSibling;
        }
        if (textOffset < node.to - 1) {
          parts.push(
            unescapeString(getNodeText({ from: textOffset, to: node.to - 1 })),
          );
        }
        if (parts.length === 0) return valueExpr("");

        // If there's only one part, return it directly
        if (parts.length === 1) return parts[0];

        // Otherwise, concatenate all parts using string conversion
        return callExpr("string", parts);

      case "Identifier":
        return propertyExpr(getNodeText(node));
      case "ArrayExpression":
        return arrayExpr(node.getChildren("Expression").map(visit));
      case "ObjectExpression":
        return callExpr(
          "object",
          node
            .getChildren("FieldExpression")
            .flatMap((x) => x.getChildren("Expression").map(visit)),
        );
      case "BinaryExpression":
        const callNode = node.getChild("Call")!;
        return callExpr(
          getNodeText(callNode),
          node.getChildren("Expression").map(visit),
        );
      case "ConditionalExpression":
        return callExpr("?", node.getChildren("Expression").map(visit));
      default:
        throw "Don't know what to do with:" + nodeName;
    }
  }
}

function unescapeString(str: string): ValueExpr {
  return valueExpr(unescapeJsString(str));
}

/**
 * Unescapes a JavaScript-style escaped string.
 * Handles common escape sequences like \n, \t, \", \\, \x## (hex), \u#### (unicode),
 * and \u{######} (extended unicode).
 *
 * @param str The escaped string to unescape
 * @returns The unescaped string
 */
function unescapeJsString(str: string): string {
  return str.replace(
    /\\(u\{([0-9A-Fa-f]+)\}|u([0-9A-Fa-f]{4})|x([0-9A-Fa-f]{2})|([0-7]{1,3})|.)/g,
    (match, escaped) => {
      // Handle different escape types
      if (escaped[0] === "u" && escaped[1] === "{") {
        // Extended unicode escape: \u{XXXXXX}
        return String.fromCodePoint(parseInt(escaped.slice(2, -1), 16));
      } else if (escaped[0] === "u") {
        // Unicode escape: \uXXXX
        return String.fromCharCode(parseInt(escaped.slice(1), 16));
      } else if (escaped[0] === "x") {
        // Hex escape: \xXX
        return String.fromCharCode(parseInt(escaped.slice(1), 16));
      } else if (/^[0-7]+$/.test(escaped)) {
        // Octal escape: \NNN
        return String.fromCharCode(parseInt(escaped, 8));
      } else {
        // Common escapes
        const escapeMap: Record<string, string> = {
          n: "\n", // newline
          r: "\r", // carriage return
          t: "\t", // tab
          b: "\b", // backspace
          f: "\f", // form feed
          v: "\v", // vertical tab
          "0": "\0", // null character
          "'": "'", // single quote
          '"': '"', // double quote
          "\\": "\\", // backslash
        };
        return escapeMap[escaped] || escaped;
      }
    },
  );
}
