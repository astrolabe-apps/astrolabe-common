"use client";

import { useRef, useState } from "react";
import type { Control } from "@/lib/types";
import { controls, ControlContextProvider } from "@/lib/controlsImpl";
import { createControlContext } from "@/lib/controlContextImpl";
import { toImpl } from "@/lib/controlImpl";
import { noopReadContext } from "@/lib/readContextImpl";
import {
  createFormStateNode,
  createSchemaDataNode,
  ControlDefinitionType,
  FieldType,
} from "@/lib/form";
import type {
  ControlDefinition,
  SchemaField,
  FormStateNode,
  FormGlobalOptions,
  SchemaDataNode,
} from "@/lib/form";

// ── Shared helpers ───────────────────────────────────────────────────

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}
    >
      {children}
    </span>
  );
}

function ValueDisplay({ value }: { value: unknown }) {
  if (value === undefined)
    return <span className="text-zinc-400 italic">undefined</span>;
  if (value === null) return <span className="text-zinc-400 italic">null</span>;
  if (typeof value === "string")
    return (
      <span className="text-green-600 dark:text-green-400">
        &quot;
        {value.length > 40 ? value.slice(0, 40) + "..." : value}
        &quot;
      </span>
    );
  if (typeof value === "number")
    return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
  if (typeof value === "boolean")
    return (
      <span className="text-purple-600 dark:text-purple-400">
        {value.toString()}
      </span>
    );
  if (Array.isArray(value))
    return <span className="text-zinc-500">[{value.length} items]</span>;
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    return (
      <span className="text-zinc-500">{`{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", ..." : ""}}`}</span>
    );
  }
  return <span>{String(value)}</span>;
}

// ── Form editor driven by FormStateNode ──────────────────────────────

