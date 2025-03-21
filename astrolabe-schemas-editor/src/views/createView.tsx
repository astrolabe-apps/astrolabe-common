import React, { ReactElement } from "react";
import { CurrentSchemaView } from "./CurrentSchemaView";
import { getViewAndParams, ViewContext } from "./index";
import { FormStructureView } from "./FormStructureView";
import { ControlPropertiesView } from "./ControlPropertiesView";
import { FormView } from "./FormView";
import { FormListView } from "./FormListView";
import { HelpView } from "./HelpView";
import { SchemaPropertiesView } from "./SchemaPropertiesView";

export function getTabTitle(viewType: string, viewParams?: string): string {
  switch (viewType) {
    case "help":
      return "Help";
    case "formList":
      return "Forms";
    case "currentSchema":
      return "Current Schema";
    case "form":
      return "Loading " + viewParams;
    case "formStructure":
      return "Control Structure";
    case "controlProperties":
      return "Control Properties";
    default:
      return "Unknown";
  }
}

export function createView(
  viewId: string,
  context: ViewContext,
): { title: string; content: ReactElement; closable: boolean } {
  const [viewType, viewParams] = getViewAndParams(viewId);
  return { title: title(), content: element(), closable: closable() };

  function closable() {
    switch (viewType) {
      case "form":
        return true;
      default:
        return false;
    }
  }

  function title() {
    switch (viewType) {
      case "help":
        return "Help";
      case "formList":
        return "Forms";
      case "currentSchema":
        return "Current Schema";
      case "form":
        return "Loading " + viewParams;
      case "formStructure":
        return "Control Structure";
      case "controlProperties":
        return "Control Properties";
      default:
        return "Unknown";
    }
  }

  function element() {
    switch (viewType) {
      case "help":
        return <HelpView />;
      case "formList":
        return <FormListView context={context} />;
      case "formStructure":
        return <FormStructureView context={context} />;
      case "currentSchema":
        return <CurrentSchemaView context={context} />;
      case "form":
        return <FormView formId={viewParams!} context={context} />;
      case "controlProperties":
        return <ControlPropertiesView context={context} />;
      case "schemaProperties":
        return <SchemaPropertiesView context={context} />;
      default:
        return <div>Unknown view type: {viewType}</div>;
    }
  }
}
