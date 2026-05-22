"use client";

import {
  Button,
  FluentProvider,
  webLightTheme,
} from "@fluentui/react-components";
import {
  FCheckbox,
  FDatePicker,
  FDropdown,
  FInput,
  FNumberInput,
  FRadioGroup,
  FSearch,
  FSwitch,
  FTextarea,
} from "@react-typed-forms/fluent-ui";
import {
  RenderControl,
  useControl,
  useControlEffect,
  useValidator,
} from "@react-typed-forms/core";

type Role = "admin" | "editor" | "viewer";
type Size = "s" | "m" | "l";

interface ShowcaseForm {
  name: string;
  bio: string;
  agree: boolean;
  notifications: boolean;
  role: Role;
  size: Size;
  search: string;
  age: number;
  birthday: string;
  reminderAt: string;
}

export default function FluentUiShowcase() {
  const data = useControl<ShowcaseForm>({
    name: "",
    bio: "",
    agree: false,
    notifications: true,
    role: "viewer",
    size: "m",
    search: "",
    age: 25,
    birthday: "",
    reminderAt: "",
  });

  const disabled = useControl(false);

  useControlEffect(
    () => disabled.value,
    (v) => {
      data.disabled = v;
    },
    true,
  );

  useValidator(data.fields.name, (v) =>
    !v || v.trim().length === 0 ? "Name is required" : null,
  );
  useValidator(data.fields.age, (v) =>
    v == null || v < 0 ? "Age must be 0 or greater" : null,
  );

  return (
    <FluentProvider theme={webLightTheme}>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">@react-typed-forms/fluent-ui</h1>
          <p className="text-gray-600">
            Showcase of every FluentUI v9 control bound to a
            <code className="mx-1">Control</code>
            from <code>@react-typed-forms/core</code>. Toggle the disabled
            switch to see how each control reflects the bound control state,
            and press <em>Validate</em> to surface field errors.
          </p>
        </header>

        <section className="border rounded p-4">
          <FSwitch control={disabled} label="Disable all fields" />
        </section>

        <section className="border rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold">Text inputs</h2>
          <FInput
            control={data.fields.name}
            label="Name"
            required
            placeholder="Jane Doe"
          />
          <FTextarea
            control={data.fields.bio}
            label="Bio"
            placeholder="Tell us about yourself"
          />
          <FSearch control={data.fields.search} label="Search" />
        </section>

        <section className="border rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold">Toggles</h2>
          <FCheckbox
            control={data.fields.agree}
            label="I agree to the terms"
          />
          <FSwitch
            control={data.fields.notifications}
            label="Send me email notifications"
          />
        </section>

        <section className="border rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold">Choices</h2>
          <FDropdown<Role>
            control={data.fields.role}
            label="Role"
            placeholder="Select a role"
            options={[
              { value: "admin", label: "Administrator" },
              { value: "editor", label: "Editor" },
              { value: "viewer", label: "Viewer" },
            ]}
          />
          <FRadioGroup<Size>
            control={data.fields.size}
            label="T-shirt size"
            options={[
              { value: "s", label: "Small" },
              { value: "m", label: "Medium" },
              { value: "l", label: "Large" },
            ]}
          />
        </section>

        <section className="border rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold">Numbers &amp; dates</h2>
          <FNumberInput control={data.fields.age} label="Age" required />
          <FDatePicker control={data.fields.birthday} label="Birthday" />
          <FDatePicker
            control={data.fields.reminderAt}
            label="Reminder"
            withTime
          />
        </section>

        <section className="flex gap-2">
          <Button
            appearance="primary"
            onClick={() => {
              data.setTouched(true);
              data.validate();
            }}
          >
            Validate
          </Button>
          <Button
            onClick={() => {
              data.clearErrors();
              data.setTouched(false);
            }}
          >
            Reset state
          </Button>
        </section>

        <details className="border rounded p-4">
          <summary className="cursor-pointer font-medium">
            Form value (JSON)
          </summary>
          <RenderControl>
            {() => (
              <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto">
                {JSON.stringify(data.value, null, 2)}
              </pre>
            )}
          </RenderControl>
        </details>
      </div>
    </FluentProvider>
  );
}
