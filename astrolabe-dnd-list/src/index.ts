import { Control, updateElements } from "@react-typed-forms/core";
import {
    ConnectDragPreview,
    ConnectDragSource,
    ConnectDropTarget,
    useDrag,
    useDrop,
} from "react-dnd";

export interface ListDropCollectedDrops {
    isOver: boolean;
    canDrop: boolean;
}

export interface ListDragCollectedDrops {
    isDragging: boolean;
}

export type DropFunction<T> = (
    sourceItem: Control<T>,
    sourceList: Control<T[]>,
    destItem: Control<T> | undefined,
    destList: Control<T[]>
) => void;

export function useListDrop<T>(
    list: Control<T[]>,
    isChildOf: (row: Control<T>, list: Control<T[]>) => boolean,
    dropType: string,
    current?: Control<T>,
    onDrop?: DropFunction<T>
): [ListDropCollectedDrops, ConnectDropTarget] {
    return useDrop<
        { state: Control<T>; list: Control<T[]> },
        any,
        ListDropCollectedDrops
    >(() => ({
        accept: dropType,
        canDrop: (item) => item.state !== current && !isChildOf(item.state, list),
        drop: (item, o) => {
            (onDrop ?? dropItem)(item.state, item.list, current, list);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));
}

export function useFlatListDragDrop<T>(
    state: Control<T>,
    list: Control<T[]>,
    type: string,
    onDrop?: DropFunction<T>
): [
    ListDropCollectedDrops,
    ConnectDropTarget,
    ConnectDragSource,
    ConnectDragPreview,
    ListDragCollectedDrops
] {
    const [dropProps, drop] = useListDrop(list, () => false, type, state, onDrop);
    const [collected, drag, dragPreview] = useDrag(() => ({
        type,
        item: { state, list },
        collect: (m) => ({ isDragging: m.isDragging() }),
    }));
    return [dropProps, drop, drag, dragPreview, collected];
}

export function dropItem<T>(
    sourceItem: Control<T>,
    sourceList: Control<T[]>,
    destItem: Control<T> | undefined,
    destList: Control<T[]>
): void {
    if (sourceList === destList) {
        updateElements(sourceList, (f) => reorderItem(f, sourceItem, destItem));
    } else {
        updateElements(sourceList, (f) => f.filter((q) => q !== sourceItem));
        updateElements(destList, (f) => {
            const outArray = [...f];
            const indIns = destItem ? outArray.indexOf(destItem) : 0;
            outArray.splice(indIns, 0, sourceItem);
            return outArray;
        });
    }
}

export function reorderItem<T>(list: T[], sourceItem: T, destItem?: T): T[] {
    const remIdx = list.indexOf(sourceItem);
    const destIdx = destItem ? list.indexOf(destItem) : 0;
    const outArray = [...list];
    outArray.splice(remIdx, 1);
    outArray.splice(destIdx, 0, sourceItem);
    return outArray;
}
