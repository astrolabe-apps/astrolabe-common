import { useControl } from "@react-typed-forms/core";
import { saveAs } from "file-saver";
import {
  DashboardPageApi,
  ExportDefinitionGroupData,
  ExportDefinitionSelectionsData,
  ExportRecordsDefinitionData,
  FormsAppUIComponents,
  SearchOptions,
} from "../types";

const DefaultExportRecordsDefinitionData: ExportRecordsDefinitionData = {
  recordIds: null,
  all: null,
};

export function useExportDialog(
  api: DashboardPageApi,
  useDialog: FormsAppUIComponents["useDialog"],
) {
  const exportDefinitions = useControl<ExportDefinitionGroupData[]>([]);
  const selectedExportDefinitions =
    useControl<ExportDefinitionSelectionsData>();
  const exportRecordsDefinitionEdit = useControl<ExportRecordsDefinitionData>(
    DefaultExportRecordsDefinitionData,
  );
  const exporting = useControl(false);

  const [openDialog, Dialog] = useDialog();

  return {
    exportDefinitions,
    selectedExportDefinitions,
    exporting,
    openDialog,
    Dialog,
    openExportDefinitionSelector,
    exportRecords,
    resetDialog,
  };

  async function openExportDefinitionSelector(
    exportRecordIds?: string[] | null,
    all?: SearchOptions | null,
  ) {
    exportRecordsDefinitionEdit.setInitialValue({
      recordIds: exportRecordIds ?? [],
      all: all ?? null,
    });

    if (
      all == null &&
      (exportRecordIds == null || exportRecordIds?.length == 0)
    )
      return;

    const exportDefinitionData = await api.getExportDefinitions(
      exportRecordsDefinitionEdit.value,
    );

    if (exportDefinitionData.length == 0) {
      return;
    }

    exportDefinitions.setInitialValue(exportDefinitionData);

    selectedExportDefinitions.setInitialValue({
      exportDefinitions: exportDefinitionData.map((x) => ({
        tableDefinitionId: x.tableDefinitionId,
        tableDefinitionName: x.tableDefinitionName,
      })),
    });

    openDialog(true);
  }

  async function exportRecords() {
    try {
      exporting.value = true;
      const exportDefinitionIds =
        selectedExportDefinitions.value?.exportDefinitions?.map(
          (x) => x.exportDefinitionId,
        ) ?? [];

      await Promise.allSettled(
        exportDefinitionIds.map(async (exportDefinitionId) => {
          try {
            const file = await api.exportRecord({
              definitionId: exportDefinitionId!,
              ...exportRecordsDefinitionEdit.value,
            });
            if (file) saveAs(file.data, file.fileName);
          } catch (e) {
            console.error(e);
          }
        }),
      );

      openDialog(false);
      await resetDialog();
    } catch (e) {
      console.error(e);
    } finally {
      exporting.value = false;
    }
  }

  async function resetDialog() {
    exportDefinitions.setInitialValue([]);
    selectedExportDefinitions.setInitialValue(undefined);
    exportRecordsDefinitionEdit.setInitialValue(
      DefaultExportRecordsDefinitionData,
    );
  }
}
