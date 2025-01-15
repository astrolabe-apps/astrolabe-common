import { cva, VariantProps } from "class-variance-authority";
import { cn } from "@astroapps/client";
import { HTMLAttributes } from "react";

const circularProgressVariants = cva("stroke-current", {
  variants: {
    variant: {
      primary: "fill-primary-500 text-white",
      secondary: "fill-secondary-500 text-secondary-50",
    },
    size: {
      default: "h-12 w-12",
    },
    alignment: {
      centered: "mx-auto",
      none: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
    alignment: "centered",
  },
});

export function CircularProgress({
  className,
  variant,
  size,
  alignment, // make sure that you extract any variants added so the spread operator doesn't pass it to the svg
  ...props
}: HTMLAttributes<SVGSVGElement> & {
  className?: string;
} & VariantProps<typeof circularProgressVariants>) {
  return (
    <svg
      className={cn(
        circularProgressVariants({
          variant,
          size,
          alignment,
        }),
        className,
      )}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z">
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="0.75s"
          values="0 12 12;360 12 12"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
