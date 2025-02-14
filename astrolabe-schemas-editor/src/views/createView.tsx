import React from "react";
import { CurrentSchemaView } from "./CurrentSchemaView";
import { getViewAndParams, ViewContext } from "./index";
import { FormStructureView } from "./FormStructureView";
import { ControlPropertiesView } from "./ControlPropertiesView";
import { FormView } from "./FormView";
import { FormListView } from "./FormListView";
import { HelpView } from "./HelpView";
import { TabData } from "rc-dock/es";

export function createView(viewId: string, context: ViewContext): TabData {
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
      default:
        return <div>Unknown view type: {viewType}</div>;
    }
  }
}
