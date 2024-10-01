import { Control } from '@react-typed-forms/core';
import React, { useMemo, useState } from 'react';
import {
  createDataRenderer,
  FieldOption,
  FieldType,
  rendererClass,
} from '@react-typed-forms/schemas';

export interface SelectRendererOptions {
  className?: string;
  emptyText?: string;
  requiredText?: string;
}

export function createSelectRenderer(options: SelectRendererOptions = {}) {
  return createDataRenderer(
    (props, asArray) => (
      <SelectDataRenderer
        className={rendererClass(props.className, options.className)}
        state={props.control}
        id={props.id}
        readonly={props.readonly}
        options={props.options ?? []}
        required={props.required}
        emptyText={options.emptyText}
        requiredText={options.requiredText}
        convert={createSelectConversion(props.field.type)}
      />
    ),
    {
      options: true,
    }
  );
}

type SelectConversion = (a: any) => string | number;

export interface SelectDataRendererProps {
  id?: string;
  className?: string;
  options: FieldOption[];
  emptyText?: string;
  requiredText?: string;
  readonly: boolean;
  required: boolean;
  state: Control<any>;
  convert: SelectConversion;
}

export function SelectDataRenderer({
  state,
  options,
  className,
  convert,
  required,
  emptyText = 'N/A',
  requiredText = '<please select>',
  readonly,
  ...props
}: SelectDataRendererProps) {
  const { value, disabled } = state;
  const [showEmpty] = useState(!required || value == null);
  const optionStringMap = useMemo(
    () => Object.fromEntries(options.map((x) => [convert(x.value), x.value])),
    [options]
  );
  const optionGroups = useMemo(
    () => new Set(options.filter((x) => x.group).map((x) => x.group!)),
    [options]
  );
  return (
    <select
      {...props}
      className={className}
      onChange={(v) => (state.value = optionStringMap[v.target.value])}
      value={convert(value)}
      disabled={disabled || readonly}>
      {showEmpty && <option value="">{required ? requiredText : emptyText}</option>}
      {[...optionGroups.keys()].map((x) => (
        <optgroup key={x} label={x}>
          {options.filter((o) => o.group === x).map(renderOption)}
        </optgroup>
      ))}
      {options.filter((x) => !x.group).map(renderOption)}
    </select>
  );

  function renderOption(x: FieldOption, i: number) {
    return (
      <option key={i} value={convert(x.value)} disabled={!!x.disabled}>
        {x.name}
      </option>
    );
  }
}

export function createSelectConversion(ft: string): SelectConversion {
  switch (ft) {
    case FieldType.String:
    case FieldType.Int:
    case FieldType.Double:
      return (a) => a;
    default:
      return (a) => a?.toString() ?? '';
  }
}
