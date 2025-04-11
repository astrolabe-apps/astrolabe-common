import {
  ControlTree,
  DefaultTreeItem,
  treeNode,
  TreeNodeStructure,
  useTreeStateControl,
} from "@astroapps/ui-tree";
import { Meta, StoryObj } from "@storybook/react";
import { ControlSetup, useControl } from "@react-typed-forms/core";

const meta: Meta<typeof ControlTree> = {
  component: ControlTree,
  decorators: [
    (Story) => {
      return (
        <div className="text-surface-950">
          <Story />
        </div>
      );
    },
  ],
  argTypes: {
    controls: {
      control: "object",
      description: "All tree nodes",
    },
    canDropAtRoot: {
      control: "boolean",
      description: "Whether the root node can be dragged and dropped",
    },
    indentationWidth: {
      control: "number",
      description: "The indentation width of the children nodes",
      table: {
        defaultValue: { summary: "50" },
      },
    },
    indicator: {
      control: "boolean",
      description: "Whether the tree node has an indicator",
      table: {
        defaultValue: { summary: "true" },
      },
    },
    treeState: {
      control: "object",
      description: "The state of the tree structure",
    },
    actions: {
      description: "The tree node actions, located after the title of the node",
    },
    TreeItem: {
      description: "The tree node item component",
    },
    TreeContainer: {
      description: "The ControlTree nodes container",
    },
  },
  args: {
    canDropAtRoot: (c) => true,
    indentationWidth: 50,
    indicator: true,
  },
};

interface TreeNode {
  id: string;
  title: string;
  children: TreeNode[];
}

function treeSetup(): ControlSetup<TreeNode, TreeNodeStructure> {
  return {
    ...treeNode(
      "Node",
      (c) => c.fields.title,
      true,
      (c) =>
        c.withChildren((n) =>
          n.fields.children.current.value ? n.fields.children.as() : undefined,
        ),
    ),
    fields: { children: { elems: treeSetup } },
  };
}

export default meta;
type Story = StoryObj<typeof ControlTree>;

export const Primary: Story = {
  render: (args) => {
    const treeState = useTreeStateControl<TreeNode>();
    const pageData = useControl<TreeNode[]>(
      [
        {
          id: "1",
          title: "1",
          children: [{ id: "1.1", title: "1.1", children: [] }],
        },
        {
          id: "2",
          title: "2",
          children: [],
        },
      ],
      { elems: treeSetup() },
    );

    return (
      <ControlTree
        treeState={treeState}
        controls={pageData}
        indentationWidth={args.indentationWidth}
        indicator={args.indicator}
        canDropAtRoot={args.canDropAtRoot}
        TreeItem={DefaultTreeItem}
        actions={(node) => (
          <div>
            <i className="fa fa-plus" />
            <span className="sr-only">Add node</span>
          </div>
        )}
      />
    );
  },
};
