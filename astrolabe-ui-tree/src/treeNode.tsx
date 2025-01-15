import React, { Fragment, ReactElement } from "react";
import {
  ControlTreeNode,
  TreeNodeBuilder,
  TreeNodeConfigure,
  TreeNodeData,
  TreeNodeRenderProps,
  TreeNodeStructure,
} from "./types";
import {
  Control,
  ControlSetup,
  newControl,
  updateElements,
} from "@react-typed-forms/core";
import { getTreeNodeData } from "./util";

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
