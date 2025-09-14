import { IJsonModel } from "flexlayout-react";

export const defaultLayout: IJsonModel = {
  global: {
    tabEnableClose: false,
  },

  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "row",
        weight: 1,
        children: [
          {
            type: "tabset",
            children: [{ name: "Form List", id: "formList" }],
          },
          {
            type: "tabset",
            children: [
              { name: "Snippets", id: "snippets" },
              { name: "Agent", id: "agent" },
            ],
          },
        ],
      },
      {
        type: "tabset",
        weight: 5,
        id: "documents",
        enableDeleteWhenEmpty: false,

        children: [],
      },
      {
        type: "row",
        weight: 4,
        children: [
          {
            type: "row",
            children: [
              {
                type: "tabset",
                children: [{ id: "formStructure", name: "Form Structure" }],
              },
              {
                type: "row",
                children: [
                  {
                    type: "tabset",
                    children: [
                      { id: "currentSchema", name: "Current Schema" },
                      { id: "currentSchemaJson", name: "Schema JSON" },
                    ],
                  },
                  {
                    type: "tabset",
                    children: [
                      { id: "fieldProperties", name: "Field properties" },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: "tabset",
            children: [{ id: "controlProperties", name: "Control Properties" }],
          },
        ],
      },
    ],
  },
};
