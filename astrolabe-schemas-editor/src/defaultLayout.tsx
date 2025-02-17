import { IJsonModel } from "flexlayout-react";

export const defaultLayout: IJsonModel = {
  global: {},

  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 1,
        children: [
          {
            type: "tab",
            name: "Form List",
            id: "formList",
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
                type: "tabset",
                children: [{ id: "currentSchema", name: "Current Schema" }],
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

//           {
//             id: "project",
//             tabs: [{ id: "formList" }],
//             size: 1,
//           },
//           {
//             id: "documents",
//             group: "documents",
//             size: 5,
//             tabs: [],
//           },
//           {
//             mode: "vertical",
//             size: 4,
//             children: [
//               {
//                 mode: "horizontal",
//                 children: [
//                   {
//                     tabs: [{ id: "formStructure" }],
//                   },
//                   { tabs: [{ id: "currentSchema" }] },
//                 ],
//               },
//               {
//                 tabs: [{ id: "controlProperties" }],
//               },
//             ],
//           },
