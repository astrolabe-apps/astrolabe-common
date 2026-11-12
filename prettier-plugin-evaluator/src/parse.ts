import { parser } from "@astroapps/evaluator";

type TreeCursor = ReturnType<ReturnType<typeof parser.parse>["cursor"]>;

export interface AlComment {
  // Source offset, which keeps comments in order as they move between nodes.
  from: number;
  text: string;
  block: boolean;
  // On its own line: after the node it trails, or before the node it leads.
  ownLine: boolean;
}

export interface AlNode {
  type: string;
  from: number;
  to: number;
  children: AlNode[];
  leading?: AlComment[];
  trailing?: AlComment[];
  // The source has a blank line between this node and the one before it.
  blankBefore?: boolean;
}

export interface AlRoot extends AlNode {
  source: string;
}

// Tokens printed from their parent's text, so comments can't hang off them.
const unattachable = new Set(["Call", "InterpolationStart"]);

// Nodes that end in a closing token or the end of the file. Other nodes pass a
// comment after their last child up to their parent, which can put it before
// the next token, such as a ternary's ?.
const closed = new Set([
  "EvalProgram",
  "ArgList",
  "ArrayExpression",
  "ObjectExpression",
  "ParenthesizedExpression",
  "Interpolation",
]);

export function parse(source: string): AlRoot {
  const cursor = parser.parse(source).cursor();
  return { ...toNode(cursor, source, []), source };
}

function toNode(cursor: TreeCursor, source: string, orphans: AlNode[]): AlNode {
  if (cursor.type.isError) throw syntaxError(source, cursor.from);
  const node: AlNode = {
    type: cursor.name,
    from: cursor.from,
    to: cursor.to,
    children: [],
  };
  if (cursor.firstChild()) {
    const comments: AlNode[] = [];
    do {
      const child = toNode(cursor, source, comments);
      if (isComment(child)) comments.push(child);
      else {
        const previous = node.children.at(-1);
        if (
          previous &&
          /\n[ \t]*\n/.test(source.slice(previous.to, child.from))
        )
          child.blankBefore = true;
        node.children.push(child);
      }
    } while (cursor.nextSibling());
    cursor.parent();
    comments.sort((a, b) => a.from - b.from);
    for (const comment of comments) attach(node, comment, source, orphans);
    liftLeading(node);
  }
  return node;
}

// An own-line comment can't follow a unary operator, so it moves above the
// operator. Leading comments then move up to the outermost node starting at
// the same place, outside any group that would break around them.
function liftLeading(node: AlNode) {
  const first = node.children[0];
  if (!first?.leading) return;
  const lifted =
    first.from === node.from
      ? first.leading
      : node.type === "UnaryExpression"
        ? first.leading.filter((c) => c.ownLine)
        : [];
  if (lifted.length === 0) return;
  const kept = first.leading.filter((c) => !lifted.includes(c));
  first.leading = kept.length ? kept : undefined;
  addLeading(node, ...lifted);
}

function addLeading(node: AlNode, ...comments: AlComment[]) {
  node.leading = [...(node.leading ?? []), ...comments].sort(
    (a, b) => a.from - b.from,
  );
}

function isComment(node: AlNode) {
  return node.type === "LineComment" || node.type === "BlockComment";
}

// A comment on the same line as the node before it trails that node;
// otherwise it leads the node after it, or trails the last node on its own line.
function attach(
  parent: AlNode,
  comment: AlNode,
  source: string,
  orphans: AlNode[],
) {
  const siblings = parent.children.filter((c) => !unattachable.has(c.type));
  const before = siblings.findLast((c) => c.to <= comment.from);
  const after = siblings.find((c) => c.from >= comment.to);
  const sameLine =
    before !== undefined &&
    !source.slice(before.to, comment.from).includes("\n");
  const { from } = comment;
  const text = source.slice(from, comment.to).trimEnd();
  const block = comment.type === "BlockComment";
  // A block comment followed on the same line by a node describes that node.
  const leadsNext =
    block &&
    after !== undefined &&
    !source.slice(comment.to, after.from).includes("\n");
  if (!after && !sameLine && !closed.has(parent.type)) orphans.push(comment);
  else if (before && (sameLine || !after) && !leadsNext)
    (before.trailing ??= []).push({ from, text, block, ownLine: !sameLine });
  else if (after) addLeading(after, { from, text, block, ownLine: !leadsNext });
  else
    throw syntaxError(source, comment.from, "Comment has nothing to attach to");
}

// Prettier shows a code frame for errors that carry a loc.
function syntaxError(source: string, offset: number, message = "Syntax error") {
  const before = source.slice(0, offset).split("\n");
  const start = {
    line: before.length,
    column: before[before.length - 1].length + 1,
  };
  return Object.assign(
    new SyntaxError(`${message} (${start.line}:${start.column})`),
    { loc: { start } },
  );
}
