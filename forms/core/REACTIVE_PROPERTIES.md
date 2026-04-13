# Reactive Property System in `formStateNode.ts`

## Overview

The form state system has **two layers** of reactive computation:

1. **`createEvaluatedDefinition`** — Creates a `Proxy` over the static `ControlDefinition`, allowing dynamic expressions to override definition-level fields (`hidden`, `readonly`, `title`, `defaultValue`, etc.)
2. **`initFormState`** — Computes runtime state properties (`visible`, `disabled`, `style`, `fieldOptions`, etc.) and wires up side effects (clearing hidden values, syncing touched/errors, applying defaults)

## The Override Proxy Pattern

The `createOverrideProxy(target, handlers)` function (from `overrideProxy.ts`) creates a JS `Proxy` where:
- Each key in `handlers` is a `Control<any>` field
- On property access, if the handler field's value is **not** `NoOverride`, the override value is returned
- Otherwise, the original target value falls through

This means reading `definition.hidden` may return either the original `def.hidden` or a dynamically-computed value, depending on whether a `DynamicPropertyType.Visible` expression was evaluated.

## The `evalExpr` Function

Created via `createEvalExpr` (`evalExpression.ts:125`), this is the core mechanism:

```typescript
evalExpr(scope, init, controlTarget, expression, coerce): boolean
```

- Sets `controlTarget.value = init` (the static/default value)
- If `expression` exists, evaluates it and sets `controlTarget.value = coerce(result)` reactively
- Returns `true` if an expression was evaluated

The expression evaluator runs inside a reactive tracking context, so when underlying data changes (e.g., a referenced field value), the expression re-evaluates and updates the target control automatically.

## Layer 1: `createEvaluatedDefinition`

Creates 4 override handler controls forming a nested proxy hierarchy:

```
definitionOverrides ──► Proxy over `def` (the returned "definition")
  ├─ displayOverrides ──► Proxy over `def.displayData` (via computed displayData field)
  ├─ groupOptionsOverrides ──► Proxy over group options (via computed groupOptions field)
  └─ renderOptionsOverrides ──► Proxy over `def.renderOptions` (via computed renderOptions field)
        └─ groupOptionsOverrides ──► Proxy over `def.renderOptions.groupOptions` (for DataGroup)
```

### Computed nested proxy wiring

These `updateComputedValue` calls set up the nested proxies so that accessing `definition.groupOptions.columns` (for example) hits the right override:

| Computed field | Condition | Creates proxy over | With overrides |
|---|---|---|---|
| `definitionOverrides.renderOptions` | DataControl | `def.renderOptions` | `renderOptionsOverrides` |
| `renderOptionsOverrides.groupOptions` | DataControl + DataGroupRenderer | `def.renderOptions.groupOptions` | `groupOptionsOverrides` |
| `definitionOverrides.groupOptions` | GroupControl or DataGroupRenderer | group options from def | `groupOptionsOverrides` |
| `definitionOverrides.displayData` | DisplayControl | `def.displayData` | `displayOverrides` |

### Dynamic property evaluations

Each entry reads a `DynamicProperty` from `def.dynamic[]` by type and writes to an override control:

| DynamicPropertyType | Target override | Init value | Coercion | Scope |
|---|---|---|---|---|
| **Visible** | `definitionOverrides.hidden` | `def.hidden` if expr exists, else `!!def.hidden` (see note below) | `(r) => !r` (invert) | `definitionOverrides` (via `evalDynamic`) |
| **Readonly** | `definitionOverrides.readonly` | `isControlReadonly(def)` | `(r) => !!r` | `definitionOverrides` (via `evalDynamic`) |
| **Disabled** | `definitionOverrides.disabled` | `isControlDisabled(def)` | `(r) => !!r` | `definitionOverrides` |
| **GridColumns** | `groupOptionsOverrides.columns` | `(groupOptions as Grid)?.columns` | `(r) => typeof r === "number" ? r : undefined` | `groupOptionsOverrides` |
| **DefaultValue** | `definitionOverrides.defaultValue` | `def.defaultValue` (DataControl only) | `(r) => r` (identity) | `definitionOverrides` |
| **ActionData** | `definitionOverrides.actionData` | `def.actionData` (ActionControl only) | `(r) => r` (identity) | `definitionOverrides` |
| **Label** | `definitionOverrides.title` | `def.title` | `coerceString` | `definitionOverrides` |

