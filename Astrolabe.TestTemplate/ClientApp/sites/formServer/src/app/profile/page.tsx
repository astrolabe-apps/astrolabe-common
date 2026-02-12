"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { newControl, trackedValue } from "@react-typed-forms/core";
import {
  addMissingControlsForSchema,
  applyExtensionsToSchema,
  ControlDefinition,
  ControlDefinitionType,
  createFormRenderer,
  createFormTree,
  createSchemaLookup,
  actionControl,
  dataControl,
  DisplayDataType,
  EditorGroup,
  fontAwesomeIcon,
  FormNode,
  FormTree,
  groupedControl,
  IconPlacement,
  RendererRegistration,
  buildSchema,
  stringField,
  intField,
  boolField,
} from "@react-typed-forms/schemas";
import {
  createButtonActionRenderer,
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import {
  ControlDefinitionSchemaMap,
  FieldSelectionExtension,
  FormControlEditor,
  EditorFormTree,
} from "@astroapps/schemas-editor";
import { ViewContext, SelectedControlNode } from "@astroapps/schemas-editor";
import controlsJson from "../../ControlDefinition.json";
import { ValueForFieldExtension } from "@react-typed-forms/schemas-html";

// Simple test schema to act as the "form schema" for the selected control
const TestSchema = buildSchema<{
  title: string;
  description: string;
  count: number;
  active: boolean;
}>({
  title: stringField("Title"),
  description: stringField("Description"),
  count: intField("Count"),
  active: boolField("Active"),
});

// Control definitions for different control types to profile
const controlTypes: Record<string, ControlDefinition> = {
  Data: dataControl("title", "Title Field"),
  Group: groupedControl(
    [dataControl("title"), dataControl("description")],
    "Test Group",
  ),
  Display: {
    type: ControlDefinitionType.Display,
    title: "Display Text",
    displayData: { type: DisplayDataType.Text, text: "Hello world" },
  } as any,
  Action: actionControl("Test Action", "test"),
};

function formButtonRenderer(
  actionId: string,
  icon: string,
): RendererRegistration {
  return createButtonActionRenderer(actionId, {
    ...defaultTailwindTheme.action,
    iconPlacement: IconPlacement.ReplaceText,
    icon: fontAwesomeIcon(icon),
  });
}

export default function ProfilePage() {
  const [mountKey, setMountKey] = useState(0);
  const [selectedType, setSelectedType] = useState<string>("Data");
  const mountTimerRef = useRef<string | null>(null);

  // Extensions (same as useViewContext)
  const extensions = useMemo(
    () => [FieldSelectionExtension, ValueForFieldExtension],
    [],
  );

  // Schema lookup (same as useViewContext lines 68-74)
  const controlSchemas = useMemo(
    () =>
      createSchemaLookup(
        applyExtensionsToSchema(ControlDefinitionSchemaMap, extensions),
      ),
    [extensions],
  );
  const ControlDefinitionTree = controlSchemas.getSchema("ControlDefinition");

  // Test schema lookup (for the "form" the control belongs to)
  const testSchemaLookup = useMemo(
    () => createSchemaLookup({ TestSchema }),
    [],
  );
  const testSchemaNode = testSchemaLookup.getSchema("TestSchema");

  // Editor renderer (same as useViewContext lines 79-89)
  const editorFormRenderer = useMemo(
    () =>
      createFormRenderer(
        [
          formButtonRenderer("collapse", "minimize"),
          formButtonRenderer("add", "plus"),
          formButtonRenderer("cut", "cut"),
          formButtonRenderer("copy", "copy"),
          formButtonRenderer("paste", "paste"),
        ],
        createDefaultRenderers(defaultTailwindTheme),
      ),
    [],
  );

  const createEditorRenderer = useMemo(
    () => (registrations: RendererRegistration[]) =>
      createFormRenderer(
        registrations,
        createDefaultRenderers(defaultTailwindTheme),
      ),
    [],
  );

  // Editor form tree (same as useViewContext lines 101-124)
  const editorTree: FormTree = useMemo(() => {
    const tree = new EditorFormTree(controlsJson);
    const extraGroups: EditorGroup[] = extensions.flatMap((x) =>
      Object.values(x).flatMap((ro) =>
        Array.isArray(ro)
          ? ro.flatMap((r) => r.groups ?? [])
          : (ro.groups ?? []),
      ),
    );
    extraGroups.forEach((g) => {
      const parent = tree.getNodeByRefId(g.parent);
      if (parent) {
        tree.addNode(parent, g.group);
      } else {
        console.warn("Could not find parent group: ", g.parent);
      }
    });
    const allNodes = addMissingControlsForSchema(
      ControlDefinitionTree,
      tree.getRootDefinitions().value,
      (m) => console.warn(m),
    );
    return createFormTree(allNodes);
  }, [controlsJson, extensions, ControlDefinitionTree]);

  // Mock selected control - recreated on type change or remount
  const { controlNode, viewContext } = useMemo(() => {
    const controlDef = controlTypes[selectedType];
    const controlControl = newControl<ControlDefinition>(controlDef);
    const controlFormTree = new EditorFormTree([controlDef]);
    const formNode = new FormNode(
      "mock",
      trackedValue(controlControl),
      controlFormTree,
    );

    const selectedControl: SelectedControlNode = {
      form: formNode,
      schema: testSchemaNode,
    };

    const vc: ViewContext = {
      editorControls: editorTree,
      schemaEditorControls: editorTree, // reuse for simplicity
      editorFields: ControlDefinitionTree,
      schemaEditorFields: ControlDefinitionTree,
      createEditorRenderer,
      editorFormRenderer,
      button: () => null,
      checkbox: () => null,
      extensions,
      editorPanelClass: "p-4",
      getCurrentForm: () => undefined,
      getSchemaForForm: () => {
        throw new Error("Not implemented in profile page");
      },
    };

    return { controlNode: selectedControl, viewContext: vc };
  }, [
    selectedType,
    mountKey,
    editorTree,
    ControlDefinitionTree,
    testSchemaNode,
    editorFormRenderer,
    createEditorRenderer,
    extensions,
  ]);

  // Log mount timing
  useEffect(() => {
    if (mountTimerRef.current) {
      console.timeEnd(mountTimerRef.current);
      performance.measure(
        mountTimerRef.current,
        mountTimerRef.current + "-start",
      );
      mountTimerRef.current = null;
    }
  });

  function handleRemount() {
    const label = `FormControlEditor mount #${mountKey + 1}`;
    mountTimerRef.current = label;
    performance.mark(label + "-start");
    console.time(label);
    setMountKey((k) => k + 1);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        FormControlEditor Profile Page
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Open Chrome DevTools &gt; Performance tab &gt; Record &gt; Click
        &quot;Remount&quot; to profile the FormControlEditor mount.
      </p>

      <div className="flex gap-4 items-center mb-6">
        <label className="flex items-center gap-2">
          <span className="font-medium">Control Type:</span>
          <select
            className="border rounded px-2 py-1"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {Object.keys(controlTypes).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleRemount}
        >
          Remount (key={mountKey})
        </button>
      </div>

      <div className="border rounded-lg p-4" key={mountKey}>
        <FormControlEditor
          viewContext={viewContext}
          controlNode={controlNode}
          editorControls={editorTree}
          editorFields={ControlDefinitionTree}
          createEditorRenderer={createEditorRenderer}
          extensions={extensions}
        />
      </div>
    </div>
  );
}
