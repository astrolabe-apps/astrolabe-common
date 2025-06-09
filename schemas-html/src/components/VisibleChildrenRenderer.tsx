import {
  ControlDataContext,
  FormNode,
  ParentRendererProps,
  FormStateNode,
} from "@react-typed-forms/schemas";
import { ReactNode } from "react";

interface VisibleChildrenRendererProps<A> {
  parent: ParentRendererProps;
  parentFormNode: FormStateNode;
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
  const childStates = props.parentFormNode.getChildNodes();
  return props.render(props.props, (i) => !childStates[i].hidden);
}
