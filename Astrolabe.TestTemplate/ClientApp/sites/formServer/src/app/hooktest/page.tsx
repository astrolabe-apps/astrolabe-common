"use client";

import {
  useControl,
  useComputed,
  useControlEffect,
  useValidator,
  useSelectableArray,
  ensureSelectableValues,
  Control,
  Finput,
  newControl,
  RenderElements,
  Fcheckbox,
} from "@react-typed-forms/core";
import { StrictMode, useRef, useState } from "react";

function LogPanel({ logs }: { logs: Control<string[]> }) {
  const entries = logs.elements;
  return (
    <div className="bg-gray-900 text-green-400 font-mono text-xs p-3 rounded h-48 overflow-y-auto">
      {entries.length === 0 && (
        <span className="text-gray-500">No logs yet...</span>
      )}
      {entries.map((entry, i) => (
        <div key={i}>{entry.value}</div>
      ))}
    </div>
  );
}

function useLog(logs: Control<string[]>) {
  const counterRef = useRef(0);
  return (msg: string) => {
    counterRef.current++;
    logs.value = [
      ...logs.current.value,
      `[${counterRef.current}] ${new Date().toLocaleTimeString()}: ${msg}`,
    ];
  };
}

// ---------- useControl test ----------
function UseControlTest() {
  const logs = useControl<string[]>([]);
  const log = useLog(logs);
  const renderCount = useRef(0);
  renderCount.current++;
  log(`render #${renderCount.current}`);

  const control = useControl("hello", undefined, () => {
    log("useControl afterInit called");
  });

  return (
    <Section title="useControl">
      <p className="text-sm text-gray-600 mb-2">
        Type in the input. Check that render count increments and afterInit is
        only called once (even in Strict Mode).
      </p>
      <div className="flex gap-2 items-center mb-2">
        <label>Value:</label>
        <Finput
          className="border px-2 py-1 rounded"
          type="text"
          control={control}
        />
        <span className="text-sm text-gray-500">
          current: &quot;{control.value}&quot;
        </span>
      </div>
      <LogPanel logs={logs} />
    </Section>
  );
}

// ---------- useComputed test ----------
function UseComputedTest() {
  const logs = useControl<string[]>([]);
  const log = useLog(logs);
  const renderCount = useRef(0);
  renderCount.current++;
  log(`render #${renderCount.current}`);

  const a = useControl(2);
  const b = useControl(3);
  const product = useComputed(() => {
    const result = a.value * b.value;
    log(`computed: ${a.value} * ${b.value} = ${result}`);
    return result;
  });

  return (
    <Section title="useComputed">
      <p className="text-sm text-gray-600 mb-2">
        Change A or B. The product should update reactively. Check that the
        compute function runs when inputs change, not on every render.
      </p>
      <div className="flex gap-2 items-center mb-2">
        <label>A:</label>
        <Finput
          className="border px-2 py-1 rounded w-20"
          type="number"
          control={a}
        />
        <label>B:</label>
        <Finput
          className="border px-2 py-1 rounded w-20"
          type="number"
          control={b}
        />
        <span className="font-bold">= {product.value}</span>
      </div>
      <LogPanel logs={logs} />
    </Section>
  );
}

// ---------- useControlEffect test ----------
function UseControlEffectTest() {
  const logs = useControl<string[]>([]);
  const log = useLog(logs);
  const renderCount = useRef(0);
  renderCount.current++;
  log(`render #${renderCount.current}`);

  const source = useControl(0);

  // No initial - should NOT fire on mount
  useControlEffect(
    () => source.value,
    (v) => log(`effect (no initial): ${v}`),
  );

  // initial=true - should fire on mount
  useControlEffect(
    () => source.value,
    (v) => log(`effect (initial=true): ${v}`),
    true,
  );

  // Custom initial handler
  useControlEffect(
    () => source.value,
    (v) => log(`effect (custom initial) onChange: ${v}`),
    (v) => log(`effect (custom initial) onInitial: ${v}`),
  );

  return (
    <Section title="useControlEffect">
      <p className="text-sm text-gray-600 mb-2">
        On mount: &quot;no initial&quot; should NOT fire,
        &quot;initial=true&quot; should fire, &quot;custom initial&quot; should
        fire onInitial. After changing the value, all three onChange callbacks
        should fire.
      </p>
      <div className="flex gap-2 items-center mb-2">
        <label>Value:</label>
        <Finput
          className="border px-2 py-1 rounded w-20"
          type="number"
          control={source}
        />
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded"
          onClick={() => source.value++}
        >
          Increment
        </button>
        <span className="text-sm text-gray-500">current: {source.value}</span>
      </div>
      <LogPanel logs={logs} />
    </Section>
  );
}

