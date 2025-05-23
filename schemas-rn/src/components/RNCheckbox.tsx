﻿import * as CheckboxPrimitive from "@rn-primitives/checkbox";
import * as React from "react";
import { cn } from "../utils";
import { Icon } from "./Icon";

const RNCheckbox = React.forwardRef<
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
      >
        <Icon name={"check"} className={"text-primary-500"} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
RNCheckbox.displayName = CheckboxPrimitive.Root.displayName;

export { RNCheckbox };
