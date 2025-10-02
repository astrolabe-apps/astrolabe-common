import {
  Control,
  useComputed,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { useEffect } from "react";
import {
  ElementSelectedRenderOptions,
  RenderOptions,
} from "@astroapps/forms-core";
import { RunExpression } from "../types";
import { setIncluded } from "../util";

export function useElementSelectedRenderer({
  runExpression,
  renderOptions,
  control,
}: {
  runExpression: RunExpression;
  renderOptions: RenderOptions;
  control: Control<any>;
}) {
  const elementValue = useControl();
  useEffect(() => {
    runExpression(
      elementValue,
      (renderOptions as ElementSelectedRenderOptions).elementExpression,
      (v) => (elementValue.value = v as any),
    );
  }, []);
  const isSelected = useComputed(
    () =>
      control.as<any[] | undefined>().value?.includes(elementValue.value) ??
      false,
  );
  const selControl = useControl(() => isSelected.current.value);
  selControl.value = isSelected.value;
  useControlEffect(
    () => selControl.value,
    (v) => {
      control
        .as<any[] | undefined>()
        .setValue((x) => setIncluded(x ?? [], elementValue.value, v));
    },
  );
  return selControl;
}
