import {
  Control,
  ControlSetup,
  newControl,
  updateElements,
  useControl,
} from "@react-typed-forms/core";
import React, { Fragment, ReactElement, ReactNode } from "react";

export type TreeNodeRenderProps = {
  node: ControlTreeNode;
  renderItem: (
    title: string | undefined | null,
    actions?: ReactNode,
    canHaveChildren?: boolean,
  ) => ReactElement;
  children: ReactNode;
};

export interface TreeNodeData {
  getChildren: () => Control<any[]> | undefined;
  render(props: TreeNodeRenderProps): ReactElement;
  canDropChild?: (nodeType: string, child: Control<any>) => boolean;
  updateTitle?: (title: string) => void;
  icon?: string | ReactElement;
  dragEnabled?: boolean;
}

export interface TreeNodeStructure<V = any> {
  nodeType: string;
  treeNode?: TreeNodeBuilder<V>;
}

export interface TreeInsertState {
  parent: ControlTreeNode;
  childIndex: number;
  dragged: ControlTreeNode;
}

export interface ControlTreeNode
  extends Omit<TreeNodeData, "canDropChild" | "getChildren"> {
  control: Control<any>;
  parent: ControlTreeNode | undefined;
  children: Control<any[] | null> | undefined;
  childrenNodes: ControlTreeNode[];
  canDropChild: (c: Control<any>) => boolean;
  childIndex: number;
  expanded: boolean;
  indent: number;
}

export interface TreeNodeBuilder<V> {
  withChildren(
    children: (n: Control<V>) => Control<any[] | null> | undefined,
  ): TreeNodeBuilder<V>;

  asChildren: V extends any[] ? TreeNodeBuilder<V> : never;

  withDropping(
    canDropChild: (nodeType: string, child: Control<any>) => boolean,
  ): TreeNodeBuilder<V>;

  withDragging(enabled?: boolean): TreeNodeBuilder<V>;

  withCustomRender(
    render: (node: Control<V>, props: TreeNodeRenderProps) => ReactElement,
  ): TreeNodeBuilder<V>;

  and(p?: (b: TreeNodeBuilder<V>) => TreeNodeBuilder<V>): TreeNodeBuilder<V>;

  withVirtualChildren(
    getChildren: (n: Control<V>) => Control<any>[],
  ): TreeNodeBuilder<V>;

  withIcon(
    icon: string | ((n: Control<V>) => ReactElement | string) | ReactElement,
  ): TreeNodeBuilder<V>;

  build(c: Control<V>): TreeNodeData;
}

export function toTreeNode(
  expansions: number[],
  active: Control<any> | undefined,
  parent: ControlTreeNode,
  indent: number,
): (c: Control<any>, childIndex: number) => ControlTreeNode {
  return (c, childIndex) => {
    const treeNode = getTreeNodeData(c);
    const children = treeNode.getChildren();
    const expanded = expansions.includes(c.uniqueId);
    const flattened: ControlTreeNode = {
      ...treeNode,
      indent,
      control: c,
      parent,
      childIndex,
      expanded,
      canDropChild: (child: Control<any>) => {
        const childType = child.meta.nodeType;
        return Boolean(
          children &&
            (!treeNode.canDropChild ||
              (childType && treeNode.canDropChild(childType, child))),
        );
      },
      children,
      childrenNodes: [],
    };
    if (children && expanded && active !== c) {
      flattened["childrenNodes"] =
        children.elements?.map(
          toTreeNode(expansions, active, flattened, indent + 1),
        ) ?? [];
    }
    return flattened;
  };
}

export interface TreeState<E = any> {
  expanded: number[];
  dragInsert?: TreeInsertState;
  selected?: Control<E>;
}

export function useTreeStateControl<E = any>(): Control<TreeState<E>> {
  return useControl<TreeState<E>>({ expanded: [] });
}

export interface TreeDragState {
  active?: Control<any>;
  overId?: number;
  offsetLeft: number;
}

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

export type TreeNodeConfigure<V> = (
  b: TreeNodeBuilder<V>,
) => TreeNodeBuilder<V>;

