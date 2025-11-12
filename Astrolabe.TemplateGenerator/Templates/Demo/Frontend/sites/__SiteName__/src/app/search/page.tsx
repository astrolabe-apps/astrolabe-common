"use client";

import { useControl } from "@react-typed-forms/core";
import { createStdFormRenderer } from "@/renderers";
import { TeaSearchForm } from "client-common/formdefs";
import { TeaSearchFormSchema, TeaSearchForm as TeaSearchFormType } from "client-common/schemas";
import { useApiClient, useQueryControl } from "@astroapps/client";
import { TeasClient } from "client-common/client";
import { useMemo } from "react";
import Link from "next/link";
import { RenderFormData } from "@/RenderFormData";

export default function SearchPage() {
  const client = useApiClient(TeasClient);
  const queryControl = useQueryControl();

  // Initialize search form
  const formData = useControl<TeaSearchFormType>({
    searchTerm: "",
    filterByType: null,
    results: [],
  });

  // Create renderer
  const renderer = useMemo(() => createStdFormRenderer(), []);

  // Filter out the results field from controls for the search form section
  const searchControls = useMemo(
    () => TeaSearchForm.controls.filter((c: any) => c.field !== "results"),
    []
  );

  // Handle search action
  async function handleSearch() {
    try {
      // Call the search endpoint with the form values
      const results = await client.search(
        formData.fields.searchTerm.value || undefined,
        formData.fields.filterByType.value || undefined
      );

      // Map results to the form structure
      formData.fields.results.value = results.map((r) => ({
        id: r.id,
        type: r.type,
        numberOfSugars: r.numberOfSugars,
        milkAmount: r.milkAmount,
      }));
    } catch (e) {
      console.error("Failed to search teas:", e);
      alert("Failed to search teas. Check console for details.");
    }
  }

  // Handle clear action
  function handleClear() {
    formData.value = {
      searchTerm: "",
      filterByType: null,
      results: [],
    };
  }

  if (!queryControl.fields.isReady.value) return <></>;

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Search Teas</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Search Criteria</h2>

        <RenderFormData
          data={formData}
          controls={searchControls}
          schema={TeaSearchFormSchema}
          renderer={renderer}
        />

        <div className="flex gap-4 mt-6 pt-6 border-t">
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
          >
            Search
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
          >
            Clear
          </button>
        </div>
      </div>

      {formData.fields.results.value.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Search Results ({formData.fields.results.value.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left font-semibold">Type</th>
                  <th className="px-4 py-2 text-left font-semibold">Sugars</th>
                  <th className="px-4 py-2 text-left font-semibold">Milk</th>
                  <th className="px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formData.fields.results.value.map((tea, index) => (
                  <tr key={tea.id || index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{tea.type}</td>
                    <td className="px-4 py-2">{tea.numberOfSugars}</td>
                    <td className="px-4 py-2">{tea.milkAmount}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/form-demo?id=${tea.id}`}
                        className="text-blue-500 hover:text-blue-700 font-medium"
                      >
                        View/Edit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formData.fields.results.value.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          No results found. Use the search form above to find teas.
        </div>
      )}

      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Form Data (Debug)</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(formData.value, null, 2)}</pre>
      </div>
    </div>
  );
}
