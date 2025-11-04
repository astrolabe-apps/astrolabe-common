"use client";

import { useState, useEffect } from "react";
import { useControl } from "@react-typed-forms/core";
import { renderControl } from "@astroapps/controls";
import { TeasClient, TeaDto, TeaEdit } from "@__AppName__/client-common/client";
import { TeaEditForm } from "@__AppName__/client-common/formdefs";
import { createStdFormRenderer } from "@/renderers";

const client = new TeasClient("http://localhost:__HttpsPort__");

export default function TeaPage() {
  const [teas, setTeas] = useState<TeaDto[]>([]);
  const [editingTea, setEditingTea] = useState<TeaDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const formControl = useControl<TeaEdit>({
    type: 0,
    numberOfSugars: 0,
    milkAmount: 0,
    includeSpoon: false,
    brewNotes: null,
  });

  useEffect(() => {
    loadTeas();
  }, []);

  const loadTeas = async () => {
    const data = await client.getAll();
    setTeas(data);
  };

  const handleCreate = () => {
    formControl.setValue({
      type: 0,
      numberOfSugars: 0,
      milkAmount: 0,
      includeSpoon: false,
      brewNotes: null,
    });
    setEditingTea(null);
    setIsCreating(true);
  };

  const handleEdit = (tea: TeaDto) => {
    formControl.setValue({
      type: tea.type,
      numberOfSugars: tea.numberOfSugars,
      milkAmount: tea.milkAmount,
      includeSpoon: tea.includeSpoon,
      brewNotes: tea.brewNotes,
    });
    setEditingTea(tea);
    setIsCreating(false);
  };

  const handleSave = async () => {
    const value = formControl.value;
    if (isCreating) {
      await client.create(value);
    } else if (editingTea) {
      await client.update(editingTea.id, value);
    }
    setIsCreating(false);
    setEditingTea(null);
    await loadTeas();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this tea?")) {
      await client.delete(id);
      await loadTeas();
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTea(null);
  };

  const renderer = createStdFormRenderer(null);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Tea Manager</h1>

      <div className="mb-6">
        <button
          onClick={handleCreate}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add New Tea
        </button>
      </div>

      {(isCreating || editingTea) && (
        <div className="mb-8 p-6 bg-white shadow-md rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">
            {isCreating ? "Create New Tea" : "Edit Tea"}
          </h2>
          <div className="space-y-4">
            {renderControl(formControl, TeaEditForm.control, renderer)}
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teas.map((tea) => (
          <div key={tea.id} className="p-6 bg-white shadow-md rounded-lg">
            <h3 className="text-xl font-semibold mb-2">
              {Object.keys(tea.type)[tea.type as any]} Tea
            </h3>
            <p className="text-gray-700">Sugars: {tea.numberOfSugars}</p>
            <p className="text-gray-700">
              Milk: {Object.keys(tea.milkAmount)[tea.milkAmount as any]}
            </p>
            <p className="text-gray-700">
              Spoon: {tea.includeSpoon ? "Yes" : "No"}
            </p>
            {tea.brewNotes && (
              <p className="text-gray-600 text-sm mt-2">{tea.brewNotes}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleEdit(tea)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(tea.id)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {teas.length === 0 && !isCreating && (
        <p className="text-gray-500 text-center py-8">
          No teas yet. Click "Add New Tea" to get started!
        </p>
      )}
    </div>
  );
}
