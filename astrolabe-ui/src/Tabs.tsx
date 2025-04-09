import * as Prim from "@radix-ui/react-tabs";
import { Control, RenderArrayElements } from "@react-typed-forms/core";
import { ReactNode } from "react";
import clsx from "clsx";
import { cva, VariantProps } from "class-variance-authority";

const tabVariants = cva(
  "bg-white px-5 h-[45px] flex-1 flex items-center justify-center text-[15px] leading-none  select-none first:rounded-tl-md last:rounded-tr-md   data-[state=active]:shadow-[inset_0_-1px_0_0,0_1px_0_0] data-[state=active]:shadow-current data-[state=active]:focus:relative data-[state=active]:focus:shadow-[0_0_0_2px] data-[state=active]:focus:shadow-black outline-none cursor-default",
  {
    variants: {
      color: {
        primary:
          "text-primary-400 hover:text-primary-500 data-[state=active]:text-primary-500",
        secondary:
          "text-secondary-400 hover:text-secondary-500 data-[state=active]:text-secondary-500",
      },
    },
    defaultVariants: {
      color: "primary",
    },
  },
);

const listVariants = cva("shrink-0 flex border-b", {
  variants: {
    color: {
      primary: "border-primary",
      secondary: "border-secondary",
    },
  },
  defaultVariants: {
    color: "primary",
  },
});

export interface TabContent {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

export type TabsProps = {
  className?: string;
  triggerClass?: string;
  listClass?: string;
  contentClass?: string;
  control: Control<string>;
  tabs: TabContent[];
} & VariantProps<typeof tabVariants>;

export function Tabs({
  className,
  control,
  tabs,
  listClass,
  contentClass,
  triggerClass,
  ...props
}: TabsProps) {
  const value = control.value;
  const trigger = tabVariants(props);
  return (
    <Prim.Root
      className={clsx(className, "flex flex-col")}
      value={value}
      onValueChange={(v) => (control.value = v)}
    >
      <Prim.List className={clsx(listClass, listVariants(props))}>
        <RenderArrayElements
          array={tabs}
          children={(v) => (
            <Prim.Trigger className={clsx(triggerClass, trigger)} value={v.id}>
              {v.title}
            </Prim.Trigger>
          )}
        />
      </Prim.List>
      <RenderArrayElements
        array={tabs}
        children={(v) => (
          <Prim.Content className={contentClass} value={v.id}>
            {v.content}
          </Prim.Content>
        )}
      />
    </Prim.Root>
  );
}
