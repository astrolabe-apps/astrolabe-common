import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

export const buttonVariants = cva(
  "btn inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ring-offset-surface-500 disabled:opacity-70",
  {
    variants: {
      variant: {
        default:
          "bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300",
        primary:
          "bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-300 disabled:text-primary-700",
        secondary: "bg-secondary-500 text-secondary-50 hover:bg-secondary-600",
        warning: "bg-warning-500 text-warning-950 hover:bg-warning-600",
        danger: "bg-danger-500 text-danger-50 hover:bg-danger-600",
        outline: "border border-current",
        ghost: "hover:bg-primary-300 hover:text-primary-950",
        gray: "text-secondary-500 hover:bg-primary-100 bg-surface-100 aria-disabled:cursor-not-allowed aria-disabled:text-gray-600",
        link: "underline-offset-4 hover:underline text-white",
        hyperlink:
          "text-blue-800 underline-offset-4 underline hover:underline-offset-8 transition-all hover:text-blue-700",
      },
      size: {
        default: "min-h-[2.5rem] py-2 px-4 text-sm font-medium",
        sm: "py-1.5 px-2 rounded-md min-h-[1rem] text-xs font-normal",
        lg: "min-h-[3rem] px-8 rounded-md text-sm font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * A customizable button component that supports various visual styles and sizes.
 *
 * @param {ButtonProps} props - The props for the button component.
 * @param {string} [props.className] - The CSS class name to apply to the button.
 * @param {string} [props.variant="default"] - The visual style variant for the button.
 * @param {string} [props.size="default"] - The size variant for the button.
 * @param {boolean} [props.asChild=false] - Whether to render the button as a child of a slot component.
 * @returns {JSX.Element} - The rendered button component.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
