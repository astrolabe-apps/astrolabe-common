![npm](https://img.shields.io/npm/v/@react-typed-forms/core?style=plastic)

See the documentation [here](https://github.com/doolse/react-typed-forms#readme)

## Install

```npm
npm install @react-typed-forms/core
```

<!-- AUTO-GENERATED-CONTENT:START (CODE:src=../examples/src/pages/simple.tsx) -->
<!-- The below code snippet is automatically added from ../examples/src/pages/simple.tsx -->
```tsx
import { Finput, notEmpty, useControl } from "@react-typed-forms/core";
import React, { useState } from "react";

interface SimpleForm {
  firstName: string;
  lastName: string;
}

export default function SimpleExample() {
  const formState = useControl(
    { firstName: "", lastName: "" },
    { fields: { lastName: { validator: notEmpty("Required field") } } }
  );
  const fields = formState.fields;
  const [formData, setFormData] = useState<SimpleForm>();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setFormData(formState.current.value);
      }}
    >
      <label>First Name</label>
      <Finput id="firstName" type="text" state={fields.firstName} />
      <label>Last Name *</label>
      <Finput id="lastName" type="text" state={fields.lastName} />
      <div>
        <button id="submit">Validate and toObject()</button>
      </div>
      {formData && (
        <pre className="my-2">{JSON.stringify(formData, undefined, 2)}</pre>
      )}
    </form>
  );
}
```
<!-- AUTO-GENERATED-CONTENT:END -->

## Form edit state (cascading readonly / disabled)

A control's own `disabled` flag is meant for **business state** — "this field
is auto-computed", "not applicable to this record". Presentation-level locks (a
read-only detail view, a form disabled while saving) are a separate concern.
`FormEditState` cascades those locks through React context, and inputs merge
them with each control's state in a **restriction-only** way: the context can
_add_ a lock but never re-enable a field the control disabled.

```tsx
import { FormEditProvider } from "@react-typed-forms/core";

// Whole subtree shown read-only (e.g. a detail view)
<FormEditProvider readonly>
  <MyForm />
</FormEditProvider>;

// Disable the form while a save is in flight
<FormEditProvider disabled={saving}>
  <MyForm />
</FormEditProvider>;
```

- `FormEditProvider` — provides `{ readonly?, disabled? }` to descendants.
- `useFormEdit(): FormEditState` — read the current cascading edit state.

### `useFormControlProps`

Use this in place of `formControlProps` to have an input automatically honour
the surrounding `FormEditState`. It returns the same props as
`formControlProps` — `value`, `onChange`, `onBlur`, `disabled`, `errorText`,
`ref` — plus a `readOnly` flag, with `disabled` already merged with the
context (`control.disabled || context.disabled`):

```tsx
import { useFormControlProps } from "@react-typed-forms/core";

function MyInput({ control }: { control: Control<string> }) {
  const { value, readOnly, ...props } = useFormControlProps(control);
  return <input {...props} value={value ?? ""} readOnly={readOnly} />;
}
```

The built-in `Finput`, `Fselect` and `Fcheckbox` already use it. Native text
inputs honour `readOnly` directly; elements with no read-only mode (`<select>`,
checkboxes) fold `readonly` into `disabled` instead.