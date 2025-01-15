import { defaultTooltipProvider, Tooltip } from "@astrolabe/ui/Tooltip";
import { Meta, StoryObj } from "@storybook/react";
import { Button } from "@astrolabe/ui/Button";
import { AppContextProvider } from "@astroapps/client";
import { useArgs } from "@storybook/preview-api";

const meta: Meta<typeof Tooltip> = {
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
  args: {
    children: (
      <Button variant="primary" size="default">
        Tooltip
      </Button>
    ),
    content: <div>Tooltip content</div>,
    sideOffset: 4,
    contentClass: "",
    triggerClass: "",
    open: false,
    onOpenChange: (c) => {},
    asChild: false,
  },
  decorators: [
    (Story) => (
      <AppContextProvider providers={[defaultTooltipProvider]} value={{}}>
        <Story />
      </AppContextProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const DefaultTooltip: Story = {
  args: {
    variant: "default",
  },
  render: (args) => {
    const [{ open }, updateArgs] = useArgs();

    return (
      <Tooltip
        {...args}
        open={open}
        onOpenChange={(v) => {
          updateArgs({ open: v });
        }}
      >
        {args.children}
      </Tooltip>
    );
  },
};

export const DangerTooltip: Story = {
  args: {
    variant: "danger",
  },
  render: (args) => {
    const [{ open }, updateArgs] = useArgs();

    return (
      <Tooltip
        {...args}
        open={open}
        onOpenChange={(v) => {
          updateArgs({ open: v });
        }}
      >
        {args.children}
      </Tooltip>
    );
  },
};
