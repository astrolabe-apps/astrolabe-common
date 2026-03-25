import {
  fontAwesomeIcon,
  IconPlacement,
  RendererRegistration,
} from "@react-typed-forms/schemas";
import { createButtonActionRenderer } from "@react-typed-forms/schemas-html";

export const defaultDashboardActionRenderers: RendererRegistration[] = [
  createButtonActionRenderer("edit", {
    icon: fontAwesomeIcon("edit"),
    iconPlacement: IconPlacement.ReplaceText,
  }),
  createButtonActionRenderer("export", {
    icon: fontAwesomeIcon("file-export"),
    iconPlacement: IconPlacement.ReplaceText,
  }),
  createButtonActionRenderer("delete", {
    icon: fontAwesomeIcon("remove"),
    iconPlacement: IconPlacement.ReplaceText,
  }),
  createButtonActionRenderer("view", {
    icon: fontAwesomeIcon("eye"),
    iconPlacement: IconPlacement.ReplaceText,
  }),
];
