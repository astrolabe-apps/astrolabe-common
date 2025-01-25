import React, { ReactElement } from "react";
import { CurrentSchemaView } from "./CurrentSchemaView";
import { ViewContext } from "./index";
import { FormStructureView } from "./FormStructureView";
import { ControlPropertiesView } from "./ControlPropertiesView";
import { FormView } from "./FormView";

export function createView(
  viewId: string,
  context: ViewContext,
): [string, ReactElement] {
  const [viewType, viewParams] = viewId.split(":", 2);

  return [title(), element()];

  function title() {
    switch (viewType) {
      case "currentSchema":
        return "Current Schema";
      case "form":
        return "Form " + viewParams;
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
      case "formStructure":
        return <FormStructureView context={context} />;
      case "currentSchema":
        return <CurrentSchemaView context={context} />;
      case "form":
        return <FormView formId={viewParams} context={context} />;
      case "controlProperties":
        return <ControlPropertiesView context={context} />;
      default:
        return <div>Unknown view type: {viewType}</div>;
    }
  }
}
