# Forms-Core Tree Traversal Semantics

The system has **three parallel tree structures** that work together to render schema-driven forms:

## 1. FormNode Tree (UI Definition)

**Purpose:** Defines *what controls to display* and their nesting structure.

Each `FormNode` wraps a `ControlDefinition` and provides parent/child navigation. Children are derived from `definition.children` or resolved from external references via `childRefId`.

**Child resolution** (`getResolvedChildren`):
- No `childRefId` → uses `definition.children` directly
- Local ref (e.g. `"myId"`) → looks up definition by id within the same form tree
- External form ref (`"/formId"`) → gets root children from another form
- External node ref (`"/formId/nodeId"`) → gets children of a specific node in another form

**Two child accessors:**
- `getChildNodes()` → resolves refs, used for rendering
- `getUnresolvedChildNodes()` → raw definition children only, used by `visit()`

**IDs:** Concatenated parent index path: `"root/0/1/2"`

## 2. SchemaNode Tree (Data Structure)

**Purpose:** Defines *what data fields exist* and their types/nesting.

The root is a synthetic `Compound` field wrapping the top-level `SchemaField[]`. Children come from compound field's `children` array.

**Schema resolution** (`getResolvedParent`):
- If field has `schemaRef` → follows reference to a named schema (via `SchemaTreeLookup`)
- If field has `treeChildren: true` → walks up to parent and resolves *its* parent (schema inheritance)
- Otherwise → uses own children

This means `getResolvedFields()` may return fields from a *different* schema than the node's own definition.

**Path navigation:**
- `resolveSchemaNode(node, segment)` — "." = self, ".." = parent, otherwise child by field name
- `schemaForFieldPath(["address", "street"], root)` — walks segments sequentially, creates missing-field nodes for unknown segments (permissive, never throws)
- `schemaForDataPath` — like `schemaForFieldPath` but also tracks whether the final position is inside a collection element (returns `DataPathNode { node, element }`)

**IDs:** Slash-separated field names: `"/address/street"`

## 3. SchemaDataNode Tree (Runtime Data Binding)

**Purpose:** Binds actual `Control<T>` instances to their corresponding schema positions.

Each node holds: a `SchemaNode` (what field), a `Control<any>` (the live data), and an optional `elementIndex` (position within an array).

**Two kinds of children:**
- `getChild(schemaNode)` → navigates into a named field: accesses `control.fields[fieldName]`. If the child schema field is `meta`, it reads from the control's meta storage instead.
- `getChildElement(index)` → navigates into an array element: accesses `control.elements[index]`. The resulting node keeps the *same* schema but records the elementIndex.

**The elementIndex distinction is critical:**
- `elementIndex == undefined` → node points to the collection field itself (the array)
- `elementIndex != undefined` → node points to a specific element within the array

**Path navigation** (`schemaDataForFieldPath`):
- ".." → parent data node
- "." → self
- field name → resolves schema child, then gets corresponding data child
- Unknown fields → creates an isolated data node with `newControl(undefined)`

**Two implementations of `SchemaDataTree`:**
- `SchemaDataTreeImpl` — real data binding, reads from actual control hierarchy
- `IsolatedSchemaDataTree` — creates disconnected nodes with empty controls (for editor/preview scenarios without real data)

## Cross-Tree Traversal: How They Connect

The key bridge is `visitFormData` / `visitFormDataInContext` in `formNode.ts`:

```
visitFormDataInContext(parentDataNode, formNode, callback)
```

1. Extracts the field path from `formNode.definition` (via `fieldPathForDefinition`)
   - For data controls: `definition.field` (e.g. `"address/street"`)
   - For group controls: `definition.compoundField`
2. Navigates from `parentDataNode` to the matching `SchemaDataNode` using `schemaDataForFieldPath`
3. Calls `visitFormData(formNode, dataNode, callback)`

