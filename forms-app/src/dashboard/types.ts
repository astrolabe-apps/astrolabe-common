import { ReactElement } from "react";
import { DisplayRendererProps, RendererRegistration } from "@react-typed-forms/schemas";
import { ActionHandler, SearchOptions } from "../types";

export interface DashboardActionHandlers {
  view?: ActionHandler<string>;
  edit?: ActionHandler<string>;
  delete?: ActionHandler<string>;
  export?: ActionHandler<string>;
  exportAll?: ActionHandler<void>;
  exportSelected?: ActionHandler<void>;
  toggleAll?: ActionHandler<void>;
  [key: string]: ActionHandler<any> | undefined;
}

export interface DashboardPageProps {
  formType?: string;
  onAction?: DashboardActionHandlers;
  customDisplay?: (
    customId: string,
    ctx: DisplayRendererProps,
  ) => ReactElement | undefined;
  customRenderers?: RendererRegistration[];
  initialRequest?: Partial<SearchOptions>;
  showExport?: boolean;
  exportFormType?: string;
}
