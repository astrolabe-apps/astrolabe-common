import fc, { Arbitrary } from "fast-check";
import {
  ActionControlDefinition,
  ControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  DisplayControlDefinition,
  DisplayDataType,
  GroupedControlsDefinition,
  GroupRenderType,
} from "../src";

export function arbitraryAction(): Arbitrary<ActionControlDefinition> {
  return fc.string().map((x) => ({
    type: ControlDefinitionType.Action,
    actionId: x,
  }));
}

export function arbitraryData(): Arbitrary<DataControlDefinition> {
  return fc.string().map((x) => ({
    type: ControlDefinitionType.Data,
    field: ".",
    renderOptions: { type: DataRenderType.Standard },
  }));
}

export function arbitraryDisplay(): Arbitrary<DisplayControlDefinition> {
  return fc
    .constantFrom(DisplayDataType.Html, DisplayDataType.Text)
    .map((x) => ({
      type: ControlDefinitionType.Display,
      displayData: {
        type: x,
      },
    }));
}

export function arbitraryGroup(): Arbitrary<GroupedControlsDefinition> {
  return fc
    .constantFrom(GroupRenderType.Standard, GroupRenderType.Grid)
    .map((x) => ({
      type: ControlDefinitionType.Group,
      groupOptions: { type: x },
    }));
}

export const arbitraryControl: Arbitrary<ControlDefinition> = fc
  .constantFrom(
    ControlDefinitionType.Data,
    ControlDefinitionType.Action,
    ControlDefinitionType.Group,
    ControlDefinitionType.Display,
  )
  .chain((x) => {
    switch (x) {
      case ControlDefinitionType.Display:
        return arbitraryDisplay() as Arbitrary<ControlDefinition>;
      case ControlDefinitionType.Group:
        return arbitraryGroup();
      case ControlDefinitionType.Data:
        return arbitraryData();
      default:
        return arbitraryAction();
    }
  });
