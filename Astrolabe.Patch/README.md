# Astrolabe.Patch

Server-side library for applying efficient JSON patch documents to database entities. Designed for bulk updates where only changed fields are sent over the wire.

Part of the astrolabe apps library stack.

## JSON Patch Format

Unlike RFC 6902 JSON Patch, this library uses a simpler delta-based format optimized for form-based editing.

### Object Patches

For objects, only fields which have changed are included in the patch:

**Original:**
```json
{
  "first": "Jolse",
  "last": "McGuiness"
}
```

**Edited:**
```json
{
  "first": "Jolse",
  "last": "Maginnis"
}
```

**Patch:**
```json
{
  "last": "Maginnis"
}
```

### Array Patches

Arrays need special handling because elements can be re-ordered or deleted. There are two scenarios depending on whether elements have an identifying field.

#### Identified Elements (e.g. by `id`)

Each remaining element includes at least its id field. The server infers deletions from missing ids:

**Original:**
```json
[
  {"id": 1, "value": "Foo"},
  {"id": 2, "value": "Bar"},
  {"id": 3, "value": "FooBar"}
]
```

**Edited (reordered, deleted id 1, changed id 2):**
```json
[
  {"id": 3, "value": "FooBar"},
  {"id": 2, "value": "BarChanged"}
]
```

**Patch:**
```json
[
  {"id": 3},
  {"id": 2, "value": "BarChanged"}
]
```

#### Unidentified Elements (index-based)

Elements without an id use `old` to reference the original array index, and `edit` for the optional patch:

**Original:**
```json
["Foo", "Bar", "FooBar"]
```

**Edited:**
```json
["FooBar", "BarChanged"]
```

**Patch:**
```json
[
  {"old": 2},
  {"old": 1, "edit": "BarChanged"}
]
```

Elements without an `old` property are treated as new entries.

## Usage

### Defining Patch Columns

Subclass `PatchColumns<TJson, TDb, TContext>` to map JSON fields to database entity updates:

```csharp
public class GroupPatchColumns : PatchColumns<GroupEdit, GroupEntity, AppDbContext>
{
    public GroupPatchColumns()
    {
        Add(x => x.Name, (db, node) => db.Name = node.GetValue<string>());
        Add(x => x.OrderIndex, (db, node) => db.OrderIndex = node.GetValue<int>());
    }
}
```

The `Add` method uses an expression to resolve the JSON property name (respecting `[JsonPropertyName]` attributes), ensuring the mapping stays in sync with the DTO type.

### Applying Patches

```csharp
var patchColumns = new GroupPatchColumns();
patchColumns.RunPatch(jsonNode, dbEntity, dbContext);
```

`RunPatch` iterates over the registered columns and only applies updates for fields present in the patch JSON.

### Patching Collections

Use `PatchCollection` within a column definition to handle array patches:

```csharp
PatchCollection(
    jsonNode,
    existingItems,
    edit: (node, existing) => { /* apply edits, return true if changed */ },
    newEntity: (node) => { /* create new entity from node */ },
    action: (results) => { /* handle Added, Removed, Existing lists */ },
    matchId: ("id", (entity, idNode) => entity.Id == idNode.GetValue<int>())
);
```

When `matchId` is provided, elements are matched by id field (Case 1). When omitted, elements use the `old` index-based format (Case 2).