import {
  ControlDataContext,
  FormNode,
  ParentRendererProps,
} from "@react-typed-forms/schemas";
import { ReactNode } from "react";

interface VisibleChildrenRendererProps<A> {
  parent: ParentRendererProps;
  parentFormNode: FormNode;
  dataContext: ControlDataContext;
  props: A;
  render: (
    props: A,
    isChildVisible: (childIndex: number) => boolean,
  ) => ReactNode;
}

/**
 * @trackControls
 */
export function VisibleChildrenRenderer<A>(
  props: VisibleChildrenRendererProps<A>,
) {
  const childStates = props.parentFormNode
    .getChildNodes()
    .map((x) => props.parent.getChildState(x));
  return props.render(props.props, (i) => !childStates[i].hidden);
}
