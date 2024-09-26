import React, { ReactNode } from "react";
import clsx from "clsx";

export function SortableHeader({
  rotate,
  currentDir,
}: {
  rotate: () => void;
  currentDir: () => string | undefined;
}) {
  const cd = currentDir();
  return (
    <>
      <button onClick={rotate}>
        <i
          className={clsx(
            "ml-2 h-4 w-2",
            !cd
              ? "fa-light fa-sort"
              : cd === "a"
                ? "fa-solid fa-sort-up"
                : "fa-solid fa-sort-down",
          )}
        />
      </button>
    </>
  );
}
