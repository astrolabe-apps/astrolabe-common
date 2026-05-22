![npm](https://img.shields.io/npm/v/@react-typed-forms/fluent-ui?style=plastic)

FluentUI v9 form controls bound to [@react-typed-forms/core](https://github.com/doolse/react-typed-forms#readme).

Each component takes a `Control<T>` from `@react-typed-forms/core` and wires
two-way value binding, `touched`, `disabled` and validation messages into the
matching FluentUI v9 `Field` + input combo.

## Install

```bash
npm install @react-typed-forms/fluent-ui @fluentui/react-components @react-typed-forms/core
```

`@fluentui/react-components` and `@react-typed-forms/core` are peer
dependencies. The host app must render a `<FluentProvider theme={...}>`
somewhere above these components for FluentUI styling to apply.

## Components

- `FInput` — FluentUI `Input`, bound to `Control<string | null | undefined>`
- `FTextarea` — FluentUI `Textarea`, bound to `Control<string | null | undefined>`
- `FCheckbox` — FluentUI `Checkbox`, bound to `Control<boolean | null | undefined>`
- `FSwitch` — FluentUI `Switch`, bound to `Control<boolean | null | undefined>`
- `FDropdown` — FluentUI `Dropdown`, bound to `Control<T | null | undefined>` where `T extends string`
- `FRadioGroup` — FluentUI `RadioGroup`, bound to `Control<T | null | undefined>` where `T extends string`
- `FSearch` — FluentUI `SearchBox`, bound to `Control<string | null | undefined>`
- `FNumberInput` — FluentUI `SpinButton`, bound to `Control<number | null | undefined>`
- `FDatePicker` — native `date` / `datetime-local` `Input`, bound to `Control<string | null | undefined>` (ISO strings)

All components forward any extra FluentUI props (e.g. `appearance`, `size`,
`placeholder`) to the underlying input. `FInput`, `FTextarea`, `FDropdown`,
`FRadioGroup`, `FNumberInput` and `FDatePicker` accept `label`, `required` and
surface `control.error` as the `Field`'s validation message once the control
is touched.

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
  FSearch,
  FNumberInput,
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
      <FSearch control={data.fields.search} label="Search" />
      <FNumberInput control={data.fields.age} label="Age" />
      <FDatePicker control={data.fields.birthday} label="Birthday" />
      <Button onClick={() => console.log(data.value)}>Submit</Button>
    </FluentProvider>
  );
}
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
