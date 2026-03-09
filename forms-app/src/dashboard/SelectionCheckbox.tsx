import React from "react";
import { Control, useComputed } from "@react-typed-forms/core";
import { setIncluded } from "@astroapps/client";
import { ItemInfo } from "../types";

export function SelectionCheckbox({
  control,
  selected,
  submittedStatus = "Submitted",
}: {
  control: Control<ItemInfo>;
  selected: Control<string[]>;
  submittedStatus?: string;
}) {
  const { id, status } = control.fields;
  const idValue = id.value;
  const submitted = status.value === submittedStatus;
  const isSelected = useComputed(() => selected.value.includes(idValue));

  return submitted ? (
    <input
      type={"checkbox"}
      checked={isSelected.value}
      onChange={(e) => {
        selected.setValue((x) =>
          setIncluded(x, idValue, e.currentTarget.checked),
        );
      }}
    />
  ) : (
    <></>
  );
}
