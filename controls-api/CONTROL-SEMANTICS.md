# Control Tree Semantics

Reference document for clean-room implementation. Extracted from `astrolabe-controls` source.

## Tree Structure

A control tree is a hierarchy of nodes. Each node holds:
- `value`, `initialValue` — the data
- `flags` — Touched, Disabled, ChildInvalid, DontClearError
- `errors` — `Record<string, string>` or undefined
- `fields` — named children (object controls), lazily created
- `elems` — indexed children (array controls), lazily created
- `parents` — back-references: `{ control, key, origKey? }[]`

Children are created lazily on first access. A control may have multiple parents (shared children).

## A. Value Propagation (Downward)

When a parent's value is set:

1. Equality check — if equal (deep or custom), stop
2. Store new value
3. If not DontClearError, clear own errors
4. **Sync existing fields down**: for each already-created field `k`, set `child.value = parentValue[k]` (with `from=parent` to prevent upward bounce)
5. **Sync existing elements down**: reuse/create/trim element children to match new array length. Existing children get their values updated. New children are created. Surplus children are detached.
6. Propagate to parents (upward, see B)
7. Notify subscribers: Value change (+ Structure if null transition)

**Structure change**: flagged when value transitions between null/non-null, or when array length changes.

**Important**: Only already-created children are synced. Uncreated fields pick up correct values lazily when first accessed.

## B. Value Propagation (Upward)

When a child's value changes:

1. For each parent (except `from`):
   - Shallow-copy the parent's value (spread object or array)
   - Overwrite the child's key with the new child value
   - Set the parent's value to the copy

**Loop prevention**: Two mechanisms:
- `from` parameter: child skips the parent that triggered it
- Equality check: when parent pushes the same value back to the originating child, the equality check at the top exits early

## C. Initial Value Propagation

**Downward only** — no upward propagation.

When initialValue is set:
1. Equality check
2. Store new initialValue
3. Sync to existing field children: `child.initialValue = parentInitialValue[k]`
4. Sync to existing element children: same pattern as value sync but for initialValue
5. Notify subscribers: InitialValue change

Dirty = `!isEqual(value, initialValue)`. Dirty change detection is computed lazily by `getChangeState()` during listener notification.

## D. Field Creation (Lazy)

On `control.fields.someField` (first access):

1. If already cached, return
2. Extract `value[fieldName]` and `initialValue[fieldName]` (undefined if parent null or key missing)
3. Inherit Disabled + Touched flags from parent
4. Create child with field-specific setup (validator, equals, nested fields) if configured
5. Set parent link: `{ control: parent, key: fieldName }` (no origKey for fields)
6. Run init (validators, eager sub-fields, afterCreate)
7. Cache in fields map

## E. Element Creation and Sync

### First access

Creates element children from the parent's value array. Each element gets:
- value from `parentValue[i]`, initialValue from `parentInitialValue[i]`
- Inherited Disabled + Touched flags
- Parent link with `key=index, origKey=index` (initial=true)

### Sync on value change (parent value set)

Reuses existing children by index:
- **Existing children** (index < old length): update value (with `from=parent`), DON'T update initialValue
- **New children** (index >= old length): create fresh
- **Surplus children** (old length > new length): detach parent link

### Sync on initialValue change (parent initialValue set)

- **Existing children**: update initialValue + re-key origKey, DON'T update value
- **New children**: create fresh
- **Surplus**: detach

### Array mutations (add/remove/update elements)

`updateElements(control, cb)`:
1. Get old elements, compute new elements via callback
2. Detach removed elements (clear parent link)
3. Re-key all new elements to their new indices
4. Clear ChildInvalid, propagate validity
5. Reconstruct parent value from element values
6. Signal Structure change

### origKey tracking

- `key`: current index (updated on reorder)
- `origKey`: index when element was part of initial value (set when `initial=true`)

## F. Touched/Disabled Propagation

**Cascade downward by default.** `notChildren` parameter opts out.

- `setTouched(touched, notChildren?)`: set/clear flag, recurse to existing children unless notChildren
- `setDisabled(disabled, notChildren?)`: same pattern

**At child creation**: Disabled and Touched flags inherited from parent. ChildInvalid and DontClearError are NOT inherited.

## G. Error/Validity Propagation

### Setting errors

- `setError(key, error)`: set/remove a single keyed error, propagate validity if error-presence changes
- `setErrors(errors)`: bulk replace, propagate validity if changed
- `clearErrors()`: recurse to all existing children first, then clear own errors

### Validity propagation (upward)

When a child's error presence changes (had errors -> no errors, or vice versa):
1. For each parent:
   - If child has errors AND parent already has ChildInvalid: skip (optimization)
   - Otherwise: set/clear parent's ChildInvalid flag in a transaction
   - Continue up the tree recursively

### isValid()

1. Own errors? -> false
2. ChildInvalid flag? -> false (fast path)
3. Call childrenValid() — checks all existing children recursively
4. If any child invalid, set ChildInvalid flag (cache for next time)

**Note**: Only checks existing (already-created) children. Uncreated fields with validators aren't considered until accessed.

## H. Transaction Batching

**Purpose**: defer subscriber notifications until all mutations in a batch complete.

### runTransaction(control, fn)

1. Increment transaction count
2. Run mutation callback
3. If nested (count > 1): queue control for later listener run
4. If outermost (count = 1): run listeners now (fast path if only this control) or drain queue

### groupedChanges(fn)

Increment count, run callback, decrement, drain. Individual mutations inside handle their own queueing.

### Drain loop (runPendingChanges)

While count=0 and items pending:
1. Enter temp transaction (count=1) to prevent re-entrance
2. Priority: run queued listeners before afterChanges callbacks
3. Snapshot queue, clear it, run all
4. Loop continues if running listeners queued new items

## I. Control Setup (Validators)

During init (`attach` / `initControl`):

1. **Validator**: if configured:
   - Run immediately (validate initial value)
   - Subscribe to Value | Validate changes for re-running
   - Set DontClearError flag (value changes don't auto-clear validator errors)

2. **Eager field creation**: for any field with a validator, create it now (triggers the field's own validator)

3. **Eager element init**: if element setup exists, create all element children now

4. **Meta**: copy metadata from setup

5. **afterCreate**: run user callback

## J. Cleanup

`cleanup()`:
1. Run registered cleanup callbacks
2. For each existing child: cleanup only if child has exactly 1 parent (shared children survive)

Parent links removed via `updateParentLink(parent, undefined)` — filters the entry from the child's parents array.

## Key Invariants

1. Value propagation is bidirectional, cycle-safe (from param + equality check)
2. InitialValue propagation is downward-only
3. Child creation is lazy, except fields with validators (eagerly created)
4. Disabled/Touched inherited at creation + cascade down on set
5. Validity propagates upward; isValid() lazily recomputes via childrenValid()
6. Transactions batch listener notifications to outermost boundary
7. Cleanup is conditional on single-parent children