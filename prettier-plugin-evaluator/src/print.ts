import type { Doc } from "prettier";
import * as doc from "prettier/doc";
import type { AlComment, AlNode, AlRoot } from "./parse.ts";

const {
  breakParent,
  group,
  hardline,
  ifBreak,
  indent,
  join,
  line,
  lineSuffix,
  softline,
} = doc.builders;

const atoms = new Set([
  "Reference",
  "Identifier",
  "Number",
  "String",
  "ConstantLiteral",
]);

const precedence: Record<string, number> = {
  "*": 1,
  "/": 1,
  "%": 1,
  "+": 2,
  "-": 2,
  "<": 3,
  ">": 3,
  "=": 3,
  "!=": 3,
  "<=": 3,
  ">=": 3,
  and: 4,
  or: 5,
  "??": 6,
};

const closers = new Set([")", "]", "}"]);

function isEmpty(d: Doc): boolean {
  return d === "" || (Array.isArray(d) && d.every(isEmpty));
}

// Soft line breaks print as if the group fit; comments still break.
function flat(printed: Doc): Doc {
  return doc.utils.mapDoc(printed, (d) =>
    typeof d === "object" && "type" in d && d.type === "line" && !d.hard
      ? d.soft
        ? ""
        : " "
      : d,
  );
}

