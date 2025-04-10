import { FormInfo, ViewContext } from "./index";
import useResizeObserver from "use-resize-observer";
import { NodeRendererProps, Tree } from "react-arborist";
import React from "react";
import { StdTreeNode } from "../StdTreeNode";
import clsx from "clsx";

interface FormListNode {
  id: string;
  name: string;
  info?: FormInfo;
  children?: FormListNode[];
}
export function FormListView({ context }: { context: ViewContext }) {
  const { ref, width, height } = useResizeObserver();
  return (
    <div className="flex flex-col h-full">
      {context.listHeader}
      <div ref={ref} className="grow overflow-auto">
        <Tree<FormListNode>
          width={width}
          height={height}
          data={folders(context.formList)}
          onSelect={(n) => {
            if (n[0]?.data.info) {
              context.currentForm.value = n[0].data.info.id;
            }
          }}
          selection={context.currentForm.value}
          children={FormTreeNode}
        />
      </div>
    </div>
  );
}

function folders(forms: FormInfo[]): FormListNode[] {
  // create FormListNode for folder in all the forms
  const folderMap = new Map<string, FormListNode>();
  const rootFolders: FormListNode[] = [];
  for (const form of forms) {
    const folder = form.folder ?? "Other forms";
    let folderNode = folderMap.get(folder);
    if (!folderNode) {
      folderNode = {
        id: "_folder_" + folder,
        name: folder,
        children: [],
      };
      folderMap.set(folder, folderNode);
      rootFolders.push(folderNode);
    }
    folderNode.children!.push({
      id: form.id,
      name: form.name,
      info: form,
    });
  }
  return rootFolders;
}

function FormTreeNode(props: NodeRendererProps<FormListNode>) {
  const {
    node: { isInternal, isOpen },
  } = props;
  return (
    <StdTreeNode {...props}>
      <span className="truncate">
        <i
          className={clsx(
            "fa-solid w-4 h-4 mr-2",
            !isInternal
              ? "fa-file-lines"
              : isOpen
                ? "fa-folder-open"
                : "fa-folder",
          )}
        />
        {props.node.data.name}
      </span>
    </StdTreeNode>
  );
}
