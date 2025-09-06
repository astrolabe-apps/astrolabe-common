import { Control, RenderControl } from "@react-typed-forms/core";
import {
  createDataRenderer,
  DataRendererProps,
  DataRenderType,
  deepMerge,
  FormRenderer,
  getHasMoreControl,
  getLoadingControl,
  IconReference,
  NoOpControlActionContext,
  rendererClass,
  ScrollListRenderOptions,
} from "@react-typed-forms/schemas";
import { useEffect, useRef, Fragment } from "react";

export interface DefaultScrollListOptions {
  loadingIcon?: IconReference;
  iconClass?: string;
  spinnerClass?: string;
  className?: string;
}

const defaultOptions = {
  spinnerClass: "flex justify-center my-6",
  className: "flex flex-row",
  loadingIcon: undefined as IconReference | undefined,
  iconClass: "text-[36px]",
} satisfies DefaultScrollListOptions;

export function createScrollListRenderer(options?: DefaultScrollListOptions) {
  return createDataRenderer(
    (p, renderer) => (
      <ScrollListRenderer dataProps={p} renderer={renderer} options={options} />
    ),
    {
      collection: true,
      renderType: DataRenderType.ScrollList,
    },
  );
}

function ScrollListRenderer({
  dataProps: {
    formNode,
    renderChild,
    dataNode,
    actionOnClick,
    renderOptions,
    dataContext,
    className,
  },
  renderer,
  options,
}: {
  dataProps: DataRendererProps;
  renderer: FormRenderer;
  options?: DefaultScrollListOptions;
}) {
  const { bottomActionId } = renderOptions as ScrollListRenderOptions;
  const loadingControl = getLoadingControl(dataNode.control);
  const hasMoreControl = getHasMoreControl(dataNode.control);
  const handler = bottomActionId
    ? actionOnClick?.(bottomActionId, undefined, dataContext)
    : undefined;
  const { I } = renderer.html;
  const { loadingIcon, spinnerClass, iconClass } = deepMerge(
    options as typeof defaultOptions,
    defaultOptions,
  );
  return (
    <>
      <div className={rendererClass(className, options?.className)}>
        {formNode.children.map((x) => renderChild(x))}
      </div>
      {loadingIcon?.name && <RenderControl render={spinner} />}
      <ScrollTrigger
        hasMoreControl={hasMoreControl}
        loadingControl={loadingControl}
        fetchMore={() => handler?.(NoOpControlActionContext)}
      />
    </>
  );

  function spinner() {
    return (
      loadingControl.value && (
        <div
          className={spinnerClass}
          ref={(e) => e?.scrollIntoView({ behavior: "smooth" })}
        >
          <I
            iconName={loadingIcon!.name}
            iconLibrary={loadingIcon!.library}
            className={iconClass}
          />
        </div>
      )
    );
  }
}

function ScrollTrigger({
  hasMoreControl,
  loadingControl,
  fetchMore,
}: {
  hasMoreControl: Control<boolean>;
  loadingControl: Control<boolean>;
  fetchMore: () => void;
}) {
  const observerTarget = useRef(null);

  const hasMore = hasMoreControl.value;
  const loading = loadingControl.value;
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchMore();
        }
      },
      { threshold: 0.5 },
    ); // Trigger when 50% of the target is visible

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading]); // Re-run effect if hasMore or loading state changes
  return <div ref={observerTarget} style={{ height: "1px" }}></div>;
}