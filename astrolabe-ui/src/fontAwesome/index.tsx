import { clsx } from "clsx";
import { FC } from "react";

export function mkIcon(
  iconString: string,
): FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>> {
  return ({ className, ...props }) => (
    <i
      className={clsx(className, "fa", iconString)}
      aria-hidden
      {...props}
    />
  );
}

export const PlusIcon = mkIcon("fa-plus");

export const QuestionIcon = mkIcon("fa-question-circle");
export const HomeIcon = mkIcon("fa-home");
