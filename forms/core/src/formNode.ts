import {
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  GroupedControlsDefinition,
  GroupRenderType,
  isDataControl,
  isGroupControl,
} from "./controlDefinition";
import { schemaDataForFieldPath, SchemaDataNode } from "./schemaDataNode";

export type ControlMap = { [k: string]: ControlDefinition };

export class FormNode {
  constructor(
    public id: string,
    public definition: ControlDefinition,
    public tree: FormTree,
    public parent?: FormNode,
  ) {}

  visit<A>(visitFn: (n: FormNode) => A | undefined): A | undefined {
    const res = visitFn(this);
    if (res !== undefined) return res;
    const children = this.getUnresolvedChildNodes();
    for (const child of children) {
      const res = child.visit(visitFn);
      if (res !== undefined) return res;
    }
    return undefined;
  }

  getResolvedChildren(): ControlDefinition[] {
    const childRefId = this.definition.childRefId;
    const parent = childRefId ? this.tree.getByRefId(childRefId) : undefined;
    return (parent ?? this.definition)?.children ?? [];
  }

  createChildNode(childId: string, childDef: ControlDefinition) {
    return new FormNode(
      this.tree.getChildId(this.id, childId, childDef),
      childDef,
      this.tree,
      this,
    );
  }

  getChildNodes(): FormNode[] {
    const resolved = this.getResolvedChildren();
    return resolved.map((x, i) => this.createChildNode(i.toString(), x));
  }

  getUnresolvedChildNodes(): FormNode[] {
    return (
      this.definition.children?.map((x, i) =>
        this.createChildNode(i.toString(), x),
      ) ?? []
    );
  }
}

export interface FormTreeLookup {
  getForm(formId: string): FormTree | undefined;
}

export abstract class FormTree implements FormTreeLookup {
  abstract rootNode: FormNode;

  abstract getByRefId(id: string): ControlDefinition | undefined;

  abstract getForm(formId: string): FormTree | undefined;

  getChildId(
    parentId: string,
    childId: string,
    control: ControlDefinition,
  ): string {
    return parentId + "/" + childId;
  }
}

function getControlIds(
  definition: ControlDefinition,
): [string, ControlDefinition][] {
  const childEntries = definition.children?.flatMap(getControlIds) ?? [];
  return !definition.id
    ? childEntries
    : [[definition.id, definition], ...childEntries];
}

export function createControlMap(control: ControlDefinition): ControlMap {
  return Object.fromEntries(getControlIds(control));
}

class FormTreeImpl extends FormTree {
  controlMap: ControlMap;
  rootNode: FormNode;

  constructor(
    private forms: FormTreeLookup,
    root: ControlDefinition,
  ) {
    super();
    this.rootNode = new FormNode("", root, this);
    this.controlMap = createControlMap(root);
  }

  getByRefId(id: string): ControlDefinition | undefined {
    return this.controlMap[id];
  }

  getForm(formId: string): FormTree | undefined {
    return this.forms.getForm(formId);
  }
}

export function legacyFormNode(definition: ControlDefinition) {
  return createFormTree([definition]).rootNode.getChildNodes()[0];
}

export function createFormTree(
  controls: ControlDefinition[],
  getForm: FormTreeLookup = { getForm: () => undefined },
): FormTree {
  return new FormTreeImpl(getForm, {
    type: ControlDefinitionType.Group,
    children: controls,
    groupOptions: {
      type: GroupRenderType.Standard,
      hideTitle: true,
    },
  } as GroupedControlsDefinition);
}

export function createFormLookup<A extends Record<string, ControlDefinition[]>>(
  formMap: A,
): {
  getForm(formId: keyof A): FormTree;
} {
  const lookup = {
    getForm,
  };
  const forms = Object.fromEntries(
    Object.entries(formMap).map(([k, v]) => [k, createFormTree(v, lookup)]),
  );
  return lookup;

  function getForm(formId: keyof A): FormTree {
    return forms[formId as string];
  }
}