export function printRoot(root: AlRoot): Doc {
  const text = (n: AlNode) => root.source.slice(n.from, n.to);

  const breaksBetween = (from: number, to: number) =>
    root.source.slice(from, to).includes("\n");

  // Items separated by commas. A blank line in the source is kept, and keeps
  // the list broken.
  function printItems(
    items: AlNode[],
    printItem: (n: AlNode, i: number) => Doc = print,
  ) {
    return items.map((n, i) =>
      i === 0
        ? printItem(n, i)
        : [
            ",",
            line,
            n.blankBefore ? [softline, breakParent] : "",
            printItem(n, i),
          ],
    );
  }

  function printList(open: string, items: AlNode[], close: string): Doc {
    if (items.length === 0) return open + close;
    // Breaking $string($x) over three lines never helps.
    if (items.length === 1 && atoms.has(items[0].type) && !items[0].leading)
      return [open, print(items[0]), close];
    return group([
      open,
      indent([softline, printItems(items)]),
      softline,
      close,
    ]);
  }

  function printBinary(node: AlNode): Doc {
    const [left, op, right] = node.children;
    switch (text(op)) {
      case ".":
        return [print(left), ".", print(right)];
      case "[":
        return [print(left), "[", print(right), "]"];
    }
    // Flatten a left-nested chain of the same precedence: a + b - c
    const level = precedence[text(op)];
    const links: [string, AlNode][] = [];
    let head = node;
    do {
      const [l, o, r] = head.children;
      links.unshift([text(o), r]);
      head = l;
    } while (isChainLink(head, level));
    const rest: Doc[] = [];
    let previous = head;
    let previousBare = printBare(head);
    const printedHead = printWithBare(head, previousBare);
    for (const [operator, operand] of links) {
      // After an operand that ends on its own line, such as a multi-line
      // $which(...), the operator follows its closing bracket: ) ?? 0
      const separator = separatorAfter(previous, previousBare);
      const bare = printBare(operand);
      rest.push([" ", operator, separator, printWithBare(operand, bare)]);
      previous = operand;
      previousBare = bare;
    }
    return group([printedHead, indent(rest)]);
  }

  // A line comment after the node doesn't count: the operator must stay before it.
  function separatorAfter(node: AlNode, bare: Doc): Doc {
    if (node.trailing) return line;
    if (doc.utils.willBreak(bare)) return " ";
    // A bracketed operand may still break for width.
    const brackets = closingGroup(bare);
    if (!brackets) return line;
    brackets.id ??= Symbol("operand");
    return ifBreak(" ", line, { groupId: brackets.id });
  }

  // The group the doc ends with, if that group ends in a closing bracket.
  function closingGroup(d: Doc): doc.builders.Group | undefined {
    while (Array.isArray(d)) d = d.findLast((part) => !isEmpty(part)) ?? "";
    if (typeof d !== "object" || d.type !== "group") return undefined;
    const contents = d.contents;
    const last = Array.isArray(contents)
      ? contents.findLast((part) => !isEmpty(part))
      : contents;
    return typeof last === "string" && closers.has(last) ? d : undefined;
  }

  function isChainLink(node: AlNode, level: number) {
    return (
      node.type === "BinaryExpression" &&
      precedence[text(node.children[1])] === level &&
      !node.leading &&
      !node.trailing
    );
  }

  // $which(subject, key, value, key, value, ..., default?) reads as a table.
  function printWhich(args: AlNode): Doc {
    const [subject, ...rest] = args.children;
    const keys = rest.filter((_, i) => i % 2 === 0);
    const printRow = (key: AlNode, row: number) => {
      const value = rest[row * 2 + 1];
      if (!value) return print(key);
      if (value.leading)
        return [print(key), ",", indent([hardline, print(value)])];
      return [print(key), ", ", print(value)];
    };
    return group(
      [
        "$which(",
        leadsOwnLine(subject)
          ? indent([hardline, print(subject)])
          : print(subject),
        ",",
        indent([line, printItems(keys, printRow)]),
        softline,
        ")",
      ],
      { shouldBreak: breaksBetween(subject.to, rest[0].from) },
    );
  }

  // An else-if chain reads like a switch: a ? x : b ? y : z
  function printConditional(node: AlNode): Doc {
    const [test, consequent, alternate] = node.children;
    const links: Doc[] = [];
    let last = alternate;
    while (
      last.type === "ConditionalExpression" &&
      !last.leading &&
      !last.trailing &&
      // A commented true branch needs its own ? line, so stop the chain.
      !last.children[1].leading
    ) {
      const [t, c, a] = last.children;
      links.push([line, ": ", print(t), " ? ", printBranch(c)]);
      last = a;
    }
    return group([
      print(test),
      indent([
        line,
        printLeading(consequent),
        "? ",
        printBranch(consequent),
        links,
        line,
        printLeading(last),
        ": ",
        printUnled(last),
      ]),
    ]);
  }

  // Callers print the branch's leading comments above its ? token.
  function printBranch(node: AlNode): Doc {
    return node.type === "ConditionalExpression"
      ? ["(", printUnled(node), ")"]
      : printUnled(node);
  }

  function printLeading(node: AlNode): Doc {
    return printComments(node.leading ?? []);
  }

  // An own-line comment can't follow an opening token, so it starts a block.
  function leadsOwnLine(node: AlNode) {
    return node.leading?.some((c) => c.ownLine) ?? false;
  }

  function printBracketed(open: string, node: AlNode, close: string): Doc {
    return leadsOwnLine(node)
      ? [open, indent([hardline, print(node)]), hardline, close]
      : [open, print(node), close];
  }

  function printComments(comments: AlComment[]): Doc {
    return comments.map((c) => [
      c.text,
      c.block && !c.ownLine ? " " : hardline,
    ]);
  }

  function printTrailing(node: AlNode): Doc {
    return (node.trailing ?? []).map((c) =>
      // Deferred to the end of the line, so code never follows a comment.
      c.ownLine
        ? [lineSuffix([hardline, c.text]), breakParent]
        : c.block
          ? [" ", c.text]
          : [lineSuffix(" " + c.text), breakParent],
    );
  }

  // The node without its leading comments, for callers that place them.
  function printUnled(node: AlNode): Doc {
    return [printBare(node), printTrailing(node)];
  }

  // print() for a caller that already has the node's bare doc.
  function printWithBare(node: AlNode, bare: Doc): Doc {
    return [printLeading(node), bare, printTrailing(node)];
  }

  function printTemplate(node: AlNode): Doc {
    const parts: Doc[] = [];
    let pos = node.from;
    for (const interpolation of node.children) {
      const [, expression] = interpolation.children;
      parts.push(root.source.slice(pos, interpolation.from));
      parts.push(flat(printBracketed("{", expression, "}")));
      pos = interpolation.to;
    }
    parts.push(root.source.slice(pos, node.to));
    return parts;
  }

  function print(node: AlNode): Doc {
    return [printLeading(node), printUnled(node)];
  }

  function printBare(node: AlNode): Doc {
    const children = node.children;
    const [first, second, third] = children;
    switch (node.type) {
      case "EvalProgram":
        return [print(first), hardline];
      case "BinaryExpression":
        return printBinary(node);
      case "UnaryExpression":
        return [root.source[node.from], print(first)];
      case "ParenthesizedExpression":
        return printBracketed("(", first, ")");
      case "ConditionalExpression":
        return printConditional(node);
      case "CallExpression":
        return text(first) === "$which" && second.children.length > 1
          ? printWhich(second)
          : [print(first), print(second)];
      case "ArgList":
        return printList("(", children, ")");
      case "ArrayExpression":
        return printList("[", children, "]");
      case "ObjectExpression":
        // Like Prettier for JS: a break after { keeps the object expanded.
        return children.length === 0
          ? "{}"
          : group(["{", indent([line, printItems(children)]), line, "}"], {
              shouldBreak: breaksBetween(node.from, first.from),
            });
      case "FieldExpression":
        return [print(first), ": ", print(second)];
      case "Lambda":
        return [print(first), " => ", print(second)];
      case "LetExpression": {
        // Own-line comments on the body go above its in.
        const body = children[children.length - 1];
        const comments = body.leading ?? [];
        return group([
          "let",
          indent([line, printItems(children.slice(0, -1))]),
          line,
          printComments(comments.filter((c) => c.ownLine)),
          "in ",
          printComments(comments.filter((c) => !c.ownLine)),
          printUnled(body),
        ]);
      }
      case "VariableAssignment":
        return [print(first), " := ", print(second)];
      case "TemplateString":
        return printTemplate(node);
      default:
        return text(node);
    }
  }

  return print(root);
}
