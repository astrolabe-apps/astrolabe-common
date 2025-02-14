import * as CheckboxPrimitive from "@rn-primitives/checkbox";
import * as React from "react";
import { Platform } from "react-native";
import clsx from "clsx";
import { Text } from "react-native";

const RNCheckbox = React.forwardRef<
  CheckboxPrimitive.RootRef,
  CheckboxPrimitive.RootProps
>(({ className, ...props }, ref) => {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={clsx(
        "web:peer h-4 w-4 native:h-[20] native:w-[20] shrink-0 rounded-sm native:rounded border border-primary web:ring-offset-background web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        props.checked && "bg-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={clsx("items-center justify-center h-full w-full")}
      >
        <Text>✔</Text>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
RNCheckbox.displayName = CheckboxPrimitive.Root.displayName;

export { RNCheckbox };
