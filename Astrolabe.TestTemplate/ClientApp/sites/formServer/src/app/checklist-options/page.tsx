"use client";

import {
  boolField,
  buildSchema,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  stringField,
  stringOptionsField,
  withScalarOptions,
} from "@astroapps/forms-core";
import { useControl } from "@react-typed-forms/core";
import {
  checkListOptions,
  createFormRenderer,
  dataControl,
  groupedControl,
  jsonataExpr,
  notExpr,
  radioButtonOptions,
  RenderForm,
  textDisplayControl,
  withScripts,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

// ---------------------------------------------------------------------------
// Schema
//
// Each section gets its own fields so the sections don't interfere.
// ---------------------------------------------------------------------------
interface ChecklistForm {
  // 1. Scripted AllowedOptions + child form nodes
  limitFruit: boolean;
  fruit: string[];
  fruitNote: string;
  // 2. Scripted node disabled over a checklist with children
  lockToppings: boolean;
  toppings: string[];
  toppingNote: string;
  // 3. Per-option disabled synthesised by AllowedOptions
  disableExpensive: boolean;
  plan: string[];
  // 4. Disabled inherited from an ancestor group
  lockSection: boolean;
  access: string[];
  accessReason: string;
  // 5. Radio parity (same child-node code path)
  limitSize: boolean;
  lockSize: boolean;
  size: string;
  sizeNote: string;
}

const FRUIT = [
  { name: "Apple", value: "apple" },
  { name: "Banana", value: "banana" },
  { name: "Cherry", value: "cherry" },
  { name: "Durian", value: "durian" },
];

const ChecklistSchema = buildSchema<ChecklistForm>({
  // 1
  limitFruit: boolField("Limit to Apple & Cherry"),
  fruit: withScalarOptions(
    { collection: true, options: FRUIT },
    stringField("Fruit"),
  ),
  fruitNote: stringField("Why this fruit?"),
  // 2
  lockToppings: boolField("Lock the toppings checklist"),
  toppings: withScalarOptions(
    {
      collection: true,
      options: [
        { name: "Cheese", value: "cheese" },
        { name: "Olives", value: "olives" },
        { name: "Anchovies", value: "anchovies" },
      ],
    },
    stringField("Toppings"),
  ),
  toppingNote: stringField("Topping note"),
  // 3
  disableExpensive: boolField("Disable the paid plans"),
  plan: withScalarOptions(
    {
      collection: true,
      options: [
        { name: "Free", value: "free" },
        { name: "Pro", value: "pro" },
        { name: "Enterprise", value: "enterprise" },
      ],
    },
    stringField("Plans"),
  ),
  // 4
  lockSection: boolField("Lock the whole section"),
  access: withScalarOptions(
    {
      collection: true,
      options: [
        { name: "Read", value: "read" },
        { name: "Write", value: "write" },
        { name: "Admin", value: "admin" },
      ],
    },
    stringField("Access"),
  ),
  accessReason: stringField("Reason"),
  // 5
  limitSize: boolField("Limit to Small & Large"),
  lockSize: boolField("Lock the radio group"),
  size: stringOptionsField(
    "Size",
    { name: "Small", value: "small" },
    { name: "Medium", value: "medium" },
    { name: "Large", value: "large" },
  ),
  sizeNote: stringField("Size note"),
});

const schemaLookup = createSchemaLookup({ ChecklistSchema });
const schemaTree = schemaLookup.getSchemaTree("ChecklistSchema");

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

// ---------------------------------------------------------------------------
// Shared child-node definitions
//
// Children of a CheckList/Radio control are instantiated once per *option*
// (see resolveChildren.ts). Each instance gets `$formData.option` and
// `$formData.optionSelected` in scope, and is a normal FormStateNode - so it
// inherits `disabled` from the checklist node above it.
// ---------------------------------------------------------------------------
// Scripts are resolved per *object level*, so scripting a field of a nested
// object needs `$scripts` on that nested object. `withScripts` accepts dotted
// paths and builds that nesting for you.
const optionEcho = withScripts(textDisplayControl("(no option scope)"), {
  "displayData.text": jsonataExpr(
    `"child node for " & $formData.option.name & " (selected: " & $string($formData.optionSelected) & ")"`,
  ),
  styleClass: jsonataExpr(
    `$formData.optionSelected ? "text-sm text-green-700" : "text-sm text-gray-400"`,
  ),
});

/** A real data control inside the option - should follow the parent's disabled state. */
function optionDetail(field: string, title: string) {
  return withScripts(dataControl(field, title), {
    hidden: notExpr(jsonataExpr("$formData.optionSelected")),
  });
}

// ---------------------------------------------------------------------------
// Section 1 - scripted AllowedOptions on a CheckList that has children
// ---------------------------------------------------------------------------
const scriptedOptionsSection = groupedControl(
  [
    dataControl("limitFruit", "Limit to Apple & Cherry"),
    withScripts(
      dataControl("fruit", "Fruit", {
        ...checkListOptions({}),
        children: [optionEcho, optionDetail("fruitNote", "Why this fruit?")],
      }),
      {
        allowedOptions: jsonataExpr(
          `$boolean(limitFruit) ? ["apple", "cherry"] : ["apple", "banana", "cherry", "durian"]`,
        ),
      },
    ),
    textDisplayControl(
      "Toggling the limit must add/remove whole option child nodes. A value for " +
        "an option that disappears is left in the data (fruit stays [\"banana\"]) - " +
        "that is accepted: the option list is not expected to change dynamically.",
      { styleClass: "text-xs text-gray-500" },
    ),
  ],
  "1. Scripted AllowedOptions + child form nodes",
);

// ---------------------------------------------------------------------------
// Section 2 - scripted `disabled` on the checklist node itself
// ---------------------------------------------------------------------------
const nodeDisabledSection = groupedControl(
  [
    dataControl("lockToppings", "Lock the toppings checklist"),
    withScripts(
      dataControl("toppings", "Toppings", {
        ...checkListOptions({}),
        children: [optionEcho, optionDetail("toppingNote", "Topping note")],
      }),
      { disabled: jsonataExpr("$boolean(lockToppings)") },
    ),
    textDisplayControl(
      "Locking must disable every checkbox (formNode.disabled) AND the child " +
        "data control revealed under a selected option.",
      { styleClass: "text-xs text-gray-500" },
    ),
  ],
  "2. Scripted disabled on the checklist node",
);

// ---------------------------------------------------------------------------
// Section 3 - per-option disabled, synthesised by AllowedOptions
//
// AllowedOptions entries may be whole FieldOption objects, not just values,
// so an expression can mark individual options `disabled`.
// ---------------------------------------------------------------------------
const perOptionDisabledSection = groupedControl(
  [
    dataControl("disableExpensive", "Disable the paid plans"),
    withScripts(
      dataControl("plan", "Plans", {
        ...checkListOptions({}),
        children: [optionEcho],
      }),
      {
        allowedOptions: jsonataExpr(
          `[
             { "name": "Free", "value": "free" },
             { "name": "Pro", "value": "pro", "disabled": $boolean(disableExpensive) },
             { "name": "Enterprise", "value": "enterprise", "disabled": $boolean(disableExpensive) }
           ]`,
        ),
      },
    ),
    textDisplayControl(
      "Only Pro & Enterprise should go disabled; Free stays clickable and the " +
        "child nodes should still render for all three.",
      { styleClass: "text-xs text-gray-500" },
    ),
    // CONTROL CASE: same scripted display text, but at section level.
    withScripts(textDisplayControl("(not scripted)"), {
      "displayData.text": jsonataExpr(
        `"control case: scripted display text at section level (disableExpensive=" & $string(disableExpensive) & ")"`,
      ),
      styleClass: jsonataExpr(`"text-xs text-blue-700"`),
    }),
  ],
  "3. Per-option disabled from AllowedOptions",
);

// ---------------------------------------------------------------------------
// Section 4 - disabled inherited from an ancestor group
// ---------------------------------------------------------------------------
const inheritedDisabledSection = groupedControl(
  [
    dataControl("lockSection", "Lock the whole section"),
    withScripts(
      groupedControl(
        [
          dataControl("access", "Access", {
            ...checkListOptions({}),
            children: [optionEcho, optionDetail("accessReason", "Reason")],
          }),
        ],
        "Inner group",
      ),
      { disabled: jsonataExpr("$boolean(lockSection)") },
    ),
    textDisplayControl(
      "Disabled must flow group -> checklist -> per-option child nodes.",
      { styleClass: "text-xs text-gray-500" },
    ),
  ],
  "4. Disabled inherited from an ancestor group",
);

// ---------------------------------------------------------------------------
// Section 5 - Radio parity (shares the child-node code path with CheckList)
// ---------------------------------------------------------------------------
const radioSection = groupedControl(
  [
    dataControl("limitSize", "Limit to Small & Large"),
    dataControl("lockSize", "Lock the radio group"),
    withScripts(
      dataControl("size", "Size", {
        ...radioButtonOptions({}),
        children: [optionEcho, optionDetail("sizeNote", "Size note")],
      }),
      {
        allowedOptions: jsonataExpr(
          `$boolean(limitSize) ? ["small", "large"] : ["small", "medium", "large"]`,
        ),
        disabled: jsonataExpr("$boolean(lockSize)"),
      },
    ),
  ],
  "5. Radio parity",
);

const formTree = createFormTree([
  scriptedOptionsSection,
  nodeDisabledSection,
  perOptionDisabledSection,
  inheritedDisabledSection,
  radioSection,
]);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ChecklistOptionsPage() {
  const data = useControl<ChecklistForm>({
    limitFruit: false,
    fruit: ["banana"],
    fruitNote: "",
    lockToppings: false,
    toppings: ["cheese"],
    toppingNote: "",
    disableExpensive: false,
    plan: ["free"],
    lockSection: false,
    access: ["read"],
    accessReason: "",
    limitSize: false,
    lockSize: false,
    size: "medium",
    sizeNote: "",
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-2">
      <h1 className="text-2xl font-bold mb-4">
        Checklist Options: scripting + child nodes + disabled
      </h1>
      <p className="text-gray-600 mb-6">
        Exercises <code>DataRenderType.CheckList</code> (and{" "}
        <code>Radio</code>) where the option list is driven by a scripted{" "}
        <code>allowedOptions</code> expression <em>and</em> each option
        instantiates child form nodes, under both node-level and per-option{" "}
        <code>disabled</code>.
      </p>
      <div className="mb-6 rounded border border-sky-300 bg-sky-50 p-4 text-sm">
        <p className="font-semibold">Note on nested scripts</p>
        <p className="mt-1">
          <code>$scripts</code> is resolved <em>per object level</em>, so
          scripting a field of a nested object needs <code>$scripts</code> on
          that nested object. <code>withScripts</code> accepts dotted paths
          (e.g. <code>&quot;displayData.text&quot;</code>) and builds the
          nesting for you.
        </p>
      </div>
      <RenderForm
        data={createSchemaDataNode(schemaTree.rootNode, data)}
        form={formTree.rootNode}
        renderer={formRenderer}
        options={{ clearHidden: true }}
      />
      <details className="mt-8" open>
        <summary className="cursor-pointer font-medium">
          Raw form data (JSON)
        </summary>
        <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
          {JSON.stringify(data.value, null, 2)}
        </pre>
      </details>
    </div>
  );
}
