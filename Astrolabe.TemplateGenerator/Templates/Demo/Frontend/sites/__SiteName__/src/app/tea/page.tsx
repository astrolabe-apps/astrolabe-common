"use client";

import { useControl, useControlEffect } from "@react-typed-forms/core";
import {
  useApiClient,
  useQueryControl,
  useSyncParam,
  makeOptStringParam,
} from "@astroapps/client";
import { Button } from "@astrolabe/ui";
import {
  TeasClient,
  TeaInfo,
  TeaType,
  MilkAmount,
} from "client-common/client";
import { useMemo, useState } from "react";
import { RenderFormData } from "@/RenderFormData";
import { createStdFormRenderer } from "@/renderers";
import {
  TeaEditorForm,
  TeaViewPageForm,
} from "client-common/formdefs";
import {
  TeaEditorFormSchema,
  TeaViewPageFormSchema,
  defaultTeaEditorForm,
  TeaEditorForm as TeaEditorFormType,
  TeaViewPageForm as TeaViewPageFormType,
} from "client-common/schemas";
import { TeaCard } from "./TeaCard";

export default function TeaPage() {
  const client = useApiClient(TeasClient);
  const queryControl = useQueryControl();
  const selectedTeaId = useSyncParam(queryControl, "id", makeOptStringParam());

  const searchTerm = useControl("");
  const filterByType = useControl<TeaType | null>(null);
  const teaList = useControl<TeaInfo[]>([]);

  // Form controls for editing and viewing
  const editorFormData = useControl<TeaEditorFormType>(defaultTeaEditorForm);
  const viewFormData = useControl<TeaViewPageFormType | null>(null);

  const [isEditing, setIsEditing] = useState(false);

  // Create renderer
  const renderer = useMemo(() => createStdFormRenderer(), []);

  // Load teas on mount and when search changes
  useControlEffect(
    () => searchTerm.value,
    async () => {
      await loadTeas();
    },
    true // Run on mount
  );

  // Load tea details when a tea is selected for viewing (not editing)
  useControlEffect(
    () => [selectedTeaId.value, isEditing] as const,
    async ([id, editing]) => {
      if (!id || editing) {
        viewFormData.value = null;
        return;
      }
      try {
        const tea = await client.get(id);
        viewFormData.value = {
          tea: {
            id: tea.id,
            type: tea.type,
            numberOfSugars: tea.numberOfSugars,
            milkAmount: tea.milkAmount,
            includeSpoon: tea.includeSpoon,
            brewNotes: tea.brewNotes ?? null,
          },
          teaId: id,
        };
      } catch (e) {
        console.error("Failed to load tea for viewing:", e);
      }
    },
    true
  );

  // Helper functions
  async function loadTeas() {
    try {
      const allTeas = await client.getAll();

      // Apply search filter
      const search = searchTerm.value.toLowerCase();
      const typeFilter = filterByType.value;

      let filtered = allTeas;

      if (search) {
        filtered = filtered.filter(
          (tea) =>
            TeaType[tea.type].toLowerCase().includes(search) ||
            tea.numberOfSugars.toString().includes(search) ||
            MilkAmount[tea.milkAmount].toLowerCase().includes(search)
        );
      }

      if (typeFilter !== null) {
        filtered = filtered.filter((tea) => tea.type === typeFilter);
      }

      teaList.value = filtered;
    } catch (e) {
      console.error("Failed to load teas:", e);
    }
  }

  async function handleCreate() {
    editorFormData.value = {
      ...defaultTeaEditorForm,
      teaId: null,
    };
    selectedTeaId.value = null;
    setIsEditing(true);
  }

  async function handleEdit(id: string) {
    try {
      const tea = await client.get(id);
      editorFormData.value = {
        tea: {
          type: tea.type,
          numberOfSugars: tea.numberOfSugars,
          milkAmount: tea.milkAmount,
          includeSpoon: tea.includeSpoon,
          brewNotes: tea.brewNotes ?? null,
          id: "", // TeaEdit doesn't have id, but schema requires it
        },
        teaId: id,
      };
      selectedTeaId.value = id;
      setIsEditing(true);
    } catch (e) {
      console.error("Failed to load tea for editing:", e);
    }
  }

  async function handleSave() {
    try {
      const teaData = editorFormData.value.tea;
      const teaId = editorFormData.value.teaId;

      if (teaId) {
        // Update existing
        await client.update(teaId, {
          type: teaData.type,
          numberOfSugars: teaData.numberOfSugars,
          milkAmount: teaData.milkAmount,
          includeSpoon: teaData.includeSpoon,
          brewNotes: teaData.brewNotes,
        });
      } else {
        // Create new
        const created = await client.create({
          type: teaData.type,
          numberOfSugars: teaData.numberOfSugars,
          milkAmount: teaData.milkAmount,
          includeSpoon: teaData.includeSpoon,
          brewNotes: teaData.brewNotes,
        });
        selectedTeaId.value = created.id;
      }

      setIsEditing(false);
      await loadTeas(); // Refresh list
    } catch (e) {
      console.error("Failed to save tea:", e);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    if (!editorFormData.value.teaId) {
      selectedTeaId.value = null;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this tea?")) {
      return;
    }

    try {
      await client.delete(id);
      if (selectedTeaId.value === id) {
        selectedTeaId.value = null;
        setIsEditing(false);
      }
      await loadTeas(); // Refresh list
    } catch (e) {
      console.error("Failed to delete tea:", e);
    }
  }

  function handleView(id: string) {
    selectedTeaId.value = id;
    setIsEditing(false);
  }

  if (!queryControl.fields.isReady.value) return <></>;

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Tea Manager</h1>
        <Button onClick={handleCreate} variant="primary">
          Add New Tea
        </Button>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search teas..."
            aria-label="Search teas"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm.value}
            onChange={(e) => (searchTerm.value = e.target.value)}
          />
          <select
            aria-label="Filter by tea type"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterByType.value ?? ""}
            onChange={(e) =>
              (filterByType.value = e.target.value ? (e.target.value as TeaType) : null)
            }
          >
            <option value="">All Types</option>
            {Object.keys(TeaType)
              .filter((key) => isNaN(Number(key)))
              .map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tea List Section */}
        <div className="lg:col-span-1">
          {teaList.value.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No teas found.</p>
              <p className="mt-2">Click &quot;Add New Tea&quot; to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teaList.value.map((tea) => (
                <TeaCard
                  key={tea.id}
                  tea={tea}
                  isSelected={selectedTeaId.value === tea.id}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail/Editor Section */}
        <div className="lg:col-span-2">
          {isEditing ? (
            <div className="p-6 bg-white shadow-lg rounded-lg border border-gray-200">
              <h2 className="text-2xl font-semibold mb-6">
                {editorFormData.value.teaId ? "Edit Tea" : "Create New Tea"}
              </h2>

              <RenderFormData
                data={editorFormData}
                controls={TeaEditorForm.controls}
                schema={TeaEditorFormSchema}
                renderer={renderer}
              />

              <div className="mt-6 flex gap-2 pt-6 border-t">
                <Button onClick={handleSave} variant="primary">
                  {editorFormData.value.teaId ? "Update Tea" : "Create Tea"}
                </Button>
                <Button onClick={handleCancel} variant="gray">
                  Cancel
                </Button>
              </div>
            </div>
          ) : viewFormData.value ? (
            <div className="p-6 bg-white shadow-lg rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-semibold">Tea Details</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(selectedTeaId.value!)}
                    variant="outline"
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(selectedTeaId.value!)}
                    variant="danger"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <RenderFormData
                data={viewFormData}
                controls={TeaViewPageForm.controls}
                schema={TeaViewPageFormSchema}
                renderer={renderer}
              />
            </div>
          ) : (
            <div className="p-6 bg-gray-50 shadow-lg rounded-lg border border-gray-200 text-center text-gray-500">
              <p className="text-lg">Select a tea from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
