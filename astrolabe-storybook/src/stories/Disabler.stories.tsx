import { Disabler } from "@astrolabe/ui/Disabler";
import { Meta, StoryObj } from "@storybook/react";
import { useControl } from "@react-typed-forms/core";
import { Numberfield } from "@astrolabe/ui/Numberfield";

const meta: Meta<typeof Disabler<any>> = {
  component: Disabler,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story, params) => {
      const disablerControl = useControl(1);
      return (
        <Story
          args={{
            ...params.args,
            control: disablerControl,
          }}
        />
      );
    },
  ],
  args: {
    label: "Label placeholder",
  },
};

export default meta;
type Story = StoryObj<typeof Disabler<any>>;

export const Primary: Story = {
  render: (args) => {
    return (
      <Disabler
        control={args.control}
        label={args.label}
        render={(p) => (
          <Numberfield {...p} control={p.control.as()} label={args.label} />
        )}
      />
    );
  },
};
