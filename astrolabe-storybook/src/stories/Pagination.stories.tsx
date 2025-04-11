import { Pagination } from "@astrolabe/ui/Pagination";
import { Meta, StoryObj } from "@storybook/react";
import { useArgs } from "@storybook/preview-api";
import { useControl } from "@react-typed-forms/core";

const meta: Meta<typeof Pagination> = {
  component: Pagination,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story, params) => {
      const total = useControl(10);
      const page = useControl(0);
      const perPage = useControl(2);
      return (
        <Story
          args={{
            ...params.args,
            total,
            page,
            perPage,
          }}
        />
      );
    },
  ],
  args: {},
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Primary: Story = {
  render: (args) => {
    return <Pagination {...args} />;
  },
};
