import React, {
  createContext,
  Fragment,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  addMissingControlsForSchema,
  appendMarkup,
  ControlDefinition,
  ControlDefinitionSchemaMap,
  ControlLayoutProps,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  EntityExpression,
  FormRenderer,
  getJsonPath,
  isCompoundField,
  RenderForm,
  SchemaField,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { Control, useControl } from "@react-typed-forms/core";
import { ControlDataContext } from "@react-typed-forms/schemas";
import clsx from "clsx";
import {
  Button,
  DialogTrigger,
  Modal,
  Dialog,
  ModalOverlay,
} from "react-aria-components";
import expressionFormChildren from "../ExpressionForm.json";

export interface ScriptEditContextValue {
  allFields: SchemaField[];
  renderer: FormRenderer;
  schemaNode: SchemaNode;
  controlDefinitionSchema: SchemaNode;
}

export const ScriptEditContext = createContext<
  ScriptEditContextValue | undefined
>(undefined);

const schemaLookup = createSchemaLookup(ControlDefinitionSchemaMap);
const expressionSchemaNode = schemaLookup.getSchema("EntityExpression");

const resolvedChildren = addMissingControlsForSchema(
  expressionSchemaNode,
  expressionFormChildren as ControlDefinition[],
);
const expressionFormTree = createFormTree(resolvedChildren);

function ScriptExpressionDialog({
  fieldName,
  parentControl,
  close,
}: {
  fieldName: string;
  parentControl: Control<any>;
  close: () => void;
}) {
  const ctx = useContext(ScriptEditContext)!;
  const parentValue = parentControl.current.value;
  const currentExpr = parentValue?.["$scripts"]?.[fieldName] as
    | EntityExpression
    | undefined;

  const editControl = useControl<Partial<EntityExpression>>(currentExpr ?? {});

  const dataNode = useMemo(
    () => createSchemaDataNode(expressionSchemaNode, editControl),
    [editControl],
  );

  function save() {
    const value = editControl.current.value;
    const current = parentControl.current.value;
    const currentScripts = { ...(current?.["$scripts"] ?? {}) };
    if (value.type) {
      currentScripts[fieldName] = value as EntityExpression;
    } else {
      delete currentScripts[fieldName];
    }
    const hasKeys = Object.keys(currentScripts).length > 0;
    parentControl.value = {
      ...current,
      $scripts: hasKeys ? currentScripts : undefined,
    };
    close();
  }

  function remove() {
    const current = parentControl.current.value;
    const currentScripts = { ...(current?.["$scripts"] ?? {}) };
    delete currentScripts[fieldName];
    const hasKeys = Object.keys(currentScripts).length > 0;
    parentControl.value = {
      ...current,
      $scripts: hasKeys ? currentScripts : undefined,
    };
    close();
  }

  return (
    <>
      <h3 className="text-lg font-semibold mb-4">
        Edit Script: {fieldName}
      </h3>
      <div className="flex-1 overflow-y-auto mb-4">
        <RenderForm
          data={dataNode}
          form={expressionFormTree.rootNode}
          renderer={ctx.renderer}
        />
      </div>
      <div className="flex gap-2 justify-end flex-shrink-0">
        <button
          type="button"
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={save}
        >
          Save
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          onClick={remove}
        >
          Remove
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          onClick={close}
        >
          Cancel
        </button>
      </div>
    </>
  );
}

function ScriptButton({
  fieldName,
  parentControl,
}: {
  fieldName: string;
  parentControl: Control<any>;
}) {
  const ctx = useContext(ScriptEditContext);
  const [isOpen, setIsOpen] = useState(false);
  if (!ctx) return null;

  const parentValue = parentControl.current.value;
  const currentExpr = parentValue?.["$scripts"]?.[fieldName] as
    | EntityExpression
    | undefined;
  const hasScript = !!currentExpr;

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        className={clsx(
          "bg-transparent border-none cursor-pointer px-0.5 text-sm leading-none inline-flex items-center align-middle",
          hasScript ? "opacity-100 text-blue-600" : "opacity-60",
        )}
        aria-label={
          hasScript
            ? `Script: ${currentExpr.type} (click to edit)`
            : "Add script"
        }
      >
        {"\u{1D453}"}
      </Button>
      <ModalOverlay className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
        <Modal className="bg-white rounded-lg shadow-xl p-6 w-[800px] h-[600px] flex flex-col">
          <Dialog className="outline-none flex flex-col flex-1 overflow-hidden">
            {({ close }) => (
              <ScriptExpressionDialog
                fieldName={fieldName}
                parentControl={parentControl}
                close={close}
              />
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

function resolveFieldPath(path: string, schema: SchemaNode): boolean {
  const segments = path.split(".");
  let fields = schema.getResolvedFields();
  for (const seg of segments) {
    if (/^\d+$/.test(seg)) continue;
    const field = fields.find((f) => f.field === seg);
    if (!field) return false;
    if (isCompoundField(field)) {
      fields = field.children;
    }
  }
  return true;
}

export function createScriptAdjustLayout(controlDefinitionSchema: SchemaNode) {
  return function scriptAdjustLayout(
    context: ControlDataContext,
    layout: ControlLayoutProps,
  ): ControlLayoutProps {
    const dataNode = context.dataNode;
    if (!dataNode) return layout;

    const jsonPath = getJsonPath(dataNode);
    const fieldPath = jsonPath.join(".");
    if (!resolveFieldPath(fieldPath, controlDefinitionSchema)) return layout;

    // The field name is the last segment of the path
    const fieldName = String(jsonPath[jsonPath.length - 1]);
    // The parent control is the control for the parent object that owns this field
    const parentControl = dataNode.parent
      ? dataNode.parent.control
      : dataNode.control;

    const adornment = {
      priority: 0,
      apply: appendMarkup(
        "labelEnd",
        <ScriptButton fieldName={fieldName} parentControl={parentControl} />,
      ),
    };
    return {
      ...layout,
      adornments: [...(layout.adornments ?? []), adornment],
    };
  };
}
