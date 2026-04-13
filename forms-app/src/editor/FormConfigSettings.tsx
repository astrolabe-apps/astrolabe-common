import React from "react";
import { Control, Fselect } from "@react-typed-forms/core";
import { FormConfigData, FormLayoutMode, PageNavigationStyle } from "../types";
import { FormsEditorComponents } from "./types";

export interface FormConfigSettingsProps {
  configControl: Control<FormConfigData>;
  editorComponents: FormsEditorComponents;
}

export function FormConfigSettings({
  configControl,
  editorComponents: { Switch },
}: FormConfigSettingsProps) {
  const { layoutMode, navigationStyle } = configControl.fields;
  const isMultiPage = layoutMode.value === FormLayoutMode.MultiPage;
  const isPublic = configControl.fields.public;
  const published = configControl.fields.published;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-sm">Form Settings</h3>
      {isPublic && (
        <label className="flex items-center justify-between text-sm">
          Public
          <Switch control={isPublic.as<boolean>()} />
        </label>
      )}
      {published && (
        <label className="flex items-center justify-between text-sm">
          Published
          <Switch control={published.as<boolean>()} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Layout Mode
        <Fselect
          control={layoutMode}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value={FormLayoutMode.SinglePage}>Single Page</option>
          <option value={FormLayoutMode.MultiPage}>Multi Page</option>
        </Fselect>
      </label>
      {isMultiPage && (
        <label className="flex flex-col gap-1 text-sm">
          Navigation Style
          <Fselect
            control={navigationStyle}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={PageNavigationStyle.Wizard}>Wizard</option>
            <option value={PageNavigationStyle.Stepper}>Stepper</option>
            <option value={PageNavigationStyle.Tabs}>Tabs</option>
          </Fselect>
        </label>
      )}
    </div>
  );
}
