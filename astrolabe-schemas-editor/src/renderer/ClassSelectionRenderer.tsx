import { createDataRenderer } from "@react-typed-forms/schemas";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Text,
} from "react-aria-components";
import clsx from "clsx";

export function createClassSelectionRenderer(classes: [string, string][] = []) {
  return createDataRenderer(
    (p) => (
      <ComboBox
        onInputChange={(x) => (p.control.value = x)}
        inputValue={p.control.value}
        allowsCustomValue
      >
        <div className="flex">
          <Input className="w-full form-control" />
          <Button>▼</Button>
        </div>
        <Popover>
          <ListBox className="bg-white border w-64">
            {classes.map((x) => (
              <ListBoxItem textValue={x[1]} key={x[0]}>
                <Text className={clsx("p-4", x[1])} slot="label">
                  {x[0]}
                </Text>
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </ComboBox>
    ),
    {
      match: (x) => x.field.field.endsWith("Class"),
    },
  );
}
