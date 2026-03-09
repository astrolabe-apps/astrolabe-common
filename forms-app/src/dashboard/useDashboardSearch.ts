import { useControl, useComputed, useValueChangeEffect } from "@react-typed-forms/core";
import { FieldOption } from "@react-typed-forms/schemas";
import { useEffect } from "react";
import { defaultSearchOptions } from "@astroapps/searchstate";
import { useToast } from "@astroapps/client";
import { FormsAppApi, SearchOptions } from "../types";

const fieldPrefix = "/results/entries/";

export interface UseDashboardSearchOptions {
  api: FormsAppApi;
  initialRequest?: Partial<SearchOptions>;
}

export function useDashboardSearch({
  api,
  initialRequest,
}: UseDashboardSearchOptions) {
  const toastService = useToast();

  const dashboardForm = useControl<{
    request: SearchOptions;
    results: { total: number | null; entries: any[] } | null;
  }>({
    request: { ...defaultSearchOptions, length: 25, ...initialRequest },
    results: null,
  });

  const { request, results } = dashboardForm.current.fields;

  const searchOptions = useControl<Record<string, FieldOption[]>>({});
  const fieldOptions = useComputed(() => {
    return Object.fromEntries(
      Object.entries(searchOptions.value).map((x) => {
        return [`${fieldPrefix}${x[0]}`, searchOptions.fields[x[0]]];
      }),
    );
  });

  useValueChangeEffect(request, loadDashboard, 100, true);

  useEffect(() => {
    getAllFilterOptions();
  }, []);

  return {
    dashboardForm,
    request,
    results,
    fieldOptions,
    loadDashboard,
  };

  async function getAllFilterOptions() {
    const options = await api.getFilterOptions();
    searchOptions.setInitialValue(options);
  }

  async function loadDashboard(requestForm: SearchOptions) {
    try {
      const searchResults = await api.searchItems(true, requestForm);
      results.setValue((x) => ({
        ...searchResults,
        total: searchResults.total ?? x?.total ?? null,
      }));
    } catch (e) {
      toastService.addToast("error", { type: "error" });
    }
  }
}
