import { Accordion } from "@astrolabe/ui/Accordion";
import { Meta, StoryObj } from "@storybook/react";

const accordionChildren = [
  {
    title: "History",
    contents: (
      <div className="flex flex-col gap-2 divide-y">
        <section>
          <div className="my-2 flex justify-between font-bold">
            <div>Lorem Ipsumer</div>
            <div>Updated lorember 2019</div>
          </div>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Illo in eum
            libero atque reprehenderit dolorem eligendi hic asperiores magni
            sint? Nemo pariatur alias non magni accusantium, minima voluptatem
            facere quo.
          </p>
        </section>
        <section>
          <div className="my-2 flex justify-between font-bold">
            <div>Lorem Ipsumd</div>
            <div>Updated 26 ipsumary 2016</div>
          </div>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quasi
            ullam impedit distinctio laboriosam accusantium dignissimos?
            Numquam, earum corporis dignissimos quod expedita impedit ipsa
            deserunt quibusdam consectetur facere, tempore aperiam quis.
          </p>
        </section>
      </div>
    ),
  },
];

const meta: Meta<typeof Accordion> = {
  component: Accordion,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    type: {
      control: "radio",
      options: ["single", "multiple"],
      description:
        "Determines whether one or multiple items can be opened at the same time.",
    },
    collapsible: {
      control: "boolean",
      description:
        'When type is "single", allows closing content when clicking trigger for an open item.',
    },
    itemClass: {
      control: "text",
      description:
        "Tailwind CSS styles for AccordionItem, e.g.: The text colour of trigger and content of the Accordion",
    },
    className: {
      control: "text",
      description:
        "Tailwind CSS styles for AccordionRoot, e.g.: The background of the Accordion",
    },
    children: {
      control: "array",
      description: "Accordion title and contents",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Single: Story = {
  render: () => {
    return (
      <Accordion
        type="single"
        collapsible
        className=""
        itemClass="text-surface-950"
        contentChildren={[...accordionChildren, ...accordionChildren]}
      />
    );
  },
};

export const Multiple: Story = {
  render: () => {
    return (
      <Accordion
        type="multiple"
        className=""
        itemClass="text-surface-950"
        contentChildren={[...accordionChildren, ...accordionChildren]}
      />
    );
  },
};
