import { useCallback, useRef } from "react";
import { useControl, useControlEffect } from "@react-typed-forms/core";

interface UseObserver {
  (
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
    externalState?: React.ComponentState[],
  ): (node: Element | null) => void;
}

/**
 * useObserver
 * @param callback IntersectionObserverCallback
 * @param options IntersectionObserverInit
 * @param externalState React.ComponentState[]
 */
const useObserver: UseObserver = (
  callback,
  { root, rootMargin, threshold } = {},
  externalState = [],
) => {
  const target = useRef<Element | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const setTarget = useCallback(
    (node: Element | null) => {
      if (target.current && observer.current) {
        observer.current.unobserve(target.current);
        observer.current.disconnect();
        observer.current = null;
      }

      if (node) {
        observer.current = new IntersectionObserver(callback, {
          root,
          rootMargin,
          threshold,
        });
        observer.current.observe(node);
        target.current = node;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [target, root, rootMargin, JSON.stringify(threshold), ...externalState],
  );

  return setTarget;
};

export function useScrollIntoView<E extends HTMLElement = HTMLDivElement>(
  shouldBeInView: boolean,
) {
  const inViewControl = useControl(true);
  const itemRef = useRef<HTMLElement | null>();
  const setElement = useObserver(
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
