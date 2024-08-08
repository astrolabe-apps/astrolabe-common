import { parser } from "./parser";
import { SyntaxNode } from "@lezer/common";
import {
  callExpr,
  EvalExpr,
  lambdaExpr,
  letExpr,
  propertyExpr,
  segmentPath,
  valueExpr,
  VarExpr,
  varExpr,
} from "./nodes";

export function parseEval(input: string) {
  const parseTree = parser.parse(input);
  return visit(parseTree.topNode);

  function visit(node: SyntaxNode | null): EvalExpr {
    if (node == null) throw "Couldn't find node";
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
      case "BooleanLiteral":
        return valueExpr(getNodeText(node) === "true");
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
        return propertyExpr(input.substring(node.from, node.to));
      case "BinaryExpression":
        const callNode = node.getChild("Call")!;
        return callExpr(
          input.substring(callNode.from, callNode.to),
          node.getChildren("Expression").map(visit),
        );
      case "ConditionalExpression":
        return callExpr("?", node.getChildren("Expression").map(visit));
      default:
        throw "Don't know what to do with:" + nodeName;
    }
    // return {
    //   type: "path",
    //   path: segmentPath(input.substring(node.from, node.to)),
    // };
  }

  function getNodeText(node: SyntaxNode) {
    return input.substring(node.from, node.to);
  }
}
