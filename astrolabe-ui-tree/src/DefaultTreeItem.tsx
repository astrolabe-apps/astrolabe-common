
import {DefaultSortableTreeItem, useSortableTreeItem} from "./DefaultSortableTreeItem";
import {ControlTreeItemProps} from "./types";

export function DefaultTreeItem(props: ControlTreeItemProps) {
  const sortableProps = useSortableTreeItem(props);

  return <DefaultSortableTreeItem {...sortableProps} />;
}
