"use client";

import { useControl, useControlEffect } from "@react-typed-forms/core";
import { createStdFormRenderer } from "@/renderers";
import { TeaEditorForm } from "client-common/formdefs";
import {
  TeaEditorFormSchema,
  defaultTeaEditorForm,
  TeaEditorForm as TeaEditorFormType,
} from "client-common/schemas";
import {
  useApiClient,
  useQueryControl,
  useSyncParam,
  makeOptStringParam,
  useNavigationService,
} from "@astroapps/client";
import { TeasClient } from "client-common/client";
import { useMemo } from "react";
import { RenderFormData } from "@/RenderFormData";

export default function FormDemoPage() {
  const { Link } = useNavigationService();
  const client = useApiClient(TeasClient);
  const queryControl = useQueryControl();
  const teaId = useSyncParam(queryControl, "id", makeOptStringParam());

  // Initialize form data
  const formData = useControl<TeaEditorFormType>({
    ...defaultTeaEditorForm,
    teaId: teaId.value ?? null,
  });

  // Load existing tea if ID provided
  useControlEffect(
    () => teaId.value,
    async (id) => {
      if (!id) {
        formData.value = {
          ...defaultTeaEditorForm,
          teaId: null,
        };
        return;
      }
      try {
        const tea = await client.get(id);
        formData.fields.tea.value = {
          type: tea.type,
          numberOfSugars: tea.numberOfSugars,
          milkAmount: tea.milkAmount,
          includeSpoon: tea.includeSpoon,
          brewNotes: tea.brewNotes ?? null,
          id: tea.id,
        };
        formData.fields.teaId.value = id;
      } catch (e) {
        console.error("Failed to load tea:", e);
      }
    },
    true
  );

  // Create renderer
  const renderer = useMemo(() => createStdFormRenderer(), []);

  // Handle save action
  async function handleSave() {
    try {
      if (formData.fields.teaId.value) {
        // Update existing tea
        await client.update(formData.fields.teaId.value, {
          type: formData.fields.tea.value.type,
          numberOfSugars: formData.fields.tea.value.numberOfSugars,
          milkAmount: formData.fields.tea.value.milkAmount,
          includeSpoon: formData.fields.tea.value.includeSpoon,
          brewNotes: formData.fields.tea.value.brewNotes,
        });
        alert("Tea updated successfully!");
      } else {
        // Create new tea
        const created = await client.create({
          type: formData.fields.tea.value.type,
          numberOfSugars: formData.fields.tea.value.numberOfSugars,
          milkAmount: formData.fields.tea.value.milkAmount,
          includeSpoon: formData.fields.tea.value.includeSpoon,
          brewNotes: formData.fields.tea.value.brewNotes,
        });
        formData.fields.teaId.value = created.id;
        formData.fields.tea.fields.id.value = created.id;
        alert("Tea created successfully!");
      }
    } catch (e) {
      console.error("Failed to save tea:", e);
      alert("Failed to save tea. Check console for details.");
    }
  }

  if (!queryControl.fields.isReady.value) return <></>;

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {teaId.value ? "Edit Tea" : "Create Tea"}
        </h1>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <RenderFormData
          data={formData}
          controls={TeaEditorForm.controls}
          schema={TeaEditorFormSchema}
          renderer={renderer}
        />

        <div className="flex gap-4 mt-6 pt-6 border-t">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
          >
            Save Tea
          </button>
          <Link
            href="/"
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
          >
            Cancel
          </Link>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Form Data (Debug)</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(formData.value, null, 2)}
        </pre>
      </div>
    </div>
  );
}
