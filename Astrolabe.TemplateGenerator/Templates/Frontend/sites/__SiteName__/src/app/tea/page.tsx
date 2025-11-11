"use client";

import {
  Control,
  Fcheckbox,
  Finput,
  Fselect,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { useApiClient } from "@astroapps/client";
import { Button } from "@astrolabe/ui";
import {
  TeasClient,
  TeaInfo,
  TeaEdit,
  TeaType,
  MilkAmount,
} from "client-common";
import { useState } from "react";

export default function TeaPage() {
  // State management with useControl (following BEST-PRACTICES.md)
  const client = useApiClient(TeasClient);
  const searchTerm = useControl("");
  const filterByType = useControl<TeaType | null>(null);
  const teaList = useControl<TeaInfo[]>([]);
  const editorForm = useControl<TeaEdit>({
    type: TeaType.Black,
    numberOfSugars: 0,
    milkAmount: MilkAmount.None,
    includeSpoon: false,
    brewNotes: null,
  });
  const editingTeaId = useControl<string | null>(null);
  const isEditing = useControl(false);

  // Load teas on mount and when search changes
  useControlEffect(
    () => searchTerm.value,
    async () => {
      await loadTeas();
      console.log(TeaType);
    },
    true // Run on mount
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
      // Global error handler will show user-facing error
    }
  }

  async function handleCreate() {
    editorForm.value = {
      type: TeaType.Black,
      numberOfSugars: 0,
      milkAmount: MilkAmount.None,
      includeSpoon: false,
      brewNotes: null,
    };
    editingTeaId.value = null;
    isEditing.value = true;
  }

  async function handleEdit(id: string) {
    try {
      const teaView = await client.get(id);
      editorForm.value = {
        type: teaView.type,
        numberOfSugars: teaView.numberOfSugars,
        milkAmount: teaView.milkAmount,
        includeSpoon: teaView.includeSpoon,
        brewNotes: teaView.brewNotes,
      };
      editingTeaId.value = id;
      isEditing.value = true;
    } catch (e) {
      console.error("Failed to load tea for editing:", e);
    }
  }

  async function handleSave() {
    try {
      const teaEdit = editorForm.value;
      const teaId = editingTeaId.value;

      if (teaId) {
        // Update existing
        await client.update(teaId, teaEdit);
      } else {
        // Create new
        await client.create(teaEdit);
      }

      isEditing.value = false;
      editingTeaId.value = null;
      await loadTeas(); // Refresh list
    } catch (e) {
      console.error("Failed to save tea:", e);
    }
  }

  function handleCancel() {
    isEditing.value = false;
    editingTeaId.value = null;
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this tea?")) {
      return;
    }

    try {
      await client.delete(id);
      await loadTeas(); // Refresh list
    } catch (e) {
      console.error("Failed to delete tea:", e);
    }
  }

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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm.value}
            onChange={(e) => (searchTerm.value = e.target.value)}
          />
          <Fselect
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            control={filterByType as Control<string>}
            value={filterByType.value as string}
          >
            <option value="">All Types</option>
            {Object.keys(TeaType).map((key) => (
              <option key={key} value={key}>
                {TeaType[key as TeaType]}
              </option>
            ))}
          </Fselect>
        </div>
      </div>

      {/* Editor Section (Create/Edit) */}
      {isEditing.value && (
        <div className="mb-8 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
          <h2 className="text-2xl font-semibold mb-6">
            {editingTeaId.value ? "Edit Tea" : "Create New Tea"}
          </h2>

          <div className="space-y-4">
            {/* Tea Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tea Type
              </label>
              <Fselect
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editorForm.fields.type.value}
                control={editorForm.fields.type}
              >
                {Object.keys(TeaType).map((key) => (
                  <option key={key} value={key}>
                    {TeaType[key as TeaType]}
                  </option>
                ))}
              </Fselect>
            </div>

            {/* Number of Sugars */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Sugars
              </label>
              <Finput
                type="number"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editorForm.fields.numberOfSugars.value}
                control={editorForm.fields.numberOfSugars}
              />
            </div>

            {/* Milk Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Milk Amount
              </label>
              <Fselect
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editorForm.fields.milkAmount.value}
                control={editorForm.fields.milkAmount}
              >
                {Object.keys(MilkAmount).map((key) => (
                  <option key={key} value={key}>
                    {MilkAmount[key as MilkAmount]}
                  </option>
                ))}
              </Fselect>
            </div>

            {/* Include Spoon */}
            <div className="flex items-center">
              <Fcheckbox
                type="checkbox"
                id="includeSpoon"
                className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                checked={editorForm.fields.includeSpoon.value}
                control={editorForm.fields.includeSpoon as Control<boolean>}
              />
              <label
                htmlFor="includeSpoon"
                className="ml-2 text-sm font-medium text-gray-700"
              >
                Include Spoon
              </label>
            </div>

            {/* Brew Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brew Notes
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={editorForm.fields.brewNotes.value ?? ""}
                onChange={(e) =>
                  (editorForm.fields.brewNotes.value = e.target.value || null)
                }
                placeholder="Optional brewing instructions or notes..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-2">
            <Button onClick={handleSave} variant="primary">
              {editingTeaId.value ? "Update Tea" : "Create Tea"}
            </Button>
            <Button onClick={handleCancel} variant="gray">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tea List Section */}
      {teaList.value.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No teas found.</p>
          <p className="mt-2">Click &quot;Add New Tea&quot; to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teaList.value.map((tea) => (
            <TeaCard
              key={tea.id}
              tea={tea}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Tea Card Component
interface TeaCardProps {
  tea: TeaInfo;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function TeaCard({ tea, onEdit, onDelete }: TeaCardProps) {
  return (
    <div className="p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          {TeaType[tea.type]} Tea
        </h3>
        <span className="px-3 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
          {MilkAmount[tea.milkAmount]}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center text-gray-600">
          <span className="font-medium mr-2">Sugars:</span>
          <span>{tea.numberOfSugars}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => onEdit(tea.id)} variant="outline" size="sm">
          Edit
        </Button>
        <Button onClick={() => onDelete(tea.id)} variant="danger" size="sm">
          Delete
        </Button>
      </div>
    </div>
  );
}