export function treeNode<V>(
  nodeType: string,
  title: string,
  configure?: TreeNodeConfigure<V>,
): ControlSetup<V, TreeNodeStructure>;

export function treeNode<V>(
  nodeType: string,
  title: (node: Control<V>) => Control<string | undefined | null>,
  allowEditing: boolean,
  configure?: TreeNodeConfigure<V>,
): ControlSetup<V, TreeNodeStructure>;

export function treeNode<V>(
  nodeType: string,
  title: string | ((node: Control<V>) => Control<string | undefined | null>),
  configureOrEdit?: TreeNodeConfigure<V> | boolean,
  configure?: TreeNodeConfigure<V>,
): ControlSetup<V, TreeNodeStructure<V>> {
  const fixedTitle = typeof title === "string";
  const builder = fixedTitle
    ? new TreeNodeBuildImpl<V>((n) => ({
        getChildren: () => undefined,
        render: (props) => (
          <Fragment key={n.uniqueId}>
            {props.renderItem(title)}
            {props.children}
          </Fragment>
        ),
      }))
    : new TreeNodeBuildImpl<V>((n) => ({
        getChildren: () => undefined,
        render: (p) => (
          <TitleNodeRender key={n.uniqueId} titleControl={title(n)} {...p} />
        ),
        updateTitle: (t) => (title(n).value = t),
      }));
  return {
    meta: {
      nodeType,
      treeNode: builder.and(
        fixedTitle ? (configureOrEdit as TreeNodeConfigure<V>) : configure,
      ),
    },
  };
}

function TitleNodeRender({
  titleControl,
  children,
  renderItem,
}: { titleControl: Control<string | undefined | null> } & TreeNodeRenderProps) {
  const title = titleControl.value;
  return (
    <>
      {renderItem(title)}
      {children}
    </>
  );
}

class TreeNodeBuildImpl<V> implements TreeNodeBuilder<V> {
  builders: ((n: Control<V>, data: TreeNodeData) => void)[] = [];

  constructor(private init: (c: Control<V>) => TreeNodeData) {}

  get asChildren(): any {
    return this.withChildren((n) => n.as());
  }

  and(p?: TreeNodeConfigure<V>): TreeNodeBuilder<V> {
    return p?.(this) ?? this;
  }

  build(c: Control<V>): TreeNodeData {
    const nd = this.init(c);
    this.builders.forEach((b) => b(c, nd));
    return nd;
  }

  withIcon(
    icon: string | ((n: Control<V>) => string | ReactElement) | ReactElement,
  ): TreeNodeBuilder<V> {
    this.builders.push(
      (n, d) => (d.icon = typeof icon === "function" ? icon(n) : icon),
    );
    return this;
  }

  withChildren(
    children: (n: Control<V>) => Control<any[]> | undefined,
  ): TreeNodeBuilder<V> {
    this.builders.push((n, d) => {
      d.getChildren = () => children(n);
    });
    return this;
  }

  withCustomRender(
    render: (
      node: Control<V>,
      props: TreeNodeRenderProps,
    ) => React.ReactElement,
  ): TreeNodeBuilder<V> {
    this.builders.push((n, d) => (d.render = (p) => render(n, p)));
    return this;
  }

  withDragging(enabled?: boolean): TreeNodeBuilder<V> {
    this.builders.push((n, d) => (d.dragEnabled = enabled ?? true));
    return this;
  }

  withDropping(
    canDropChild: (nodeType: string, child: Control<any>) => boolean,
  ): TreeNodeBuilder<V> {
    this.builders.push((n, d) => (d.canDropChild = canDropChild));
    return this;
  }

  withVirtualChildren(
    getChildren: (n: Control<V>) => Control<any>[],
  ): TreeNodeBuilder<V> {
    this.builders.push(
      (n, d) =>
        (d.getChildren = () => {
          let childControl: Control<any[]> | undefined = n.meta.virtualChildren;
          if (!childControl) {
            childControl = newControl([] as any[]);
            updateElements(childControl, () => getChildren(n));
            n.meta.virtualChildren = childControl;
          }
          return childControl;
        }),
    );
    return this;
  }
}
