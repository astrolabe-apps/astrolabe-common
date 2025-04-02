import { Snippet, ViewContext } from "./index";
import React from "react";
import { Control, controlNotNull } from "@react-typed-forms/core";
import { InactiveView } from "./InactiveView";
import { ControlDefinition } from "@react-typed-forms/schemas";
import useResizeObserver from "use-resize-observer";
import { NodeRendererProps, Tree } from "react-arborist";
import { StdTreeNode } from "../StdTreeNode";
import clsx from "clsx";
import { SelectedControlNode } from "../types";
import { EditorFormTree } from "../EditorFormTree";

interface SnippetTreeNode {
  id: string;
  name: string;
  snippet?: Snippet;
  onAdd?: (node: ControlDefinition) => void;
  children?: SnippetTreeNode[];
}

interface SnippetsTreeProps {
  snippets: Snippet[];
  selectedControl: Control<SelectedControlNode | undefined>;
  selectedControlId: Control<string | undefined>;
  tree: EditorFormTree;
}

export function SnippetsView({ context }: { context: ViewContext }) {
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;

  const {
    selectedControl,
    selectedControlId,
    formTree: { value: tree },
  } = cf.fields;

  const snippets = context.snippets ?? [];

  return (
    <SnippetsTree
      snippets={snippets}
      selectedControl={selectedControl}
      selectedControlId={selectedControlId}
      tree={tree}
    />
  );
}

function SnippetsTree({
  snippets,
  selectedControl,
  selectedControlId,
  tree,
}: SnippetsTreeProps) {
  const { ref, width, height } = useResizeObserver();

  return (
    <div ref={ref}>
      <Tree<SnippetTreeNode>
        width={width}
        height={height}
        data={toSnippetTreeNode(snippets)}
        children={(p) => SnippetTreeNode(p, onAdd)}
      />
    </div>
  );

  function onAdd(d?: ControlDefinition) {
    if (!d) return;

    const v = selectedControl.fields.form.value ?? tree.rootNode;
    const newNode = tree.addNode(v, d);
    selectedControlId.value = newNode.id;
  }
}

function toSnippetTreeNode(snippets: Snippet[]): SnippetTreeNode[] {
  const groupMap = new Map<string, SnippetTreeNode>();
  const rootGroups: SnippetTreeNode[] = [];

  for (const snippet of snippets) {
    const group = snippet.group ?? "Default";
    let snippetNode = groupMap.get(group);
    if (!snippetNode) {
      snippetNode = {
        id: "_group_" + group,
        name: group,
        children: [],
      };
      groupMap.set(group, snippetNode);
      rootGroups.push(snippetNode);
    }

    snippetNode.children!.push({
      id: snippet.id,
      name: snippet.name,
      snippet,
    });
  }

  return rootGroups;
}

function SnippetTreeNode(
  props: NodeRendererProps<SnippetTreeNode>,
  onAdd: (definition?: ControlDefinition) => void,
) {
  const {
    node: { isInternal, isOpen },
  } = props;

  return (
    <StdTreeNode {...props}>
      <i
        className={clsx(
          "fa-solid w-4 h-4 mr-2",
          !isInternal ? "fa-cube" : isOpen ? "fa-folder-open" : "fa-folder",
        )}
      />
      {props.node.data.name}
      {!isInternal && (
        <i
          className="ml-2 fa-solid fa-plus w-4 h-4"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(props.node.data.snippet?.definition);
          }}
        />
      )}
    </StdTreeNode>
  );
}
