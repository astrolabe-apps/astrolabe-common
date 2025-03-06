import { parser } from "./parser";
import { SyntaxNode, Tree } from "@lezer/common";
import {
  arrayExpr,
  callExpr,
  EvalExpr,
  lambdaExpr,
  letExpr,
  propertyExpr,
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
  getNodeText: (n: SyntaxNode) => string,
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
        const quoted = getNodeText(node);
        return valueExpr(quoted.substring(1, quoted.length - 1));
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
