"use client";

import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import {
  FormEditProvider,
  RenderControl,
  useControl,
} from "@react-typed-forms/core";
import {
  FCombobox,
  FDropdown,
  FRadioGroup,
  FSwitch,
  type SelectOption,
} from "@react-typed-forms/fluent-ui";

type Role = "admin" | "editor" | "viewer";

interface DemoForm {
  role: Role | null;
  skills: string[];
  priority: number | null;
  country: string | null;
  tag: string | null;
  languages: string[];
  rating: number | null;
}

const roleOptions: SelectOption<Role>[] = [
  { value: "admin", text: "Administrator" },
  { value: "editor", text: "Editor" },
  { value: "viewer", text: "Viewer" },
];

// Grouped options + a disabled one.
const skillOptions: SelectOption<string>[] = [
  { value: "react", text: "React", group: "Frontend" },
  { value: "vue", text: "Vue", group: "Frontend" },
  {
    value: "svelte",
    text: "Svelte (coming soon)",
    group: "Frontend",
    disabled: true,
  },
  { value: "dotnet", text: ".NET", group: "Backend" },
  { value: "node", text: "Node.js", group: "Backend" },
];

// Non-string values -> getOptionKey is required (enforced by the types).
const priorityOptions: SelectOption<number>[] = [
  { value: 1, text: "Low" },
  { value: 2, text: "Medium" },
  { value: 3, text: "High" },
];

const countryOptions: SelectOption<string>[] = [
  { value: "au", text: "Australia" },
  { value: "nz", text: "New Zealand" },
  { value: "us", text: "United States" },
  { value: "gb", text: "United Kingdom" },
  { value: "ca", text: "Canada" },
];

const languageOptions: SelectOption<string>[] = [
  { value: "en", text: "English", group: "Common" },
  { value: "es", text: "Spanish", group: "Common" },
  { value: "fr", text: "French", group: "Common" },
  { value: "mi", text: "Māori", group: "Other" },
  { value: "ja", text: "Japanese", group: "Other" },
];

// Number values -> getOptionKey required; one option disabled.
const ratingOptions: SelectOption<number>[] = [
  { value: 1, text: "1 — Poor" },
  { value: 2, text: "2 — Fair" },
  { value: 3, text: "3 — Good" },
  { value: 4, text: "4 — Great" },
  { value: 5, text: "5 — Excellent (disabled)", disabled: true },
];

export default function FluentSelectShowcase() {
  const data = useControl<DemoForm>({
    role: null,
    skills: ["react"],
    priority: null,
    country: null,
    tag: null,
    languages: [],
    rating: null,
  });

  const globalDisabled = useControl(false);
  const globalReadonly = useControl(false);

  return (
    <FluentProvider theme={webLightTheme}>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Dropdown &amp; Combobox</h1>
          <p className="text-gray-600">
            Arbitrary-typed options bound to a <code>Control</code>: single
            &amp; multiselect, groups, per-option disabled, clearable,
            non-string values, plus Combobox filtering &amp; freeform.
          </p>
        </header>

        <section className="border rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold">Global flags</h2>
          <FSwitch
            control={globalDisabled}
            label="Global disabled (FormEditState context)"
          />
          <FSwitch
            control={globalReadonly}
            label="Global readonly (FormEditState context)"
          />
        </section>

        <RenderControl>
          {() => (
            <FormEditProvider
              disabled={globalDisabled.value}
              readonly={globalReadonly.value}
            >
              <div className="space-y-6">
                <section className="border rounded p-4 space-y-3">
                  <h2 className="text-lg font-semibold">Dropdown</h2>
                  <FDropdown<Role>
                    control={data.fields.role}
                    label="Role (single, clearable)"
                    placeholder="Select a role"
                    clearable
                    options={roleOptions}
                  />
                  <FDropdown<string>
                    control={data.fields.skills}
                    multiselect
                    label="Skills (multiselect, grouped, one disabled)"
                    placeholder="Select skills"
                    options={skillOptions}
                  />
                  <FDropdown<number>
                    control={data.fields.priority}
                    label="Priority (number values — needs getOptionKey)"
                    placeholder="Select priority"
                    clearable
                    getOptionKey={(v) => String(v)}
                    options={priorityOptions}
                  />
                </section>

                <section className="border rounded p-4 space-y-3">
                  <h2 className="text-lg font-semibold">Combobox</h2>
                  <FCombobox<string>
                    control={data.fields.country}
                    label="Country (type to filter, clearable)"
                    placeholder="Search countries"
                    clearable
                    options={countryOptions}
                  />
                  <FCombobox<string>
                    control={data.fields.tag}
                    label="Tag (freeform — keeps text that isn't an option)"
                    placeholder="Pick or type a tag"
                    freeform
                    options={[
                      { value: "bug", text: "bug" },
                      { value: "feature", text: "feature" },
                      { value: "chore", text: "chore" },
                    ]}
                  />
                  <FCombobox<string>
                    control={data.fields.languages}
                    multiselect
                    label="Languages (multiselect + filter, grouped)"
                    placeholder="Search languages"
                    options={languageOptions}
                  />
                </section>

                <section className="border rounded p-4 space-y-3">
                  <h2 className="text-lg font-semibold">RadioGroup</h2>
                  <FRadioGroup<number>
                    control={data.fields.rating}
                    label="Rating (number values — needs getOptionKey, one disabled)"
                    getOptionKey={(v) => String(v)}
                    options={ratingOptions}
                  />
                </section>
              </div>
            </FormEditProvider>
          )}
        </RenderControl>

        <details className="border rounded p-4" open>
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