// Leaf data field — no self-reference so TS infers fine
const FormDataField = controls(function FormDataField(
  { node }: { node: FormStateNode },
  { rc, update },
) {
  const { visible, disabled, readonly } = rc.getValueRx(node.stateControl);
  const dataNode = rc.getValue(
    node.stateControl.fields.dataNode as Control<SchemaDataNode | undefined>,
  );

  if (visible === false || !dataNode) return null;

  const def = node.definition;
  const value = rc.getValue(dataNode.control);
  const error = rc.getError(dataNode.control);
  const touched = rc.isTouched(dataNode.control);

  return (
    <div className="flex flex-col gap-1">
      {def.title && (
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {def.title}
          {def.required && <span className="text-red-400 ml-0.5">*</span>}
          {readonly && (
            <span className="ml-1 text-[10px] text-orange-500">(readonly)</span>
          )}
        </label>
      )}
      <input
        className={`rounded border px-2.5 py-1.5 text-sm dark:bg-zinc-800 dark:text-zinc-100 ${
          touched && error
            ? "border-red-400 dark:border-red-600"
            : "border-zinc-300 dark:border-zinc-600"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${readonly ? "bg-zinc-50 dark:bg-zinc-800/50" : ""}`}
        value={value == null ? "" : String(value)}
        disabled={disabled}
        readOnly={readonly}
        onChange={(e) => {
          const raw = e.target.value;
          const newVal =
            dataNode.schema.type === FieldType.Int ? Number(raw) || 0 : raw;
          update((wc) => wc.setValue(dataNode.control, newVal));
        }}
        onBlur={() =>
          update((wc) => wc.setTouched(dataNode.control, true, true))
        }
      />
      {touched && error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
});

// Group node — renders children, which may be groups or data fields
const FormGroupField = controls(function FormGroupField(
  { node }: { node: FormStateNode },
  { rc },
) {
  const { visible } = rc.getValueRx(node.stateControl);
  if (visible === false) return null;

  const def = node.definition;
  const children = node.getChildren(rc);

  return (
    <fieldset
      className={`${def.compoundField ? "border border-zinc-200 dark:border-zinc-700 rounded p-3" : ""}`}
    >
      {def.title && (
        <legend className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
          {def.title}
        </legend>
      )}
      <div className="flex flex-col gap-3">
        {children.map((child) => (
          <FormNodeRenderer key={child.stateControl.uniqueId} node={child} />
        ))}
      </div>
    </fieldset>
  );
});

// Dispatcher — picks the right component based on definition type (plain function, no controls() wrapper)
function FormNodeRenderer({ node }: { node: FormStateNode }) {
  const def = node.definition;
  if (def.type === ControlDefinitionType.Group) {
    return <FormGroupField node={node} />;
  }
  if (def.type === ControlDefinitionType.Data) {
    return <FormDataField node={node} />;
  }
  return null;
}

// ── Raw control tree inspector ──────────────────────────────────────

// Leaf node (no children)
const ControlLeafNode = controls(function ControlLeafNode(
  { control, name }: { control: Control<any>; name: string },
  { rc },
) {
  const value = rc.getValue(control);
  const dirty = rc.isDirty(control);
  const touched = rc.isTouched(control);
  const disabled = rc.isDisabled(control);
  const valid = rc.isValid(control);
  const error = rc.getError(control);

  return (
    <div className="flex items-center gap-1.5 py-0.5 px-1 font-mono text-xs">
      <span className="w-3" />
      <span className="text-zinc-900 dark:text-zinc-100">{name}</span>
      <span className="text-zinc-400">#{control.uniqueId}</span>
      <span className="mx-1 text-zinc-300 dark:text-zinc-600">=</span>
      <ValueDisplay value={value} />
      <span className="flex-1" />
      <span className="flex gap-1">
        {dirty && (
          <Badge color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            dirty
          </Badge>
        )}
        {touched && (
          <Badge color="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
            touched
          </Badge>
        )}
        {disabled && (
          <Badge color="bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
            disabled
          </Badge>
        )}
        {!valid && (
          <Badge color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            invalid
          </Badge>
        )}
        {error && <span className="text-red-500">✗ {error}</span>}
      </span>
    </div>
  );
});

// Branch node with expandable children
const ControlBranchNode = controls(function ControlBranchNode(
  {
    control,
    name,
    defaultExpanded,
  }: { control: Control<any>; name: string; defaultExpanded?: boolean },
  { rc },
) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const impl = toImpl(control);

  const value = rc.getValue(control);
  const dirty = rc.isDirty(control);
  const touched = rc.isTouched(control);
  const disabled = rc.isDisabled(control);
  const valid = rc.isValid(control);
  const error = rc.getError(control);

  const fieldKeys = impl._fields ? Object.keys(impl._fields) : [];
  const elems = impl._elems;

  return (
    <div className="font-mono text-xs">
      <div
        className="flex items-center gap-1.5 py-0.5 px-1 rounded cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-3 text-center text-zinc-400">
          {expanded ? "▼" : "▶"}
        </span>
        <span className="text-zinc-900 dark:text-zinc-100">{name}</span>
        <span className="text-zinc-400">#{control.uniqueId}</span>
        <span className="mx-1 text-zinc-300 dark:text-zinc-600">=</span>
        <ValueDisplay value={value} />
        <span className="flex-1" />
        <span className="flex gap-1">
          {dirty && (
            <Badge color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              dirty
            </Badge>
          )}
          {touched && (
            <Badge color="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
              touched
            </Badge>
          )}
          {disabled && (
            <Badge color="bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
              disabled
            </Badge>
          )}
          {!valid && (
            <Badge color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              invalid
            </Badge>
          )}
          {error && <span className="text-red-500">✗ {error}</span>}
        </span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 16 }}>
          {fieldKeys.map((key) => (
            <ControlNodeRenderer
              key={key}
              control={impl._fields![key] as Control<any>}
              name={`.${key}`}
            />
          ))}
          {elems?.map((elem, i) => (
            <ControlNodeRenderer
              key={elem.uniqueId}
              control={elem as Control<any>}
              name={`[${i}]`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Dispatcher for control tree nodes
function ControlNodeRenderer({
  control,
  name,
  defaultExpanded,
}: {
  control: Control<any>;
  name: string;
  defaultExpanded?: boolean;
}) {
  const impl = toImpl(control);
  const hasChildren =
    (impl._fields && Object.keys(impl._fields).length > 0) ||
    (impl._elems && impl._elems.length > 0);
  if (hasChildren) {
    return (
      <ControlBranchNode
        control={control}
        name={name}
        defaultExpanded={defaultExpanded}
      />
    );
  }
  return <ControlLeafNode control={control} name={name} />;
}

// ── FormStateNode tree inspector ────────────────────────────────────

const FormStateLeafNode = controls(function FormStateLeafNode(
  { node }: { node: FormStateNode },
  { rc },
) {
  const { visible, disabled, readonly } = rc.getValueRx(node.stateControl);
  const dataNode = rc.getValue(node.stateControl.fields.dataNode);

  const def = node.definition;
  const dataValue = dataNode ? rc.getValue(dataNode.control) : undefined;
  const dataError = dataNode ? rc.getError(dataNode.control) : undefined;

  const visColor =
    visible === false
      ? "text-red-500"
      : visible === null
        ? "text-zinc-400"
        : "text-green-500";

  return (
    <div className="flex items-center gap-1.5 py-0.5 px-1 font-mono text-xs">
      <span className="w-3" />
      <Badge
        color={
          def.type === "Data"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            : def.type === "Group"
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
        }
      >
        {def.type}
      </Badge>
      {(def.field || def.compoundField) && (
        <span className="text-zinc-900 dark:text-zinc-100">
          {def.field ?? def.compoundField}
        </span>
      )}
      {def.title && (
        <span className="text-zinc-400">&ldquo;{def.title}&rdquo;</span>
      )}
      {dataNode && (
        <>
          <span className="text-zinc-300 dark:text-zinc-600">=</span>
          <ValueDisplay value={dataValue} />
        </>
      )}
      <span className="flex-1" />
      <span className="flex gap-1">
        <span className={visColor}>
          {visible === false ? "👁✗" : visible === null ? "👁?" : "👁✓"}
        </span>
        {disabled && (
          <Badge color="bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
            disabled
          </Badge>
        )}
        {readonly && (
          <Badge color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            readonly
          </Badge>
        )}
        {dataError && <span className="text-red-500">✗ {dataError}</span>}
      </span>
    </div>
  );
});

const FormStateBranchNode = controls(function FormStateBranchNode(
  { node, defaultExpanded }: { node: FormStateNode; defaultExpanded?: boolean },
  { rc },
) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);

  const { visible, disabled, readonly } = rc.getValueRx(node.stateControl);
  const dataNode = rc.getValue(
    node.stateControl.fields.dataNode as Control<SchemaDataNode | undefined>,
  );

  const def = node.definition;
  const children = node.getChildren(rc);
  const dataValue = dataNode ? rc.getValue(dataNode.control) : undefined;
  const dataError = dataNode ? rc.getError(dataNode.control) : undefined;

  const visColor =
    visible === false
      ? "text-red-500"
      : visible === null
        ? "text-zinc-400"
        : "text-green-500";

  return (
    <div className="font-mono text-xs">
      <div
        className="flex items-center gap-1.5 py-0.5 px-1 rounded cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-3 text-center text-zinc-400">
          {expanded ? "▼" : "▶"}
        </span>
        <Badge
          color={
            def.type === "Data"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : def.type === "Group"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
          }
        >
          {def.type}
        </Badge>
        {(def.field || def.compoundField) && (
          <span className="text-zinc-900 dark:text-zinc-100">
            {def.field ?? def.compoundField}
          </span>
        )}
        {def.title && (
          <span className="text-zinc-400">&ldquo;{def.title}&rdquo;</span>
        )}
        {dataNode && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600">=</span>
            <ValueDisplay value={dataValue} />
          </>
        )}
        <span className="flex-1" />
        <span className="flex gap-1">
          <span className={visColor}>
            {visible === false ? "👁✗" : visible === null ? "👁?" : "👁✓"}
          </span>
          {disabled && (
            <Badge color="bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
              disabled
            </Badge>
          )}
          {readonly && (
            <Badge color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              readonly
            </Badge>
          )}
          {dataError && <span className="text-red-500">✗ {dataError}</span>}
        </span>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 16 }}>
          {children.map((child) => (
            <FormStateNodeRenderer
              key={child.stateControl.uniqueId}
              node={child}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function FormStateNodeRenderer({
  node,
  defaultExpanded,
}: {
  node: FormStateNode;
  defaultExpanded?: boolean;
}) {
  const children = node.getChildren(noopReadContext);
  if (children.length > 0) {
    return (
      <FormStateBranchNode node={node} defaultExpanded={defaultExpanded} />
    );
  }
  return <FormStateLeafNode node={node} />;
}

// ── Demo scenario ────────────────────────────────────────────────────

function personSchema(): SchemaField {
  return {
    type: FieldType.Compound,
    field: "",
    children: [
      { type: FieldType.String, field: "type", isTypeField: true },
      { type: FieldType.String, field: "firstName" },
      { type: FieldType.String, field: "lastName" },
      { type: FieldType.String, field: "email" },
      { type: FieldType.Int, field: "age" },
      {
        type: FieldType.Compound,
        field: "address",
        children: [
          { type: FieldType.String, field: "street" },
          { type: FieldType.String, field: "city" },
          { type: FieldType.String, field: "zip" },
        ],
      },
      { type: FieldType.String, field: "company", onlyForTypes: ["business"] },
    ],
  };
}

function personFormDef(): ControlDefinition {
  return {
    type: ControlDefinitionType.Group,
    title: "Person Form",
    hidden: false,
    children: [
      {
        type: ControlDefinitionType.Data,
        field: "type",
        title: "Type (personal / business)",
        hidden: false,
      },
      {
        type: ControlDefinitionType.Data,
        field: "firstName",
        title: "First Name",
        required: true,
        hidden: false,
      },
      {
        type: ControlDefinitionType.Data,
        field: "lastName",
        title: "Last Name",
        hidden: false,
      },
      {
        type: ControlDefinitionType.Data,
        field: "email",
        title: "Email",
        required: true,
        hidden: false,
      },
      {
        type: ControlDefinitionType.Data,
        field: "age",
        title: "Age",
        hidden: false,
      },
      {
        type: ControlDefinitionType.Group,
        compoundField: "address",
        title: "Address",
        hidden: false,
        children: [
          {
            type: ControlDefinitionType.Data,
            field: "street",
            title: "Street",
            hidden: false,
          },
          {
            type: ControlDefinitionType.Data,
            field: "city",
            title: "City",
            required: true,
            hidden: false,
          },
          {
            type: ControlDefinitionType.Data,
            field: "zip",
            title: "ZIP",
            hidden: false,
          },
        ],
      },
      {
        type: ControlDefinitionType.Data,
        field: "company",
        title: "Company (business only)",
        hidden: false,
      },
    ],
  };
}

const controlContext = createControlContext();

const TreePageInner = controls(function TreePageInner({}, { controlContext }) {
  const stateRef = useRef<{
    rootControl: Control<any>;
    formNode: FormStateNode;
  } | null>(null);

  if (!stateRef.current) {
    const rootControl = controlContext.newControl({
      type: "personal",
      firstName: "",
      lastName: "Smith",
      email: "",
      age: 30,
      address: { street: "123 Main St", city: "", zip: "10001" },
      company: "",
    });
    const globals: FormGlobalOptions = {
      ctx: controlContext,
      clearHidden: true,
    };
    const dataNode = createSchemaDataNode(personSchema(), rootControl);
    const formNode = createFormStateNode(personFormDef(), dataNode, globals);
    stateRef.current = { rootControl, formNode };
  }

  const { rootControl, formNode } = stateRef.current;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
          Control Tree Visualizer
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: form editor driven by FormStateNode */}
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 shadow">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Form (driven by FormStateNode)
            </h2>
            <FormNodeRenderer node={formNode} />
          </div>

          {/* Middle: FormStateNode tree inspector */}
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 shadow">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              FormStateNode Tree
            </h2>
            <FormStateNodeRenderer node={formNode} defaultExpanded={true} />
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <h3 className="text-xs font-semibold text-zinc-500 mb-2">
                Legend
              </h3>
              <div className="flex flex-wrap gap-3 text-[10px]">
                <span>👁✓ visible</span>
                <span>👁? null</span>
                <span>👁✗ hidden</span>
                <Badge color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Data
                </Badge>
                <Badge color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                  Group
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: raw control tree */}
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 shadow">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Raw Control Tree
            </h2>
            <ControlNodeRenderer
              control={rootControl}
              name="root"
              defaultExpanded={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default function TreePage() {
  return (
    <ControlContextProvider value={controlContext}>
      <TreePageInner />
    </ControlContextProvider>
  );
}
