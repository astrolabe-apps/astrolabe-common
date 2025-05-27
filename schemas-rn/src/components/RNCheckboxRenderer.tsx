import * as CheckboxPrimitive from "@rn-primitives/checkbox";
import * as React from "react";
import { cn } from "../utils";
import { Icon } from "./Icon";
import { CheckRendererOptions } from "@react-typed-forms/schemas-html";
import {
  ControlLayoutProps,
  createDataRenderer,
  DataRendererProps,
  DataRenderType,
  FormRenderer,
  rendererClass,
} from "@react-typed-forms/schemas";
import { Pressable } from "react-native";
import { formControlProps } from "@react-typed-forms/core";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";

export function createRNCheckboxRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (props, renderer) => (p) => ({
      ...p,
      label: undefined,
      children: (
        <CheckBoxRenderer
          p={p}
          renderer={renderer}
          options={options}
          props={props}
        />
      ),
    }),
    { renderType: DataRenderType.Checkbox },
  );
}

function CheckBoxRenderer({
  p,
  props,
  renderer,
  options,
}: {
  p: ControlLayoutProps;
  props: DataRendererProps;
  renderer: FormRenderer;
  options: CheckRendererOptions;
}) {
  const control = props.control.as<boolean | null | undefined>();
  const { value } = formControlProps(control);

  function onCheckboxPressed() {
    control.touched = true;
    control.value = !value;
  }

  return (
    <Pressable
      className={rendererClass(props.className, options.entryClass)}
      onPress={onCheckboxPressed}
    >
      <RNCheckbox
        id={props.id}
        className={options.checkClass}
        checked={!!value}
        onCheckedChange={onCheckboxPressed}
      />
      {p.label && renderer.renderLabel(p.label, undefined, undefined)}
    </Pressable>
  );
}

export const RNCheckbox = React.forwardRef<
  CheckboxPrimitive.RootRef,
  CheckboxPrimitive.RootProps
>(({ className, ...props }, ref) => {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "web:peer h-4 w-4 native:h-[20] native:w-[20] shrink-0 rounded-sm native:rounded border border-primary web:ring-offset-background web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("items-center justify-center h-full w-full")}
        asChild
      >
        <Animated.View
          entering={ZoomIn.duration(150)}
          exiting={ZoomOut.duration(150)}
        >
          <Icon name={"check"} className={"text-primary-500"} />
        </Animated.View>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
RNCheckbox.displayName = CheckboxPrimitive.Root.displayName;
