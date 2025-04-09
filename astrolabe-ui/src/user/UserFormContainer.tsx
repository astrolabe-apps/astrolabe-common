import clsx from "clsx";
import { ReactNode } from "react";

export function UserFormContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("p-6 space-y-4 md:space-y-6 sm:p-8", className)}>
      {children}
    </div>
  );
}