// ---------- useValidator test ----------
function UseValidatorTest() {
  const logs = useControl<string[]>([]);
  const log = useLog(logs);
  const renderCount = useRef(0);
  renderCount.current++;
  log(`render #${renderCount.current}`);

  const control = useControl("");
  useValidator(control, (v) => {
    const error =
      v.length === 0 ? "Required" : v.length < 3 ? "Too short" : null;
    log(`validator ran: "${v}" -> ${error ?? "valid"}`);
    return error;
  });

  return (
    <Section title="useValidator">
      <p className="text-sm text-gray-600 mb-2">
        Type in the input. Validator should run reactively. Error should clear
        when value is 3+ characters. Check validator only runs once per change
        in Strict Mode.
      </p>
      <div className="flex gap-2 items-center mb-2">
        <label>Value:</label>
        <Finput
          className="border px-2 py-1 rounded"
          type="text"
          control={control}
        />
        <span
          className={`text-sm ${control.error ? "text-red-500" : "text-green-500"}`}
        >
          {control.error ?? "Valid"}
        </span>
      </div>
      <LogPanel logs={logs} />
    </Section>
  );
}

// ---------- useSelectableArray test ----------
function UseSelectableArrayTest() {
  const logs = useControl<string[]>([]);
  const log = useLog(logs);
  const renderCount = useRef(0);
  renderCount.current++;
  log(`render #${renderCount.current}`);

  const selected = useControl<string[]>([]);
  const selectable = useSelectableArray(
    selected,
    ensureSelectableValues(["Apple", "Banana", "Cherry", "Date"], (x) => x),
  );

  useControlEffect(
    () => selected.value,
    (v) => log(`selected changed: [${v.join(", ")}]`),
    true,
  );

  return (
    <Section title="useSelectableArray">
      <p className="text-sm text-gray-600 mb-2">
        Toggle checkboxes. The selected array should update. Check that it works
        correctly after Strict Mode&apos;s mount/unmount/remount cycle.
      </p>
      <div className="flex gap-2 mb-2">
        <RenderElements control={selectable}>
          {(elem) => (
            <label className="flex items-center gap-1">
              <Fcheckbox control={elem.fields.selected} />
              {elem.fields.value.value}
            </label>
          )}
        </RenderElements>
      </div>
      <div className="text-sm text-gray-500 mb-2">
        Selected: [{selected.value.join(", ")}]
      </div>
      <LogPanel logs={logs} />
    </Section>
  );
}

// ---------- Conditional mount/unmount test ----------
function ConditionalMountTest() {
  const logs = useControl<string[]>([]);
  const log = useLog(logs);
  const show = useControl(true);

  return (
    <Section title="Mount / Unmount">
      <p className="text-sm text-gray-600 mb-2">
        Toggle to unmount/remount the child. Check that effects fire correctly
        on remount and cleanup runs on unmount (watch the console too).
      </p>
      <div className="flex gap-2 items-center mb-2">
        <button
          className="bg-blue-500 text-white px-3 py-1 rounded"
          onClick={() => (show.value = !show.value)}
        >
          {show.value ? "Unmount" : "Mount"}
        </button>
      </div>
      {show.value && <MountTestChild log={log} />}
      <LogPanel logs={logs} />
    </Section>
  );
}

function MountTestChild({ log }: { log: (msg: string) => void }) {
  const counter = useControl(0);

  useControlEffect(
    () => counter.value,
    (v) => log(`child effect fired: ${v}`),
    true,
  );

  log("child rendered");

  return (
    <div className="border p-2 rounded bg-blue-50 mb-2">
      <div className="flex gap-2 items-center">
        <span>Child counter: {counter.value}</span>
        <button
          className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm"
          onClick={() => counter.value++}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4 mb-4">
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      {children}
    </div>
  );
}

// ---------- Page ----------
export default function HookTestPage() {
  const [strict, setStrict] = useState(false);
  const content = (
    <>
      <UseControlTest />
      <UseComputedTest />
      <UseControlEffectTest />
      <UseValidatorTest />
      <UseSelectableArrayTest />
      <ConditionalMountTest />
    </>
  );
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Hook Strict Mode Test</h1>
        <label className="flex items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={strict}
            onChange={(e) => setStrict(e.target.checked)}
          />
          <span className={`font-bold ${strict ? "text-red-600" : "text-gray-400"}`}>
            StrictMode {strict ? "ON" : "OFF"}
          </span>
        </label>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Toggle StrictMode above to remount all components with React&apos;s
        double-render/double-effect behaviour. Each section logs its lifecycle
        events. Look for duplicate renders and verify effects still work after
        the mount/unmount/remount cycle.
      </p>
      {strict ? <StrictMode>{content}</StrictMode> : content}
    </div>
  );
}
