import { useTrackedComponent } from "@react-typed-forms/core";
import {
  ChildVisibilityFunc,
  ControlDataContext,
  FormNode,
  lookupChildDataContext,
  makeHookDepString,
} from "@react-typed-forms/schemas";
import { ReactNode } from "react";

interface VisibleChildrenRendererProps<A> {
  useChildVisibility: ChildVisibilityFunc;
  parentFormNode: FormNode;
  dataContext: ControlDataContext;
  props: A;
  render: (
    props: A,
    isChildVisible: (childIndex: number) => boolean,
  ) => ReactNode;
}
export function VisibleChildrenRenderer<A>(
  props: VisibleChildrenRendererProps<A>,
) {
  const { parentFormNode, useChildVisibility } = props;
  const visibleChildren = parentFormNode
    .getChildNodes()
    .map(
      (cd, i) =>
        [
          useChildVisibility(cd.definition, undefined, true),
          cd.definition,
        ] as const,
    );

  const Render = useTrackedComponent(doRender, [
    makeHookDepString(visibleChildren, (x) => x[0].deps),
  ]);

  return <Render {...props} />;
  function doRender(props: VisibleChildrenRendererProps<A>) {
    const visibilities = visibleChildren.map((x) =>
      x[0].runHook(lookupChildDataContext(props.dataContext, x[1]), x[0].state),
    );
    return props.render(props.props, (i) => !!visibilities[i].value);
  }
}
