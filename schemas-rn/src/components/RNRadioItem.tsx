import * as RadioGroupPrimitive from "@rn-primitives/radio-group";
import * as React from "react";
import { Pressable, View } from "react-native";
import { cn } from "../utils";
import { CheckButtonsProps } from "@react-typed-forms/schemas-html";

const RNRadioItem = React.forwardRef<
  RadioGroupPrimitive.ItemRef,
  {
    checked: boolean;
    className?: string;
    disabled?: boolean;
    id: string;
    name: string;
    readonly: boolean;
    onChange: () => void;
  }
>(({ className, checked, onChange, ...props }, ref) => {
  return (
    <Pressable
      ref={ref}
      onPress={onChange}
      className={cn(
        "aspect-square h-4 w-4 native:h-5 native:w-5 rounded-full justify-center items-center border border-primary text-primary web:ring-offset-background web:focus:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2",
        // props.disabled && "web:cursor-not-allowed opacity-50",
        className,
      )}
      {...props}
    >
      <View className="flex items-center justify-center">
        {checked && (
          <View className="aspect-square h-[9px] w-[9px] native:h-[10] native:w-[10] bg-primary rounded-full" />
        )}
      </View>
    </Pressable>
  );
});
RNRadioItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RNRadioItem };
