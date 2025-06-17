import { ControlAndSchema } from "./gen";
import { testNodeState } from "./nodeTester";
import { CompoundField } from "../lib";

const [c] = [
  {
    control: {
      type: "Data",
      field: " ",
      renderOptions: { type: "Standard" },
      children: [],
    },
    schema: {
      field: "",
      displayName: "ROOT",
      type: "Compound",
      collection: false,
      children: [
        {
          field: " ",
          type: "Compound",
          collection: true,
          notNullable: true,
          children: [
            {
              field: " ",
              type: "String",
              collection: false,
              notNullable: false,
              children: null,
            },
          ],
        },
      ],
    },
    data: { " ": [] },
  },
];

const firstChild = testNodeState(c.control, c.schema as CompoundField, {
  data: c.data,
});
debugger;
