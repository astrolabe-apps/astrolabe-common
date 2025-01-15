import { Control, useControl } from "@react-typed-forms/core";
import { TreeNodeData, TreeState } from "./types";
import React from "react";

type List<V> = null | [V, List<V>];

export function listHead<V>(list: List<V> | undefined): V | undefined {
  return list == null ? undefined : list[0];
}

export function listToArray<V>(list: List<V> | undefined): V[] {
  const outList: V[] = [];
  while (list != null) {
    outList.push(list[0]);
    list = list[1];
  }
  return outList;
}
export function findAllTreeParentsInArray<V>(
  node: Control<V>,
  nodes: Control<V[]>,
): List<Control<V>> {
  return findMatchingNodeInArray(nodes.current.elements, (c) => c === node);
}

export function findMatchingNode<V>(
  node: Control<V>,
  match: (c: Control<V>) => boolean,
  parents: List<Control<V>>,
): List<Control<V>> | undefined {
  const withParent = [node, parents] satisfies List<Control<V>>;
  if (match(node)) {
    return withParent;
  }
  const children = getControlTreeChildren(node)?.as<V[]>();
  if (!children) return undefined;
  return findMatchingNodeInArray(children.current.elements, match, withParent);
}
export function findMatchingNodeInArray<V>(
  nodes: Control<V>[] | undefined,
  match: (c: Control<V>) => boolean,
  parents: List<Control<V>> = null,
): List<Control<V>> {
  for (const node of nodes ?? []) {
    const r = findMatchingNode(node, match, parents);
    if (r) return r;
  }
  return null;
}

function getControlTreeChildren(c: Control<any>): Control<any[]> | undefined {
  return c.meta.treeNode?.build(c)?.getChildren();
}

export function getTreeNodeData(c: Control<any>): TreeNodeData {
  return (
    c.meta.treeNode?.build(c) ?? {
      render: ({ renderItem, children }) => (
        <>
          {renderItem("")}
          {children}
        </>
      ),
      getChildren: () => undefined,
    }
  );
}

export function useTreeStateControl<E = any>(): Control<TreeState<E>> {
  return useControl<TreeState<E>>({ expanded: [] });
}
