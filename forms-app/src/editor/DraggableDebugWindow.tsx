import React, { useState, useEffect, useRef, useCallback } from "react";
import { Control } from "@react-typed-forms/core";
import { SchemaField } from "@react-typed-forms/schemas";
import { EditorFormTree } from "@astroapps/basic-editor";

interface DraggableDebugWindowProps {
  formTree: EditorFormTree;
  schemaFields: Control<SchemaField[]>;
  onClose: () => void;
}

export function DraggableDebugWindow({
  formTree,
  schemaFields,
  onClose,
}: DraggableDebugWindowProps) {
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ w: 500, h: 400 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragRef.current) {
      const d = dragRef.current;
      setPos({
        x: d.origX + e.clientX - d.startX,
        y: d.origY + e.clientY - d.startY,
      });
    }
    if (resizeRef.current) {
      const r = resizeRef.current;
      setSize({
        w: Math.max(300, r.origW + e.clientX - r.startX),
        h: Math.max(200, r.origH + e.clientY - r.startY),
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const controls = formTree.getRootDefinitions().value;
  const fields = schemaFields.value;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex: 9999,
      }}
      className="flex flex-col bg-white border border-gray-300 rounded-lg shadow-2xl"
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 text-white rounded-t-lg cursor-move select-none"
        onMouseDown={(e) => {
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: pos.x,
            origY: pos.y,
          };
        }}
      >
        <span className="text-sm font-semibold">Debug: Form Definition</span>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white text-lg leading-none"
        >
          &times;
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3 text-xs font-mono whitespace-pre bg-gray-50">
        <div className="mb-2 text-sm font-semibold text-gray-700">
          Controls
        </div>
        {JSON.stringify(controls, null, 2)}
        <div className="mt-4 mb-2 text-sm font-semibold text-gray-700">
          Schema Fields
        </div>
        {JSON.stringify(fields, null, 2)}
      </div>
      <div
        className="w-4 h-4 absolute bottom-0 right-0 cursor-se-resize"
        onMouseDown={(e) => {
          resizeRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origW: size.w,
            origH: size.h,
          };
        }}
      />
    </div>
  );
}
