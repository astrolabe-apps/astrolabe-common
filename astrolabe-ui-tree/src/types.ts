import { Control } from "@react-typed-forms/core";
import {
  CSSProperties,
  FC,
  HTMLAttributes,
  PropsWithChildren,
  ReactElement,
  ReactNode,
} from "react";

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

export interface TreeDragState {
  active?: Control<any>;
  overId?: number;
  offsetLeft: number;
}

export interface TreeState<E = any> {
  expanded: number[];
  dragInsert?: TreeInsertState;
  selected?: Control<E>;
}

export type TreeNodeConfigure<V> = (
  b: TreeNodeBuilder<V>,
) => TreeNodeBuilder<V>;

export interface ControlTreeItemProps {
  node: ControlTreeNode;
  clone?: boolean;
  selected: Control<Control<any> | undefined>;
  title: string;
  indentationWidth: number;
  indicator: boolean;
  insertState: Control<TreeInsertState | undefined>;
  active: Control<any>;
  displayedNodes: ControlTreeNode[];
  onCollapse?: () => void;
  canHaveChildren?: boolean;
  actions?: ReactNode;
  itemConfig?: TreeItemConfig;
}

export interface SortableTreeItem {
  handleProps: HTMLAttributes<HTMLElement>;
  handleIcon?: ReactNode;
  itemProps: {
    style: CSSProperties;
    onClick: () => void;
  };
  paddingLeft: number;
  isDragging: boolean;
  isSelected: boolean;
  setDraggableNodeRef: (elem: HTMLElement | null) => void;
  setDroppableNodeRef: (elem: HTMLElement | null) => void;
  canHaveChildren: boolean;
  title: string;
  clone?: boolean;
  actions: ReactNode;
  expanded: boolean;
  onCollapse?: () => void;
}

interface TreeItemConfig {
  handleIcon?: ReactNode;
}

export interface ControlTreeContainerProps
  extends HTMLAttributes<HTMLElement>,
    PropsWithChildren<
      Partial<{
        displayedNodes: ControlTreeNode[];
        active: Control<any>;
        selected: Control<Control<any> | undefined>;
      }>
    > {}

export interface ControlTreeProps {
  treeState: Control<TreeState>;
  controls: Control<any[]>;
  canDropAtRoot: (c: Control<any>) => boolean;
  indentationWidth?: number;
  indicator?: boolean;
  TreeItem?: FC<ControlTreeItemProps>;
  TreeContainer?: FC<ControlTreeContainerProps>;
  itemConfig?: TreeItemConfig;
  actions?: (node: ControlTreeNode) => ReactNode | undefined;
}
