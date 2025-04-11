import { RadioButton } from "@astrolabe/ui/RadioButton";
import { Meta, StoryObj } from "@storybook/react";
import { useControl, useControlEffect } from "@react-typed-forms/core";

const meta: Meta<typeof RadioButton<number>> = {
  component: RadioButton,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story, params) => {
      const radioButtonControl = useControl(0);
      return (
        <Story
          args={{
            ...params.args,
            control: radioButtonControl as any,
          }}
        />
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof RadioButton<number>>;

export const Primary: Story = {
  render: (args) => {
    return (
      <div className="flex justify-center gap-2">
        <RadioButton<number>
          control={args.control}
          radioValue={0}
          disabled={false}
          className=""
        />
        <span className="text-primary-900">Radio Button</span>
      </div>
    );
  },
};

export const RadioButtonGroup: Story = {
  render: (args) => {
    useControlEffect(
      () => args.control.value,
      (v) => console.log(v),
    );
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((r, i) => (
          <label className="flex gap-2 justify-center">
            <RadioButton
              control={args.control}
              radioValue={i}
              disabled={i === 2}
              key={i}
            />
            <span className="text-primary-900">Radio button {i + 1}</span>
          </label>
        ))}
      </div>
    );
  },
};
