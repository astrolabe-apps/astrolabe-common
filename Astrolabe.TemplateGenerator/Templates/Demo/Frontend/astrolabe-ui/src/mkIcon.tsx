import { clsx } from "clsx";
import { FC } from "react";

export function mkIcon(
  iconString: string
): FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>> {
  return ({ className, ...props }) => (
    <i className={clsx(className, "fa", iconString)} aria-hidden {...props} />
  );
}
