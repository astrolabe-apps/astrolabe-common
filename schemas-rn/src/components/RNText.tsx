import * as Slot from "@rn-primitives/slot";
import type { SlottableTextProps, TextRef } from "@rn-primitives/types";
import * as React from "react";
import { Text } from "react-native";
import { cn } from "../utils";

const TextClassContext = React.createContext<string | undefined>(undefined);

const RNText = React.forwardRef<TextRef, SlottableTextProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const textClass = React.useContext(TextClassContext);
    const Component = asChild ? Slot.Text : Text;
    return (
      <Component
        className={cn(
          "text-base text-foreground web:select-text",
          textClass,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
RNText.displayName = "Text";

export { RNText, TextClassContext };
