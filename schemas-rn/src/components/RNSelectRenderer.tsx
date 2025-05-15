import * as SelectPrimitive from "@rn-primitives/select";
import * as React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { cn } from "../utils";
import {
  createSelectConversion,
  SelectDataRendererProps,
  SelectRendererOptions,
} from "@react-typed-forms/schemas-html";
import {
  createDataRenderer,
  DataRenderType,
  FieldOption,
  FieldType,
  rendererClass,
} from "@react-typed-forms/schemas";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "react-native-gesture-handler";
import { Icon } from "./Icon";
import { useComputed } from "@react-typed-forms/core";

export interface ExtendedDropdown {
  portalHost?: string;
}

export function createRNSelectRenderer(options: SelectRendererOptions = {}) {
  return createDataRenderer(
    (props, asArray) => {
      const renderOptions = props.definition.renderOptions as ExtendedDropdown;
      return (
        <RNSelectRenderer
          className={rendererClass(props.className, options.className)}
          state={props.control}
          id={props.id}
          readonly={props.readonly}
          options={props.options ?? []}
          required={props.required}
          emptyText={options.emptyText}
          requiredText={options.requiredText}
          convert={createSelectConversion(props.field.type)}
          portalHost={renderOptions.portalHost}
        />
      );
    },
    {
      options: true,
      schemaType: [FieldType.String, FieldType.Int],
      renderType: DataRenderType.Dropdown,
    },
  );
}

function RNSelectRenderer({
  state,
  options,
  className,
  convert,
  required,
  emptyText = "N/A",
  requiredText = "Please select",
  portalHost,
  ...props
}: SelectDataRendererProps & ExtendedDropdown) {
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: Platform.select({
      ios: insets.bottom,
      android: insets.bottom + 24,
    }),
    left: 12,
    right: 12,
  };
  const { value, disabled } = state;
  const optionStringMap = useMemo(
    () => Object.fromEntries(options.map((x) => [convert(x.value), x.value])),
    [options],
  );
  const optionGroups = useMemo(
    () =>
      Array.from(new Set(options.filter((x) => x.group).map((x) => x.group!))),
    [options],
  );

  const selectedOption = useComputed(() => {
    return options
      .filter((x) => x.value === value)
      .map(
        (x) =>
          ({
            value: convert(x.value).toString(),
            label: x.name,
          }) satisfies Option,
      )
      .at(0);
  });

  return (
    <Select
      {...props}
      disabled={disabled}
      aria-disabled={disabled}
      defaultValue={{
        value: value,
        label: required ? requiredText : emptyText,
      }}
      onValueChange={(o) => {
        if (!o) return;
        state.value = optionStringMap[o.value];
      }}
      value={selectedOption.value}
    >
      <SelectTrigger className={"bg-white"}>
        <SelectValue placeholder={required ? requiredText : emptyText} />
      </SelectTrigger>
      <SelectContent
        insets={contentInsets}
        className={"bg-white w-[250px]"}
        portalHost={Platform.select({ ios: portalHost })}
      >
        <ScrollView className={"max-h-64"}>
          {optionGroups.map((x) => (
            <SelectGroup key={x}>
              <SelectLabel>{x}</SelectLabel>
              {options.filter((o) => o.group === x).map(renderOption)}
            </SelectGroup>
          ))}
          {options.filter((x) => !x.group).map(renderOption)}
        </ScrollView>
      </SelectContent>
    </Select>
  );

  function renderOption(x: FieldOption, i: number) {
    return (
      <SelectItem
        key={i}
        value={convert(x.value).toString()}
        label={x.name}
        disabled={!!x.disabled}
      >
        {x.name}
      </SelectItem>
    );
  }
}

type Option = SelectPrimitive.Option;

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  SelectPrimitive.TriggerRef,
  SelectPrimitive.TriggerProps
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex flex-row h-10 native:h-12 items-center text-sm justify-between border border-[#E7E7E8] bg-background px-3 py-2 web:ring-offset-background text-muted-foreground web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2 [&>span]:line-clamp-1",
      props.disabled && "web:cursor-not-allowed opacity-50",
      className,
    )}
    {...props}
  >
    <Pressable>{children}</Pressable>
    <Icon
      name={"chevron-down"}
      className={"!text-[12px] text-foreground text-accent"}
    />
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  SelectPrimitive.ContentRef,
  SelectPrimitive.ContentProps & { portalHost?: string }
>(({ className, children, position = "popper", portalHost, ...props }, ref) => {
  const { open } = SelectPrimitive.useRootContext();

  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <SelectPrimitive.Overlay
        style={Platform.OS !== "web" ? StyleSheet.absoluteFill : undefined}
      >
        <Animated.View className="z-50" entering={FadeIn} exiting={FadeOut}>
          <SelectPrimitive.Content
            ref={ref}
            className={cn(
              "relative z-50 max-h-96 min-w-[8rem] rounded-md border border-border bg-popover shadow-md shadow-foreground/10 py-2 px-1 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              position === "popper" &&
                "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
              open
                ? "web:zoom-in-95 web:animate-in web:fade-in-0"
                : "web:zoom-out-95 web:animate-out web:fade-out-0",
              className,
            )}
            position={position}
            {...props}
          >
            <SelectPrimitive.Viewport
              className={cn(
                "p-1",
                position === "popper" &&
                  "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
              )}
            >
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </Animated.View>
      </SelectPrimitive.Overlay>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  SelectPrimitive.LabelRef,
  SelectPrimitive.LabelProps
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "py-1.5 native:pb-2 pl-2 native:pl-2 pr-2 text-popover-foreground text-sm native:text-base font-semibold",
      className,
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  SelectPrimitive.ItemRef,
  SelectPrimitive.ItemProps
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative web:group flex flex-row w-full web:cursor-default web:select-none items-center rounded-sm py-1.5 native:py-2 pl-8 native:pl-10 pr-2 web:hover:bg-accent/50 active:bg-accent web:outline-none web:focus:bg-accent",
      props.disabled && "web:pointer-events-none opacity-50",
      className,
    )}
    {...props}
  >
    <View className="absolute left-2 native:left-3.5 flex h-3.5 native:pt-px w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Icon
          name={"check"}
          className={"text-[12px] text-popover-foreground"}
        />
      </SelectPrimitive.ItemIndicator>
    </View>
    <SelectPrimitive.ItemText className="text-sm native:text-lg text-popover-foreground native:text-base web:group-focus:text-accent-foreground" />
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  SelectPrimitive.SeparatorRef,
  SelectPrimitive.SeparatorProps
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
