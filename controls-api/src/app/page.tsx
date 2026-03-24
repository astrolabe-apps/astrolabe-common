"use client";

import { useRef } from "react";
import type { Control, ControlSetup } from "@/lib/types";
import { controls, ControlContextProvider } from "@/lib/controlsImpl";
import { createControlContext } from "@/lib/controlContextImpl";

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

const MyForm = controls<{ form: Control<FormData> }>(function MyForm(
  { form },
  { rc, update, useComputed },
) {
  const dirty = rc.isDirty(form);
  const valid = rc.isValid(form);
  const fields = form.fields;

  const fullName = useComputed((rc) => {
    const first = rc.getValue(fields.firstName);
    const last = rc.getValue(fields.lastName);
    return [first, last].filter(Boolean).join(" ") || "(empty)";
  });
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

      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        Full name: {rc.getValue(fullName)}
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
              wc.setValue(form, form.initialValueNow);
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
              wc.setTouched(form, true);
              wc.validate(form);
            })
          }
        >
          Validate
        </button>
      </div>
    </div>
  );
});

const initialData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
};

const formSetup: ControlSetup<FormData> = {
  fields: {
    firstName: {
      validator: (v) => (!v ? "Required" : undefined),
    },
    email: {
      validator: (v) => (!v.includes("@") ? "Must contain @" : undefined),
    },
  },
};

const controlContext = createControlContext();

const Home = controls(function Home({}, { controlContext }) {
  const formRef = useRef<Control<FormData> | null>(null);
  if (!formRef.current) {
    formRef.current = controlContext.newControl(initialData, formSetup);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-md rounded-lg bg-white p-8 shadow dark:bg-zinc-900">
        <MyForm form={formRef.current} />
      </main>
    </div>
  );
});

export default function Page() {
  return (
    <ControlContextProvider value={controlContext}>
      <Home />
    </ControlContextProvider>
  );
}
