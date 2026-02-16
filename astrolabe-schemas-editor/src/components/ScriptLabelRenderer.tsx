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
  definitionControl: Control<ControlDefinition>;
  allFields: SchemaField[];
  renderer: FormRenderer;
  schemaNode: SchemaNode;
}

export const ScriptEditContext = createContext<
  ScriptEditContextValue | undefined
>(undefined);

const schemaLookup = createSchemaLookup(ControlDefinitionSchemaMap);
const expressionSchemaNode = schemaLookup.getSchema("EntityExpression");
const controlDefinitionSchemaNode = schemaLookup.getSchema("ControlDefinition");

const resolvedChildren = addMissingControlsForSchema(
  expressionSchemaNode,
  expressionFormChildren as ControlDefinition[],
);
const expressionFormTree = createFormTree(resolvedChildren);

function ScriptExpressionDialog({
  fieldPath,
  close,
}: {
  fieldPath: string;
  close: () => void;
}) {
  const ctx = useContext(ScriptEditContext)!;
  const currentExpr = ctx.definitionControl.current.value.scripts?.[
    fieldPath
  ] as EntityExpression | undefined;

  const editControl = useControl<Partial<EntityExpression>>(currentExpr ?? {});

  const dataNode = useMemo(
    () => createSchemaDataNode(expressionSchemaNode, editControl),
    [editControl],
  );

  const scriptsControl = ctx.definitionControl.fields.scripts;

  function setScripts(scripts: Record<string, EntityExpression>) {
    const hasKeys = Object.keys(scripts).length > 0;
    scriptsControl.value = hasKeys ? scripts : null;
  }

  function save() {
    const value = editControl.current.value;
    const newScripts = { ...ctx.definitionControl.current.value.scripts };
    if (value.type) {
      newScripts[fieldPath] = value as EntityExpression;
    } else {
      delete newScripts[fieldPath];
    }
    setScripts(newScripts);
    close();
  }

  function remove() {
    const newScripts = { ...ctx.definitionControl.current.value.scripts };
    delete newScripts[fieldPath];
    setScripts(newScripts);
    close();
  }

  return (
    <>
      <h3 className="text-lg font-semibold mb-4">Edit Script: {fieldPath}</h3>
      <div className="mb-4">
        <RenderForm
          data={dataNode}
          form={expressionFormTree.rootNode}
          renderer={ctx.renderer}
        />
      </div>
      <div className="flex gap-2 justify-end">
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

function ScriptButton({ fieldPath }: { fieldPath: string }) {
  const ctx = useContext(ScriptEditContext);
  const [isOpen, setIsOpen] = useState(false);
  if (!ctx) return null;

  const currentExpr = ctx.definitionControl.current.value.scripts?.[
    fieldPath
  ] as EntityExpression | undefined;
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
        <Modal className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
          <Dialog className="outline-none">
            {({ close }) => (
              <ScriptExpressionDialog fieldPath={fieldPath} close={close} />
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

export function scriptAdjustLayout(
  context: ControlDataContext,
  layout: ControlLayoutProps,
): ControlLayoutProps {
  const dataNode = context.dataNode;
  if (!dataNode) return layout;

  const fieldPath = getJsonPath(dataNode).join(".");
  if (!resolveFieldPath(fieldPath, controlDefinitionSchemaNode)) return layout;

  const adornment = {
    priority: 0,
    apply: appendMarkup("labelEnd", <ScriptButton fieldPath={fieldPath} />),
  };
  return {
    ...layout,
    adornments: [...(layout.adornments ?? []), adornment],
  };
}
