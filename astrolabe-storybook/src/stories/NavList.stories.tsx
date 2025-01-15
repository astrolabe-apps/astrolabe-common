import { NavList } from "@astrolabe/ui/NavLink";
import { Meta, StoryObj } from "@storybook/react";
import { AppContextProvider } from "@astroapps/client";

const meta: Meta<typeof NavList> = {
  component: NavList,
  decorators: [
    (Story, params) => {
      return (
        <AppContextProvider providers={[]} value={{}}>
          <Story />
        </AppContextProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof NavList>;

export const Primary: Story = {
  render: () => {
    return <NavList links={[{ label: "Link 1", path: null }]} />;
  },
};
