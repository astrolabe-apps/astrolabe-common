import clsx from "clsx";
import { ReactNode } from "react";

type UserFormContainerProps = {
  className?: string;
  children: ReactNode;
};
export function UserFormContainer({
  className,
  children,
}: UserFormContainerProps) {
  return (
    <div className={clsx("p-6 space-y-4 md:space-y-6 sm:p-8", className)}>
      {children}
    </div>
  );
}
