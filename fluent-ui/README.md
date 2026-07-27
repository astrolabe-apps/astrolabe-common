![npm](https://img.shields.io/npm/v/@react-typed-forms/fluent-ui?style=plastic)

FluentUI v9 form controls bound to [@react-typed-forms/core](https://github.com/doolse/react-typed-forms#readme).

Each component takes a `Control<T>` from `@react-typed-forms/core` and wires
two-way value binding, `touched`, `disabled` and validation messages into the
matching FluentUI v9 input — no `onChange`/`value`/`onBlur` boilerplate at the
call site.

## Install

```bash
npm install @react-typed-forms/fluent-ui @fluentui/react-components @react-typed-forms/core
```

`@fluentui/react-components` and `@react-typed-forms/core` are peer
dependencies. The host app must render a `<FluentProvider theme={...}>`
somewhere above these components for FluentUI styling to apply.

## Philosophy

The library is built on three small, composable ideas rather than one
monolithic component per field.

### 1. Name after the thing you're wrapping

A wrapper is named for the FluentUI component it binds, prefixed with a letter
that says _what layer it is_. `SpinButton` → `CSpinButton` / `FSpinButton`;
`SearchBox` → `CSearchBox` / `FSearchBox`. There is no invented vocabulary to
learn — if you know FluentUI, you know what each wrapper renders.

### 2. Two layers per control: `C*` (control) and `F*` (field)

- **`C*` — control binding only.** Wraps the bare FluentUI input and connects
  it to a `Control`: `value`, `onChange`, `onBlur`/`touched`, `disabled`.
  No label, no validation chrome. Use it when you want to lay out the
  `Field` (or no field at all) yourself.
- **`F*` — the full form field.** Composes [`FField`](#ffield) (label +
  validation message) with the matching `C*`. This is what you reach for most
  of the time.

`F*` is literally `FField` + `C*`, so nothing the field version does is hidden
from you — drop to `C*` any time you need more control over layout.

```tsx
// F* is just this:
export function FSpinButton({ control, label, required, hint, ...rest }) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CSpinButton control={control} {...rest} />
    </FField>
  );
}
```

### 3. Editability is derived, and restrictions only ever tighten

A control's own `disabled` flag is reserved for **business state** — "this
field is auto-computed", "not applicable to this record". Presentation-level
locks (a read-only detail view, a form disabled while saving) are a separate
concern and cascade through React context via
[`FormEditState`](#formeditstate-cascading-readonly--disabled).

The two are merged in a **restriction-only** way: context can _add_ a lock but
never re-enable a field the control disabled. So a screen can be flipped
read-only without any risk of accidentally un-disabling business-disabled
fields.

Because text inputs support a native `readOnly` (value shown, editable
appearance, not editable) but choice inputs (checkbox, switch, dropdown, radio)
do not, `readonly` renders as `readOnly` on text-like controls and degrades to
`disabled` on choice controls.

## Components

Each entry exports a `C*` (control-only) and an `F*` (full field) variant.

| Field (`F*`) | Control-only (`C*`) | FluentUI component | Bound to |
| --- | --- | --- | --- |
| `FInput` | `CInput` | `Input` | `Control<string \| null \| undefined>` |
| `FTextarea` | `CTextarea` | `Textarea` | `Control<string \| null \| undefined>` |
| `FSearchBox` | `CSearchBox` | `SearchBox` | `Control<string \| null \| undefined>` |
| `FSpinButton` | `CSpinButton` | `SpinButton` | `Control<number \| null \| undefined>` |
| `FCheckbox` | `CCheckbox` | `Checkbox` | `Control<boolean \| null \| undefined>` |
| `FSwitch` | `CSwitch` | `Switch` | `Control<boolean \| null \| undefined>` |
| `FDropdown` | `CDropdown` | `Dropdown` | `Control<T \| null \| undefined>`, `T extends string` |
| `FRadioGroup` | `CRadioGroup` | `RadioGroup` | `Control<T \| null \| undefined>`, `T extends string` |
| `FDatePicker` | `CDatePicker` | native `date` / `datetime-local` `Input` | `Control<string \| null \| undefined>` (ISO strings) |

All variants forward any extra FluentUI props (e.g. `appearance`, `size`,
`placeholder`) to the underlying input. The `F*` variants additionally accept
`label`, `required` and `hint`, and surface `control.error` as the `Field`'s
validation message once the control is touched.

> `disabled` is intentionally **not** a prop on these wrappers — editability is
> derived from the control plus [`FormEditState`](#formeditstate-cascading-readonly--disabled).

### `FField`

The shared field wrapper. Wraps FluentUI's `Field` and derives
`validationState`/`validationMessage` from a control's `touched`/`error`. Use
it directly with a `C*` component to build a custom field layout:

```tsx
import { FField, CSpinButton } from "@react-typed-forms/fluent-ui";

<FField control={data.fields.age} label="Age" required>
  <CSpinButton control={data.fields.age} min={0} />
</FField>;
```

## Usage

```tsx
import { FluentProvider, webLightTheme, Button } from "@fluentui/react-components";
import { useControl } from "@react-typed-forms/core";
import {
  FInput,
  FTextarea,
  FCheckbox,
  FSwitch,
  FDropdown,
  FRadioGroup,
  FSearchBox,
  FSpinButton,
  FDatePicker,
} from "@react-typed-forms/fluent-ui";

interface SignupForm {
  name: string;
  bio: string;
  agree: boolean;
  notifications: boolean;
  role: "admin" | "user";
  size: "s" | "m" | "l";
  search: string;
  age: number;
  birthday: string;
}

export default function Signup() {
  const data = useControl<SignupForm>({
    name: "",
    bio: "",
    agree: false,
    notifications: true,
    role: "user",
    size: "m",
    search: "",
    age: 18,
    birthday: "",
  });

  return (
    <FluentProvider theme={webLightTheme}>
      <FInput control={data.fields.name} label="Name" required />
      <FTextarea control={data.fields.bio} label="Bio" />
      <FCheckbox control={data.fields.agree} label="I agree" />
      <FSwitch control={data.fields.notifications} label="Email me" />
      <FDropdown
        control={data.fields.role}
        label="Role"
        options={[
          { value: "user", label: "User" },
          { value: "admin", label: "Admin" },
        ]}
      />
      <FRadioGroup
        control={data.fields.size}
        label="Size"
        options={[
          { value: "s", label: "Small" },
          { value: "m", label: "Medium" },
          { value: "l", label: "Large" },
        ]}
      />
      <FSearchBox control={data.fields.search} label="Search" />
      <FSpinButton control={data.fields.age} label="Age" />
      <FDatePicker control={data.fields.birthday} label="Birthday" />
      <Button onClick={() => console.log(data.value)}>Submit</Button>
    </FluentProvider>
  );
}
```

### `FormEditState`: cascading readonly / disabled

Wrap any subtree in `FormEditProvider` (from `@react-typed-forms/core`) to make
every field below it read-only or disabled, regardless of each control's own
state:

```tsx
import { FormEditProvider } from "@react-typed-forms/core";

// Whole form shown read-only (e.g. a detail view)
<FormEditProvider readonly>
  <SignupFields />
</FormEditProvider>;

// Disable the form while a save is in flight
<FormEditProvider disabled={saving}>
  <SignupFields />
</FormEditProvider>;
```

The merge is restriction-only: a field disabled by its control stays disabled;
the context can only add locks, never remove them. The
`useControlEdit(control, supportsReadOnly)` hook performs this merge and is
exported for building your own wrappers.

An explicit `disabled` / `readOnly` prop on a component is a deliberate escape
hatch — it overrides both the control and the cascading context:

```tsx
// Stays read-only even when nothing above it is read-only
<FInput control={data.fields.name} readOnly />

// Stays editable even inside a <FormEditProvider disabled>
<FInput control={data.fields.name} disabled={false} />
```

### Validation

Validation messages come from `control.error` and are shown on the `Field`
once `control.touched` becomes `true` (the inputs set this on blur). Set
errors however you normally do with `@react-typed-forms/core` — e.g. via
`useValidator`, `setErrors`, or a submit-time validator.

### Dates

`FDatePicker` stores ISO strings on the control so the value round-trips
cleanly through NSwag-generated DTOs. Pass `withTime` to render the
`datetime-local` variant.

## Building

```bash
npm install
npm run build
```

Produces `lib/index.js` (ESM), `lib/index.cjs` (CJS) and `lib/index.d.ts`
via [microbundle](https://github.com/developit/microbundle).
