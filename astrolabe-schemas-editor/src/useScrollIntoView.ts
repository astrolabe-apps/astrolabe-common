import { useEffect, useRef } from "react";
import { useInViewEffect } from "react-hook-inview";
import { useControl, useControlEffect } from "@react-typed-forms/core";

export function useScrollIntoView<E extends HTMLElement = HTMLDivElement>(
  shouldBeInView: boolean,
) {
  const inViewControl = useControl(true);
  const itemRef = useRef<HTMLElement | null>();
  const haveScrolled = useRef(false);
  const setElement = useInViewEffect(
    ([entry], observer) => (inViewControl.value = entry.isIntersecting),
  );
  useControlEffect(
    () => [inViewControl.value, shouldBeInView],
    ([iv, sbiv]) => {
      if (!iv && sbiv && itemRef.current && !haveScrolled.current) {
        haveScrolled.current = true;
        itemRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      if (!sbiv) haveScrolled.current = false;
    },
  );
  return (e: HTMLElement | null) => {
    setElement(e);
    itemRef.current = e;
  };
}
