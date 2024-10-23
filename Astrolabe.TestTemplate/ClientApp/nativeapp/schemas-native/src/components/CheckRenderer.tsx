import {
  Control,
  RenderArrayElements,
  useComputed,
} from "@react-typed-forms/core";
import React from "react";
import {
  createDataRenderer,
  DataRenderType,
  FieldOption,
  rendererClass,
} from "@react-typed-forms/schemas";
import { Text, View } from "react-native";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

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
    },
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
    },
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
  type: "checkbox" | "radio";
  isChecked: (c: Control<any>, o: FieldOption) => boolean;
  setChecked: (c: Control<any>, o: FieldOption, checked: boolean) => void;
}) {
  const { disabled } = control;
  const name = "r" + control.uniqueId;
  return (
    <View className={className} id={id}>
      <RadioGroup
        value={control.value?.toString() as string}
        onValueChange={(v) => (control.value = v)}
        className="gap-3"
      >
        <RenderArrayElements array={options?.filter((x) => x.value != null)}>
          {(o, i) => {
            const checked = useComputed(() => isChecked(control, o)).value;
            return (
              <View key={i} className={entryClass}>
                <RadioGroupItem
                  aria-labelledby={name + "_" + i}
                  value={o.value.toString() as string}
                />

                <Label className={labelClass} nativeID={name + "_" + i}>
                  {o.name}
                </Label>
              </View>
            );
          }}
        </RenderArrayElements>
      </RadioGroup>
    </View>
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
        <View className={rendererClass(props.className, options.entryClass)}>
          <Checkbox
            checked={props.control.value}
            onCheckedChange={(x) => (props.control.value = x)}
          />
          <Text>
            {p.label && renderer.renderLabel(p.label, undefined, undefined)}
          </Text>
        </View>
      ),
    }),
    { renderType: DataRenderType.Checkbox },
  );
}
