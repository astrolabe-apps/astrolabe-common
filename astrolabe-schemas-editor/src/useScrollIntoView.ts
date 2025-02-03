import { useEffect, useRef } from "react";
import { useInViewEffect } from "react-hook-inview";
import { useControl, useControlEffect } from "@react-typed-forms/core";

export function useScrollIntoView<E extends HTMLElement = HTMLDivElement>(
  shouldBeInView: boolean,
) {
  const inViewControl = useControl(true);
  const itemRef = useRef<HTMLElement | null>();
  const setElement = useInViewEffect(
    ([entry], observer) => (inViewControl.value = entry.isIntersecting),
  );
  useControlEffect(
    () => shouldBeInView,
    (sbiv) => {
      if (!inViewControl.current.value && sbiv && itemRef.current) {
        itemRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    },
  );
  return (e: HTMLElement | null) => {
    setElement(e);
    itemRef.current = e;
  };
}
