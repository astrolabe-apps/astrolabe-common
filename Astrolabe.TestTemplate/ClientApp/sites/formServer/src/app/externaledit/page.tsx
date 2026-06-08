"use client";

import {
  ArrayElementRenderOptions,
  ArrayRenderOptions,
  buildSchema,
  compoundField,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  dataControl,
  DataRenderType,
  groupedControl,
  stringField,
} from "@astroapps/forms-core";
import { RenderControl, useControl } from "@react-typed-forms/core";
import { createFormRenderer, RenderForm } from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

// ---------------------------------------------------------------------------
// Schema: an array of compound { name, email } rows.
// ---------------------------------------------------------------------------
interface Contact {
  name: string;
  email: string;
}
interface FormData {
  items: Contact[];
}

const ContactSchema = buildSchema<Contact>({
  name: stringField("Name"),
  email: stringField("Email"),
});

const FormSchema = buildSchema<FormData>({
  items: compoundField("Inline contacts", ContactSchema, { collection: true }),
});

// The element template shared by both the list and the modal host.
const elementTemplate = [
  groupedControl([
    dataControl("name", "Name", { required: true }),
    dataControl("email", "Email"),
  ]),
];

// ---------------------------------------------------------------------------
// Form definition — modal-staged add/edit for an array (`editExternal`).
//
// Two controls bound to the SAME `items` field (so they share one array
// Control, hence one staged-edit session):
//
//  1. renderType: Array, editExternal: true
//     Renders the row list + Add / per-row Edit buttons. Clicking them stages
//     a draft instead of mutating the array directly.
//
//  2. renderType: ArrayElement
//     The modal host. Renders nothing until a draft is staged; when one is, it
//     shows the draft form in a dialog with Cancel / Apply. Apply validates the
//     draft, then commits it to the array.
// ---------------------------------------------------------------------------
const formControls = [
  dataControl("items", "Inline contacts", {
    renderOptions: {
      type: DataRenderType.Array,
      editExternal: true,
    } as ArrayRenderOptions,
    children: elementTemplate,
  }),
  dataControl("items", undefined, {
    hideTitle: true,
    renderOptions: {
      type: DataRenderType.ArrayElement,
    } as ArrayElementRenderOptions,
    children: elementTemplate,
  }),
];

const formTree = createFormTree(formControls);
const schemaTree = createSchemaTree(FormSchema);

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ExternalEditPage() {
  const data = useControl<FormData>({
    items: [{ name: "Ada Lovelace", email: "ada@example.com" }],
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Array modal add/edit (<code>editExternal</code>)
        </h1>
        <p className="text-gray-600 mt-1">
          The same array field is rendered twice: a{" "}
          <code>renderType: Array</code> list (with <code>editExternal</code>)
          that stages edits, and a <code>renderType: ArrayElement</code> host
          that pops the draft dialog. Click <b>Add</b> or a row&apos;s{" "}
          <b>Edit</b> — a modal opens with the row fields. <b>Apply</b> commits
          (after validation; clear Name to see it block), <b>Cancel</b>{" "}
          discards. The list only changes on Apply.
        </p>
      </div>

      <div className="rounded-lg border p-4 shadow-sm">
        <RenderForm
          data={createSchemaDataNode(schemaTree.rootNode, data)}
          form={formTree.rootNode}
          renderer={formRenderer}
        />
      </div>

      <RenderControl>
        {() => (
          <details className="mt-4" open>
            <summary className="cursor-pointer font-medium">
              Raw form data (JSON)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
              {JSON.stringify(data.value, null, 2)}
            </pre>
          </details>
        )}
      </RenderControl>
    </div>
  );
}
