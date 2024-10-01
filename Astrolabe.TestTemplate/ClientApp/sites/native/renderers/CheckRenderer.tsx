import { Control, Fcheckbox, RenderArrayElements, useComputed } from '@react-typed-forms/core';
import React from 'react';
import {
  createDataRenderer,
  DataRenderType,
  FieldOption,
  rendererClass,
} from '@react-typed-forms/schemas';

export interface CheckRendererOptions {
  className?: string;
  entryClass?: string;
  checkClass?: string;
  labelClass?: string;
}

export function createRadioRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (p) => (
      <CheckButtons
        {...options}
        {...p}
        className={rendererClass(p.className, options.className)}
        isChecked={(control, o) => control.value == o.value}
        setChecked={(c, o) => (c.value = o.value)}
        control={p.control}
        type="radio"
      />
    ),
    {
      renderType: DataRenderType.Radio,
    }
  );
}

export function createCheckListRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (p) => (
      <CheckButtons
        {...options}
        {...p}
        className={rendererClass(p.className, options.className)}
        isChecked={(control, o) => {
          const v = control.value;
          return Array.isArray(v) ? v.includes(o.value) : false;
        }}
        setChecked={(c, o, checked) => {
          c.setValue((x) => setIncluded(x ?? [], o.value, checked));
        }}
        control={p.control}
        type="checkbox"
      />
    ),
    {
      collection: true,
      renderType: DataRenderType.CheckList,
    }
  );
}

export function CheckButtons({
  control,
  options,
  labelClass,
  checkClass,
  readonly,
  entryClass,
  className,
  id,
  type,
  isChecked,
  setChecked,
}: {
  id?: string;
  className?: string;
  options?: FieldOption[] | null;
  control: Control<any>;
  entryClass?: string;
  checkClass?: string;
  labelClass?: string;
  readonly?: boolean;
  type: 'checkbox' | 'radio';
  isChecked: (c: Control<any>, o: FieldOption) => boolean;
  setChecked: (c: Control<any>, o: FieldOption, checked: boolean) => void;
}) {
  const { disabled } = control;
  const name = 'r' + control.uniqueId;
  return (
    <div className={className} id={id}>
      <RenderArrayElements array={options?.filter((x) => x.value != null)}>
        {(o, i) => {
          const checked = useComputed(() => isChecked(control, o)).value;
          return (
            <div key={i} className={entryClass}>
              <input
                id={name + '_' + i}
                className={checkClass}
                type={type}
                name={name}
                readOnly={readonly}
                disabled={disabled}
                checked={checked}
                onChange={(x) => {
                  !readonly && setChecked(control, o, x.target.checked);
                }}
              />
              <label className={labelClass} htmlFor={name + '_' + i}>
                {o.name}
              </label>
            </div>
          );
        }}
      </RenderArrayElements>
    </div>
  );
}

export function setIncluded<A>(array: A[], elem: A, included: boolean): A[] {
  const already = array.includes(elem);
  if (included === already) {
    return array;
  }
  if (included) {
    return [...array, elem];
  }
  return array.filter((e) => e !== elem);
}

export function createCheckboxRenderer(options: CheckRendererOptions = {}) {
  return createDataRenderer(
    (props, renderer) => (p) => ({
      ...p,
      label: undefined,
      children: (
        <div className={rendererClass(props.className, options.entryClass)}>
          <Fcheckbox
            id={props.id}
            control={props.control}
            style={props.style}
            className={options.checkClass}
          />
          {p.label && renderer.renderLabel(p.label, undefined, undefined)}
        </div>
      ),
    }),
    { renderType: DataRenderType.Checkbox }
  );
}