**`visitFormData` logic:**
1. If the current node is a data control, invoke the callback with `(dataNode, definition)`
2. **Collection expansion:** If `dataNode` is on a collection field and `elementIndex == null`, iterate through all array elements and recursively visit each one — this is how a single form definition fans out over N array items
3. If the control value is null, stop (don't descend into null compound objects)
4. Otherwise, recurse into `formNode.getChildNodes()`, calling `visitFormDataInContext` for each child

## resolveChildren.ts: Rendering-Time Resolution

`defaultResolveChildNodes` is the runtime bridge used by `FormStateNode` to produce actual rendered children:

- **Checklist/Radio data controls** with child nodes → creates one child per field option value (not per schema child)
- **Collection fields** (`data.schema.field.collection && elementIndex == null`) → calls `resolveArrayChildren`, producing one `ChildNodeSpec` per array element, each with a `getChildElement(i)` as parent data context
- **Everything else** → maps `formNode.getChildNodes()` directly to child specs

## Reactive Proxy Design: Control-Backed Definitions

A key design constraint is that `SchemaField` and `ControlDefinition` objects may be **reactive proxies** backed by `Control` instances, not plain objects. This enables editor scenarios where modifying a field's properties automatically triggers re-renders and recomputation throughout the tree.

**How it works:**

The `trackedValue(control)` function wraps a `Control<T>` in a `Proxy` that:
- Intercepts property access to return nested `trackedValue()` proxies for child fields
- Registers change listeners so that any property read is tracked for reactivity
- Stores the original `Control` reference on a hidden symbol (`restoreControlSymbol`)

The result is an object that *looks like* a plain `SchemaField` or `ControlDefinition` but transparently tracks which properties are accessed and re-evaluates when they change.

**Recovering the Control:**

`unsafeRestoreControl(value)` retrieves the underlying `Control` from a proxied value via the hidden symbol. This is used by editor code to manipulate the data (add/remove children, update properties) while the rest of the system treats the value as a plain interface.

**Impact on tree nodes:**

- `SchemaNode.field` may be a proxied `Control<SchemaField>` — accessing `.field`, `.children`, `.collection` etc. triggers reactive tracking
- `FormNode.definition` may be a proxied `Control<ControlDefinition>` — accessing `.children`, `.renderOptions` etc. triggers reactive tracking
- `SchemaNode.getUnresolvedFields()` may return proxied children (e.g. via a `getChildFields` function that calls `trackedValue`)
- Node identity in editors uses `Control.uniqueId` (recovered via `unsafeRestoreControl`) rather than field names, since field names can change

**Two modes of operation:**

- **Runtime rendering:** Trees are typically constructed from static JSON definitions — no proxies, no reactivity on the definitions themselves (data reactivity comes from `SchemaDataNode`'s `Control` bindings)
- **Editor/design-time:** Trees are constructed from `Control`-backed proxied values (see `EditorSchemaTree`, `EditorFormTree`), so that editing a field name, adding a child, or changing a property reactively updates all dependent computations

This dual-mode design means tree traversal code (`SchemaNode`, `FormNode`, `visitFormData`, etc.) is written to work identically with both plain objects and proxied Controls — it never assumes mutability or immutability of the underlying definitions.

## Usage Examples From Consumer Packages

### FormNode Examples

**Editor tree traversal** — `astrolabe-basic-editor/src/EditorFormTree.ts` uses `visit()` with `getUnresolvedChildNodes()` to find a node and its parent by ID:
```typescript
findNodeWithParent(nodeId: string) {
  return this.rootNode.visit((x) => {
    const children = x.getUnresolvedChildNodes();
    for (let i = 0; i < children.length; i++) {
      if (children[i].id === nodeId)
        return { node: children[i], parent: x, indexInParent: i };
    }
  });
}
```

**Ref lookup** — `astrolabe-schemas-editor/src/EditorFormTree.ts` uses `visit()` to find a definition by its `id` property (for `childRefId` resolution):
```typescript
getNodeByRefId(id: string): FormNode | undefined {
  return this.rootNode.visit((x) => (x.definition.id === id ? x : undefined));
}
```

**Building editor tree nodes** — `astrolabe-schemas-editor/src/FormControlTree.tsx` uses `getUnresolvedChildNodes()` (not resolved) to build the editor's tree panel, since the editor needs to show the raw structure without expanding refs:
```typescript
const treeNodes = tree.rootNode
  .getUnresolvedChildNodes()
  .map((x) => toControlNode(x, rootSchema));
```

**Data grid columns** — `astrolabe-schemas-datagrid/src/DataGridControlRenderer.tsx` uses `getChildNodes()` (resolved) to build column definitions, since each child FormNode represents a column:
```typescript
const stdColumns = formNode.getChildNodes().map((cn, i) => {
  const d = cn.definition;
  const colOptions = d.adornments?.find(isColumnAdornment);
  return { ...colOptions, id: "c" + i, title: d.title ?? "Column " + i };
});
```

**Adding/removing fields** — `astrolabe-basic-editor/src/fieldActions.ts` uses `findNodeWithParent()` to locate where to insert, then `formTree.addNode()` to create a new child. Deletion recovers the backing Control via `getEditableDefinition()` and calls `removeElement()`:
```typescript
const found = formTree.findNodeWithParent(selected.id);
parent = found.parent;
const newNode = formTree.addNode(parent, controlDef, afterNode, true);
```

### SchemaNode Examples

**Field selection UI** — `astrolabe-schemas-editor/src/renderer/FieldSelectionRenderer.tsx` walks the schema tree to present a field picker. It checks `node.field.collection` to decide whether to show array indicators, and uses `getResolvedParent()` to navigate compound hierarchies:
```typescript
if (parentNode.field.collection) { /* show array indicator */ }
const parent = n.getResolvedParent(true);
parent?.getUnresolvedFields().map((x) => n.createChildNode(x));
```

**Schema-aware searching** — `astrolabe-schemas-datagrid/src/clientSearching.ts` uses `getChildNodes()` to iterate all fields for client-side text search across a data grid:
```typescript
schemaNode.getChildNodes().forEach((childNode) => {
  const text = schemaInterface.searchText(childNode.field, rowData[childNode.field.field]);
  if (text?.toLowerCase().includes(query)) matched = true;
});
```

**Resolving schema from a control definition** — `astrolabe-schemas-editor/src/FormControlTree.tsx` uses `schemaForFieldPath()` to find the SchemaNode that a data control's `field` path points to:
```typescript
const fieldSchema = schemaForFieldPath(
  definition.field.split("/"), parentSchemaNode
);
```

**Collecting resolved fields for diff** — `schemas/src/util.ts` uses `getChildNodes()` on compound nodes to walk all fields when computing data diffs:
```typescript
const children = dataNode.schema.getChildNodes();
Object.fromEntries(children.flatMap((c) => {
  const diff = getDiffObject(dataNode.getChild(c));
  return diff !== undefined ? [[c.field.field, diff]] : [];
}));
```

### SchemaDataNode Examples

**Runtime form rendering** — `schemas/src/RenderForm.tsx` creates the root SchemaDataNode by binding a SchemaNode to a Control, then passes it to `createFormStateNode()`:
```typescript
const schemaDataNode = createSchemaDataNode(
  createSchemaTree(fields).rootNode, control
);
const state = createFormStateNode(form, schemaDataNode, globals, options);
```

**Design-time preview** — `astrolabe-basic-editor/src/components/FormCanvas.tsx` uses `IsolatedSchemaDataTree` (no real data) so the editor can render a form preview without requiring actual data:
```typescript
const previewNode = createPreviewNode(
  "root", defaultSchemaInterface, rootNode,
  new IsolatedSchemaDataTree(schemaRootNode).rootNode, formRenderer
);
```

**Navigating to nested data** — `astrolabe-schemas-datagrid/src/PagerRenderer.tsx` uses `schemaDataForFieldPath()` to reach a deeply nested control by path:
```typescript
const total = schemaDataForFieldPath(["results", "total"], parent)
  .control as Control<number>;
```

**Array element iteration for diffs** — `schemas/src/util.ts` checks `elementIndex == null` to distinguish between the array itself and an element, then uses `getChildElement(i)` to walk each element:
```typescript
if (sf.collection && dataNode.elementIndex == null) {
  return c.as<any[]>().elements.map((x, i) => {
    const change = getDiffObject(dataNode.getChildElement(i));
    return { old: getElementIndex(x)?.initialIndex, edit: change };
  });
}
```

**Building expression evaluation context** — `forms/core/src/evalExpression.ts` walks `dataNode.parent` to build a path from root, using `elementIndex` to distinguish array positions from field names:
```typescript
function getSchemaPath(dataNode: SchemaDataNode): PathSegment[] {
  return traverseParents(dataNode, (d) => ({
    key: d.elementIndex == null ? d.schema.field.field : d.elementIndex,
    collection: d.schema.field.collection,
  }), (x) => !x.parent);
}
```

**Display-only rendering** — `schemas-html/src/components/DefaultDisplayOnly.tsx` receives a SchemaDataNode and uses both `.schema.field` (for type info) and `.control.value` (for the current value) to render read-only text:
```typescript
schemaInterface.isEmptyValue(dataNode.schema.field, dataNode.control.value)
  ? emptyText
  : schemaInterface.textValueForData(dataNode)
```

## Field Validity: `onlyForTypes` Discrimination

`validDataNode` implements type-discriminated fields: if a schema field has `onlyForTypes`, the system finds the sibling `isTypeField` and checks if its current value is in the allowed types list. Invalid nodes are hidden from the form.