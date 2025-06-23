import {
  ControlDefinition,
  emptyGroupDefinition,
  GroupedControlsDefinition,
  mergeFields,
  mergeOption,
  resolveSchemas,
  SchemaField,
  SchemaMap,
  SchemaNode,
} from "@astroapps/forms-core";
import { useMemo } from "react";
import { addMissingControls } from "./util";
import { ActionRendererProps } from "./types";

export function createAction(
  actionId: string,
  onClick: () => void,
  actionText?: string | null,
  options?: Partial<ActionRendererProps>,
): ActionRendererProps {
  return {
    actionId,
    onClick,
    actionText: actionText ?? actionId,
    ...options,
  };
}

export function useControlDefinitionForSchema(
  sf: SchemaField[],
  definition: GroupedControlsDefinition = emptyGroupDefinition,
): GroupedControlsDefinition {
  return useMemo<GroupedControlsDefinition>(
    () => ({
      ...definition,
      children: addMissingControls(sf, definition.children ?? []),
    }),
    [sf, definition],
  );
}

export interface EditorGroup {
  parent: string;
  group: ControlDefinition;
}

export interface CustomRenderOptions {
  value: string;
  name: string;
  fields?: SchemaField[];
  groups?: EditorGroup[];
  applies?: (sf: SchemaNode) => boolean;
  optionField?: string;
}

export type ControlDefinitionExtension = {
  RenderOptions?: CustomRenderOptions | CustomRenderOptions[];
  GroupRenderOptions?: CustomRenderOptions | CustomRenderOptions[];
  ControlAdornment?: CustomRenderOptions | CustomRenderOptions[];
  SchemaValidator?: CustomRenderOptions | CustomRenderOptions[];
  DisplayData?: CustomRenderOptions | CustomRenderOptions[];
  IconReference?: CustomRenderOptions | CustomRenderOptions[];
};

export function applyExtensionToSchema<A extends SchemaMap>(
  schemaMap: A,
  extension: ControlDefinitionExtension,
): A {
  const outMap = { ...schemaMap };
  Object.entries(extension).forEach(([field, cro]) => {
    outMap[field as keyof A] = (Array.isArray(cro) ? cro : [cro]).reduce(
      (a, cr) =>
        cr.optionField
          ? mergeOption(a, cr.name, cr.value, cr.optionField)
          : mergeFields(a, cr.name, cr.value, cr.fields ?? []),
      outMap[field],
    ) as A[string];
  });
  return outMap;
}

export function applyExtensionsToSchema<A extends SchemaMap>(
  schemaMap: A,
  extensions: ControlDefinitionExtension[],
) {
  return resolveSchemas(extensions.reduce(applyExtensionToSchema, schemaMap));
}

export function createIconLibraryExtension(
  name: string,
  value: string,
): ControlDefinitionExtension {
  return {
    IconReference: {
      optionField: "library",
      name,
      value,
    },
  };
}
