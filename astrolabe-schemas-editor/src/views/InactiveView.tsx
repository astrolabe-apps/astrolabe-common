import React, { ReactNode } from "react";

export function InactiveView({ children }: { children: ReactNode }) {
  return <div className="my-8 text-center italic">{children}</div>;
}