**Visible init value semantics**: The init function `(x) => (x ? def.hidden : !!def.hidden)` has two branches:
- **Expression exists** (`x` is defined): init is `def.hidden` (preserves `null`/`undefined`). This means `definition.hidden` is `null` until the expression evaluates, so `visible` is also `null` — indicating "not yet determined" (e.g. an async script hasn't returned yet). Once the expression fires, `hidden` gets the coerced result and `visible` resolves to `true` or `false`.
- **No expression** (`x` is undefined): init is `!!def.hidden`, which coerces `null`/`undefined` to `false`. This immediately sets `hidden = false`, so `visible` is `true` right away. A control with no Visible script is never in the "not yet determined" state.

### The `display` → `displayData.text/html` bridge

This is a special `createSyncEffect` (not `evalExpr`) that reacts to the `display` control (which is set externally by `initFormState`). When `display.value` changes:
- If the def is a DisplayControl: sets `displayOverrides.text` (for TextDisplay) or `displayOverrides.html` (for HtmlDisplay)
- Otherwise: sets both to `NoOverride` (fall through to original)

### `evalDynamic` vs `createScopedEffect` usage

Two patterns are used:
- **`evalDynamic`**: Wraps `evalExpr` in a `createScopedEffect` on a given parent scope. The scope determines cleanup — when the parent scope is cleaned up, the effect is removed. For `Visible` and `Readonly`, the scope is `definitionOverrides` itself.
- **Direct `createScopedEffect`**: Used for properties that need conditional expression lookup (e.g., only evaluate `DefaultValue` for DataControls). These also scope to `definitionOverrides` or `groupOptionsOverrides`.

The important distinction: `evalDynamic` uses `scope` (the overall `definitionOverrides` control) as the parent, while `Disabled`, `GridColumns`, etc. use their respective override controls as the scoped effect parent.

## Layer 2: `initFormState`

Takes the original `def` and the `FormStateNodeImpl`, creates the evaluated definition, and wires up all the runtime state.

### State-level dynamic properties

These evaluate dynamic expressions into the `resolved` state object (not definition overrides):

| DynamicPropertyType | Target | Init | Coercion |
|---|---|---|---|
| **Display** | `resolved.display` | `undefined` | `coerceString` |
| **Style** | `resolved.style` | `undefined` | `coerceStyle` (object or undefined) |
| **LayoutStyle** | `resolved.layoutStyle` | `undefined` | `coerceStyle` |
| **AllowedOptions** | `base.allowedOptions` | `undefined` | `(x) => x` (identity) |

Note: `display` is evaluated here but consumed in `createEvaluatedDefinition` (passed as the `display` parameter) to bridge into `displayData.text/html`.

### Computed state properties

**`dataNode`**:
```
lookupDataNode(definition, parent)
```
Resolves the schema data node by looking up `definition.field` (DataControl) or `definition.compoundField` (GroupControl) in the parent schema data tree. Reactive because `definition` is a proxy — if the field changes dynamically, the data node updates.

**`visible`**:
```
if forceHidden → false
if parent not visible → inherit parent.visible
if dataNode invalid or display-only → false
if definition.hidden is null → null (visibility not yet determined)
else → !definition.hidden
```
The three possible values of `visible`:
- **`true`**: explicitly visible. This is the immediate state for controls with no Visible script (since the init value coerces `!!def.hidden` to `false`, making `!false = true`).
- **`false`**: explicitly hidden.
- **`null`**: visibility not yet determined. This only occurs when a Visible script expression exists but hasn't evaluated yet (e.g. an async jsonata expression is pending). Once the expression returns, `visible` resolves to `true` or `false`. Controls with no Visible script never have `null` visibility — they are immediately `true` (or `false` if `def.hidden` was statically set).

The `null` state matters for default value application: defaults are only applied when `visible` is truthy (`true`), not when it's `null`. This prevents defaults from firing before an async visibility script has resolved.

**`readonly`**:
```
parentNode?.readonly || forceReadonly || isControlReadonly(definition)
```
Inherits from parent, can be forced, or comes from the (possibly overridden) definition.

**`disabled`**:
```
parentNode?.disabled || forceDisabled || isControlDisabled(definition)
```
Same inheritance pattern as readonly.

**`fieldOptions`**:
```
schemaInterface.getDataOptions(dataNode) filtered by allowedOptions
```
If `allowedOptions` (from the AllowedOptions dynamic property) is non-empty, filters the schema-provided options to only include those values. Each allowed value is matched to its `FieldOption` from the schema, or a synthesized `{ name, value }` if not found.

### Side effects

**Disabled sync**: Pushes `disabled` state down to `dataNode.control.disabled`.

**Touched sync**: Bidirectional — syncs `touched` between the FormStateNode base control and the data node control.

**Errors sync**: Copies `dataNode.control.errors` to the base control.

**Validation**: Calls `setupValidation` which registers validators from `definition.validators` and the schema field's required constraint, running them reactively.

**Default value / clear hidden**:
- When `visible` becomes `false` AND `clearHidden` is enabled AND `!definition.dontClearHidden` → sets `dataNode.control.value = undefined`
- When `visible` becomes `true` AND `dataNode.control.value === undefined` AND `definition.defaultValue != null` (and no Optional adornment, not NullToggle) → sets value to `definition.defaultValue`

This means dynamic `DefaultValue` works because the proxied `definition.defaultValue` can change reactively.

### Children

`initChildren` sets up a reactive `createSyncEffect` that:
1. Calls `resolveChildren(formImpl)` to get child specs
2. Uses `updateElements` to diff children by key
3. Reuses existing children (updating `childIndex`) or creates new `FormStateNodeImpl` instances
4. Cleans up detached children

The child map ensures stable identity across re-renders — a child with the same key is reused rather than recreated.

## Data flow summary

```
def.dynamic[] ──► createEvaluatedDefinition ──► proxied "definition"
                                                    │
                        ┌───────────────────────────┘
                        ▼
                  initFormState
                        │
            ┌───────────┼──────────────┐
            ▼           ▼              ▼
      state-level    computed      side effects
      dynamics:      state:        ┌── disabled → dataNode
      display        visible       ├── touched sync
      style          readonly      ├── errors sync
      layoutStyle    disabled      ├── validation
      allowedOptions dataNode      ├── default value / clear hidden
                     fieldOptions  └── children init
```
