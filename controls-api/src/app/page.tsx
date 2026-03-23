"use client";

import { useRef } from "react";
import type { Control } from "@/lib/types";
import { controls } from "@/lib/react-types";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
}

const TextInput = controls<{
  control: Control<string>;
  label: string;
}>(function TextInput({ control, label }, { rc, update }) {
  const value = rc.getValue(control);
  const touched = rc.isTouched(control);
  const error = rc.getError(control);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        value={value}
        onChange={(e) =>
          update((wc) => {
            wc.setValue(control, e.target.value);
            wc.setTouched(control, true, true);
          })
        }
        onBlur={() => update((wc) => wc.setTouched(control, true, true))}
      />
      {touched && error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
});

const MyForm = controls<{ form: Control<FormData> }>(
  function MyForm({ form }, { rc, update }) {
    const dirty = rc.isDirty(form);
    const valid = rc.isValid(form);
    const fields = form.fields;

    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          New Controls API Demo
        </h2>

        <div className="flex flex-col gap-4">
          <TextInput control={fields.firstName} label="First Name" />
          <TextInput control={fields.lastName} label="Last Name" />
          <TextInput control={fields.email} label="Email" />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className={dirty ? "text-amber-600" : "text-green-600"}>
            {dirty ? "Dirty" : "Clean"}
          </span>
          <span className={valid ? "text-green-600" : "text-red-600"}>
            {valid ? "Valid" : "Invalid"}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={!dirty || !valid}
            onClick={() => {
              const value = form.valueNow;
              alert(JSON.stringify(value, null, 2));
              update((wc) => wc.markAsClean(form));
            }}
          >
            Submit
          </button>
          <button
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() =>
              update((wc) => {
                wc.setInitialValue(form, form.initialValueNow);
                wc.setTouched(form, false);
                wc.clearErrors(form);
              })
            }
          >
            Reset
          </button>
          <button
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() =>
              update((wc) => {
                const email = form.fields.email;
                const emailValue = email.valueNow;
                if (!emailValue.includes("@")) {
                  wc.setError(email, "format", "Must contain @");
                } else {
                  wc.setError(email, "format", null);
                }
                if (!form.fields.firstName.valueNow) {
                  wc.setError(form.fields.firstName, "required", "Required");
                } else {
                  wc.setError(form.fields.firstName, "required", null);
                }
              })
            }
          >
            Validate
          </button>
        </div>
      </div>
    );
  },
);

const initialData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
};

const Home = controls(function Home({}, { controlContext }) {
  const formRef = useRef<Control<FormData> | null>(null);
  if (!formRef.current) {
    formRef.current = controlContext.newControl(initialData);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-md rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
        <MyForm form={formRef.current} />
      </main>
    </div>
  );
});

export default Home;