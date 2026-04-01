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

## Field Validity: `onlyForTypes` Discrimination

`validDataNode` implements type-discriminated fields: if a schema field has `onlyForTypes`, the system finds the sibling `isTypeField` and checks if its current value is in the allowed types list. Invalid nodes are hidden from the form.