export function fieldPathForDefinition(
  c: ControlDefinition,
): string[] | undefined {
  const fieldName = isGroupControl(c)
    ? c.compoundField
    : isDataControl(c)
      ? c.field
      : undefined;
  return fieldName?.split("/");
}

export function lookupDataNode(
  c: ControlDefinition,
  parentNode: SchemaDataNode,
) {
  const fieldNamePath = fieldPathForDefinition(c);
  return fieldNamePath
    ? schemaDataForFieldPath(fieldNamePath, parentNode)
    : undefined;
}

/**
 * @deprecated use visitFormNodeData instead
 */
export function visitControlDataArray<A>(
  controls: ControlDefinition[] | undefined | null,
  context: SchemaDataNode,
  cb: (
    definition: DataControlDefinition,
    node: SchemaDataNode,
  ) => A | undefined,
): A | undefined {
  if (!controls) return undefined;
  for (const c of controls) {
    const r = visitControlData(c, context, cb);
    if (r !== undefined) return r;
  }
  return undefined;
}

/**
 * @deprecated use visitFormDataInContext instead
 */
export function visitControlData<A>(
  definition: ControlDefinition,
  ctx: SchemaDataNode,
  cb: (
    definition: DataControlDefinition,
    field: SchemaDataNode,
  ) => A | undefined,
): A | undefined {
  return visitFormDataInContext(ctx, legacyFormNode(definition), (n, d) =>
    cb(d, n),
  );
}

export type ControlDataVisitor<A> = (
  dataNode: SchemaDataNode,
  definition: DataControlDefinition,
) => A | undefined;

export function visitFormData<A>(
  node: FormNode,
  dataNode: SchemaDataNode,
  cb: ControlDataVisitor<A>,
  notSelf?: boolean,
): A | undefined {
  const def = node.definition;
  const result = !notSelf && isDataControl(def) ? cb(dataNode, def) : undefined;
  if (result !== undefined) return result;
  if (dataNode.elementIndex == null && dataNode.schema.field.collection) {
    const l = dataNode.control.elements.length;
    for (let i = 0; i < l; i++) {
      const elemChild = dataNode.getChildElement(i);
      const elemResult = visitFormData(node, elemChild, cb);
      if (elemResult !== undefined) return elemResult;
    }
    return undefined;
  }
  if (dataNode.control.isNull) return undefined;
  const children = node.getChildNodes();
  const l = children.length;
  for (let i = 0; i < l; i++) {
    const elemResult = visitFormDataInContext(dataNode, children[i], cb);
    if (elemResult !== undefined) return elemResult;
  }
  return undefined;
}

export function visitFormDataInContext<A>(
  parentContext: SchemaDataNode,
  node: FormNode,
  cb: ControlDataVisitor<A>,
): A | undefined {
  const dataNode = lookupDataNode(node.definition, parentContext);
  return visitFormData(node, dataNode ?? parentContext, cb, !dataNode);
}

export interface FormDataNode {
  parent?: FormDataNode;
  formNode: FormNode;
  parentData: SchemaDataNode;
  childIndex?: number;
}

export function visitFormDataNode<A>(
  node: FormDataNode,
  visitFn: (node: FormDataNode, data?: SchemaDataNode) => A | undefined,
): A | undefined {
  const dataNode = lookupDataNode(node.formNode.definition, node.parentData);
  const v = visitFn(node, dataNode);
  if (v !== undefined) return v;

  const parentData = dataNode ?? node.parentData;
  if (parentData.schema.field.collection && parentData.elementIndex == null) {
    const elemCount = parentData.control.elements.length;
    for (let i = 0; i < elemCount; i++) {
      const v = visitChildren(parentData.getChildElement(i));
      if (v !== undefined) return v;
    }
    return undefined;
  } else {
    return visitChildren(parentData);
  }

  function visitChildren(parentData: SchemaDataNode) {
    const children = node.formNode.getChildNodes();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const res = visitFormDataNode(
        {
          formNode: child,
          parent: node,
          parentData,
          childIndex: i,
        },
        visitFn,
      );
      if (res !== undefined) return res;
    }
  }
}
