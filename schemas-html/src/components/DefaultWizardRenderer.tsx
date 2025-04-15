import {
  createAction,
  createGroupRenderer,
  FormRenderer,
  GroupRendererProps,
  GroupRenderType,
} from "@react-typed-forms/schemas";
import { VisibleChildrenRenderer } from "./VisibleChildrenRenderer";
import { useControl } from "@react-typed-forms/core";

export interface DefaultWizardRenderOptions {}

export function createWizardRenderer(options?: DefaultWizardRenderOptions) {
  return createGroupRenderer(
    (props, formRenderer) => (
      <VisibleChildrenRenderer
        props={{ ...props, formRenderer, defaultOptions: options }}
        render={renderWizard}
        useChildVisibility={props.useChildVisibility}
        dataContext={props.dataContext}
        parentFormNode={props.formNode}
      />
    ),
    {
      renderType: GroupRenderType.Wizard,
    },
  );
}

function renderWizard(
  props: GroupRendererProps & {
    formRenderer: FormRenderer;
    defaultOptions?: DefaultWizardRenderOptions;
  },
  isChildVisible: (i: number) => boolean,
) {
  const {
    html: { Div },
    renderAction,
  } = props.formRenderer;
  const children = props.formNode.getChildNodes();
  const page = useControl(0);
  const currentPage = page.value;
  const next = createAction("nav", () => {}, "Next");
  const prev = createAction("nav", () => {}, "Previous");
  const nav = (
    <Div>
      {renderAction(next)}
      {renderAction(prev)}
    </Div>
  );
  const content = props.designMode ? (
    <Div>{children.map((child, i) => props.renderChild(i, child))}</Div>
  ) : currentPage < children.length ? (
    props.renderChild(0, children[currentPage])
  ) : (
    <></>
  );

  return (
    <Div>
      {content}
      {nav}
    </Div>
  );
}
