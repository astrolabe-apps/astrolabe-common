"use client";

import {
  actionControl,
  buildSchema,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  dataControl,
  groupedControl,
  GroupRenderType,
  stringField,
  stringOptionsField,
} from "@astroapps/forms-core";
import { RenderControl, useControl } from "@react-typed-forms/core";
import { createFormRenderer, RenderForm } from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
interface Profile {
  name: string;
  email: string;
  role: string;
  bio: string;
}

const ProfileSchema = buildSchema<Profile>({
  name: stringField("Name"),
  email: stringField("Email"),
  role: stringOptionsField(
    "Role",
    { name: "Engineer", value: "engineer" },
    { name: "Designer", value: "designer" },
    { name: "Manager", value: "manager" },
  ),
  bio: stringField("Bio"),
});

// ---------------------------------------------------------------------------
// Form definition
//
// A `GroupRenderType.Dialog` group renders its `placement: "trigger"` children
// inline (the button that opens the modal) and everything else inside the
// modal. The dialog renderer wires up two synthetic actions for us:
//   - "openDialog"  -> opens the modal
//   - "closeDialog" -> closes the modal
// The data fields inside the dialog bind to the same controls used elsewhere,
// so edits are live (no separate "apply" step needed for this pattern).
// ---------------------------------------------------------------------------
const formControls = [
  groupedControl(
    [
      // Opens the modal. `placement: "trigger"` keeps this button on the page.
      actionControl("Edit Profile", "openDialog", { placement: "trigger" }),

      // These render inside the modal.
      dataControl("name", "Name", { required: true }),
      dataControl("email", "Email"),
      dataControl("role", "Role"),
      dataControl("bio", "Bio", {
        renderOptions: { type: "Textfield", multiline: true } as any,
      }),

      // Closes the modal.
      actionControl("Done", "closeDialog"),
    ],
    undefined,
    {
      groupOptions: {
        type: GroupRenderType.Dialog,
        title: "Edit Profile",
      } as any,
    },
  ),
];

const formTree = createFormTree(formControls);
const schemaTree = createSchemaTree(ProfileSchema);

const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DialogEditPage() {
  const data = useControl<Profile>({
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "engineer",
    bio: "Mathematician and writer.",
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modal-staged editing</h1>
        <p className="text-gray-600 mt-1">
          Demonstrates the working modal pattern in this repo: a{" "}
          <code>GroupRenderType.Dialog</code> group rendered by{" "}
          <code>DefaultDialogRenderer</code>. Click <b>Edit Profile</b> to open
          the dialog; the fields inside edit the same controls shown in the
          summary card, so changes appear live.
        </p>
      </div>

      {/* Read-only summary of the current data */}
      <RenderControl>
        {() => {
          const p = data.value;
          return (
            <div className="rounded-lg border p-4 shadow-sm space-y-1">
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="text-gray-600">{p.email}</div>
              <div className="text-gray-600 capitalize">{p.role}</div>
              <div className="text-gray-700 mt-2">{p.bio}</div>
            </div>
          );
        }}
      </RenderControl>

      {/* The trigger button + the modal form */}
      <RenderForm
        data={createSchemaDataNode(schemaTree.rootNode, data)}
        form={formTree.rootNode}
        renderer={formRenderer}
      />

      <RenderControl>
        {() => (
          <details className="mt-4">
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
