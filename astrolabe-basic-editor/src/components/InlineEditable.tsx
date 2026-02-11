import React, { useEffect, useRef, useState } from "react";

export interface InlineEditableProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  editClassName?: string;
  placeholder?: string;
}

export function InlineEditable({
  value,
  onChange,
  className,
  editClassName,
  placeholder,
}: InlineEditableProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={editClassName ?? className}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (editValue !== value) {
            onChange(editValue);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (editValue !== value) {
              onChange(editValue);
            }
          } else if (e.key === "Escape") {
            setEditing(false);
            setEditValue(value);
          }
        }}
      />
    );
  }

  return (
    <span
      className={className}
      onDoubleClick={() => {
        setEditValue(value);
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
    >
      {value || placeholder || "Untitled"}
    </span>
  );
}
