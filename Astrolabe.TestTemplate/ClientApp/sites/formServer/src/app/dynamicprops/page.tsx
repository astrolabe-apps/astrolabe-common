"use client";

import {
  buildSchema,
  boolField,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  GridRendererOptions,
  GroupRenderType,
  intField,
  stringField,
  stringOptionsField,
} from "@astroapps/forms-core";
import { useControl } from "@react-typed-forms/core";
import {
  createFormRenderer,
  dataControl,
  groupedControl,
  textDisplayControl,
  htmlDisplayControl,
  actionControl,
  RenderForm,
  dataExpr,
  dataMatchExpr,
  jsonataExpr,
  notExpr,
  withScripts,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";

// ---------------------------------------------------------------------------
// Schema: each section gets its own fields so they don't interfere
// ---------------------------------------------------------------------------
interface DemoForm {
  // 1. Visibility
  visToggle: boolean;
  visName: string;
  // 2. Label
  labelText: string;
  labelTarget: string;
  // 3. Disabled
  disToggle: boolean;
  disEmail: string;
  // 4. Readonly
  roToggle: boolean;
  roPhone: string;
  // 5. Default Value
  defSource: string;
  defTarget: string;
  // 6. Style
  styleColor: string;
  styledField: string;
  // 7. Layout Style
  layoutColor: string;
  layoutField: string;
  // 8. Allowed Options
  limitOptions: boolean;
  colorPick: string;
  // 9. Display Text
  dispTextSrc: string;
  // 10. Display HTML
  dispHtmlSrc: string;
  // 11. Grid Columns
  gridCols: number;
  gridA: string;
  gridB: string;
  gridC: string;
  gridD: string;
  // 12. Action Data
  actionPayload: string;
  // 13. Jsonata
  jsonataName: string;
  // 14. Multiple Scripts
  multiShow: boolean;
  multiLabel: string;
  multiBg: string;
  multiField: string;
  // 15. DataMatch
  matchColor: string;
}

const DemoSchema = buildSchema<DemoForm>({
  // 1
  visToggle: boolField("Show Name"),
  visName: stringField("Name"),
  // 2
  labelText: stringField("Label Source"),
  labelTarget: stringField("Target"),
  // 3
  disToggle: boolField("Disable Toggle"),
  disEmail: stringField("Email"),
  // 4
  roToggle: boolField("Readonly Toggle"),
  roPhone: stringField("Phone"),
  // 5
  defSource: stringField("Default Source"),
  defTarget: stringField("Target"),
  // 6
  styleColor: stringOptionsField(
    "Background",
    { name: "None", value: "" },
    { name: "Blue", value: "lightblue" },
    { name: "Yellow", value: "lightyellow" },
    { name: "Pink", value: "mistyrose" },
  ),
  styledField: stringField("Styled Field"),
  // 7
  layoutColor: stringOptionsField(
    "Layout Background",
    { name: "None", value: "" },
    { name: "Blue", value: "lightblue" },
    { name: "Yellow", value: "lightyellow" },
    { name: "Pink", value: "mistyrose" },
  ),
  layoutField: stringField("Inside Layout"),
  // 8
  limitOptions: boolField("Limit Options"),
  colorPick: stringOptionsField(
    "Color",
    { name: "Red", value: "red" },
    { name: "Blue", value: "blue" },
    { name: "Green", value: "green" },
    { name: "Yellow", value: "yellow" },
  ),
  // 9
  dispTextSrc: stringField("Display Text Source"),
  // 10
  dispHtmlSrc: stringField("HTML Source"),
  // 11
  gridCols: intField("Grid Columns"),
  gridA: stringField("Item A"),
  gridB: stringField("Item B"),
  gridC: stringField("Item C"),
  gridD: stringField("Item D"),
  // 12
  actionPayload: stringField("Action Payload"),
  // 13
  jsonataName: stringField("Your Name"),
  // 14
  multiShow: boolField("Show"),
  multiLabel: stringField("Label"),
  multiBg: stringOptionsField(
    "Background",
    { name: "None", value: "" },
    { name: "Blue", value: "lightblue" },
    { name: "Yellow", value: "lightyellow" },
    { name: "Pink", value: "mistyrose" },
  ),
  multiField: stringField("Multi-scripted"),
  // 15
  matchColor: stringOptionsField(
    "Color",
    { name: "Red", value: "red" },
    { name: "Blue", value: "blue" },
    { name: "Green", value: "green" },
  ),
});

const schemaLookup = createSchemaLookup({ DemoSchema });
const schemaTree = schemaLookup.getSchemaTree("DemoSchema");

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

// ---------------------------------------------------------------------------
// Section 1 — Visibility (scripts.hidden)
// ---------------------------------------------------------------------------
const visibilitySection = groupedControl(
  [
    dataControl("visToggle", "Show the name field"),
    withScripts(dataControl("visName", "Your Name"), {
      hidden: notExpr(dataExpr("visToggle")),
    }),
  ],
  "1. Dynamic Visibility",
);

// ---------------------------------------------------------------------------
// Section 2 — Label / Title (scripts.title)
// ---------------------------------------------------------------------------
const labelSection = groupedControl(
  [
    dataControl("labelText", "Type a label"),
    withScripts(dataControl("labelTarget", "Labelled Field"), {
      title: dataExpr("labelText"),
    }),
  ],
  "2. Dynamic Label",
);

// ---------------------------------------------------------------------------
// Section 3 — Disabled (scripts.disabled)
// ---------------------------------------------------------------------------
const disabledSection = groupedControl(
  [
    dataControl("disToggle", "Disable email field"),
    withScripts(dataControl("disEmail", "Email"), {
      disabled: dataExpr("disToggle"),
    }),
  ],
  "3. Dynamic Disabled",
);

// ---------------------------------------------------------------------------
// Section 4 — Readonly (scripts.readonly)
// ---------------------------------------------------------------------------
const readonlySection = groupedControl(
  [
    dataControl("roToggle", "Make phone read-only"),
    withScripts(dataControl("roPhone", "Phone"), {
      readonly: dataExpr("roToggle"),
    }),
  ],
  "4. Dynamic Readonly",
);

// ---------------------------------------------------------------------------
// Section 5 — Default Value (scripts.defaultValue)
// ---------------------------------------------------------------------------
const defaultValueSection = groupedControl(
  [
    dataControl("defSource", "Type a default greeting"),
    withScripts(
      dataControl("defTarget", "Greeting (clear to see default apply)"),
      { defaultValue: dataExpr("defSource") },
    ),
  ],
  "5. Dynamic Default Value",
);

// ---------------------------------------------------------------------------
// Section 6 — Style (scripts.style)
// ---------------------------------------------------------------------------
const styleSection = groupedControl(
  [
    dataControl("styleColor", "Pick a background color"),
    withScripts(dataControl("styledField", "Styled Field"), {
      style: jsonataExpr(
        `styleColor != "" ? {"backgroundColor": styleColor} : undefined`,
      ),
    }),
  ],
  "6. Dynamic Style",
);

// ---------------------------------------------------------------------------
// Section 7 — Layout Style (scripts.layoutStyle)
// ---------------------------------------------------------------------------
const layoutStyleSection = groupedControl(
  [
    dataControl("layoutColor", "Pick a layout background"),
    withScripts(
      groupedControl(
        [dataControl("layoutField", "Inside styled layout")],
        "Styled Group",
      ),
      {
        layoutStyle: jsonataExpr(
          `layoutColor != "" ? {"backgroundColor": layoutColor, "padding": "8px", "borderRadius": "4px"} : undefined`,
        ),
      },
    ),
  ],
  "7. Dynamic Layout Style",
);

// ---------------------------------------------------------------------------
// Section 8 — Allowed Options (scripts.allowedOptions)
// ---------------------------------------------------------------------------
const allowedOptionsSection = groupedControl(
  [
    dataControl("limitOptions", "Limit to Red & Blue only"),
    withScripts(dataControl("colorPick", "Pick a Color"), {
      allowedOptions: jsonataExpr(
        `$boolean(limitOptions) ? ["red", "blue"] : ["red", "blue", "green", "yellow"]`,
      ),
    }),
  ],
  "8. Dynamic Allowed Options",
);

// ---------------------------------------------------------------------------
// Section 9 — Display Text (scripts["displayData.text"])
// ---------------------------------------------------------------------------
const displayTextSection = groupedControl(
  [
    dataControl("dispTextSrc", "Type display text"),
    withScripts(textDisplayControl("(initial text)"), {
      "displayData.text": dataExpr("dispTextSrc"),
    }),
  ],
  "9. Dynamic Display Text",
);

// ---------------------------------------------------------------------------
// Section 10 — Display HTML (scripts["displayData.html"])
// ---------------------------------------------------------------------------
const displayHtmlSection = groupedControl(
  [
    dataControl("dispHtmlSrc", "Type HTML content"),
    withScripts(htmlDisplayControl("<i>initial html</i>"), {
      "displayData.html": dataExpr("dispHtmlSrc"),
    }),
  ],
  "10. Dynamic Display HTML",
);

// ---------------------------------------------------------------------------
// Section 11 — Grid Columns (scripts["groupOptions.columns"])
// ---------------------------------------------------------------------------
const gridColumnsSection = groupedControl(
  [
    dataControl("gridCols", "Number of grid columns (1-4)"),
    withScripts(
      groupedControl(
        [
          dataControl("gridA", "Item A"),
          dataControl("gridB", "Item B"),
          dataControl("gridC", "Item C"),
          dataControl("gridD", "Item D"),
        ],
        "Grid Items",
        {
          groupOptions: {
            type: GroupRenderType.Grid,
            columns: 2,
          } as GridRendererOptions,
        },
      ),
      { "groupOptions.columns": dataExpr("gridCols") },
    ),
  ],
  "11. Dynamic Grid Columns",
);

// ---------------------------------------------------------------------------
// Section 12 — Action Data (scripts.actionData)
// ---------------------------------------------------------------------------
const actionDataSection = groupedControl(
  [
    dataControl("actionPayload", "Action payload text"),
    withScripts(actionControl("Click Me", "demo-action", {}), {
      actionData: dataExpr("actionPayload"),
    }),
  ],
  "12. Dynamic Action Data",
);

// ---------------------------------------------------------------------------
// Section 13 — Jsonata Expression
// ---------------------------------------------------------------------------
const jsonataSection = groupedControl(
  [
    dataControl("jsonataName", "Your Name"),
    withScripts(textDisplayControl("..."), {
      "displayData.text": jsonataExpr(
        '"Hello, " & (jsonataName ? jsonataName : "stranger") & "!"',
      ),
    }),
  ],
  "13. Jsonata Expression",
);

// ---------------------------------------------------------------------------
// Section 14 — Multiple Scripts on One Control
// ---------------------------------------------------------------------------
const multiScriptSection = groupedControl(
  [
    dataControl("multiShow", "Show field"),
    dataControl("multiLabel", "Custom label"),
    dataControl("multiBg", "Background color"),
    withScripts(dataControl("multiField", "Multi-scripted"), {
      hidden: notExpr(dataExpr("multiShow")),
      title: dataExpr("multiLabel"),
      style: jsonataExpr(
        `multiBg != "" ? {"backgroundColor": multiBg} : undefined`,
      ),
    }),
  ],
  "14. Multiple Scripts on One Control",
);

// ---------------------------------------------------------------------------
// Section 15 — Conditional via DataMatch
// ---------------------------------------------------------------------------
const dataMatchSection = groupedControl(
  [
    dataControl("matchColor", "Select a color"),
    withScripts(textDisplayControl("You picked red!"), {
      hidden: notExpr(dataMatchExpr("matchColor", "red")),
    }),
    withScripts(textDisplayControl("You picked blue!"), {
      hidden: notExpr(dataMatchExpr("matchColor", "blue")),
    }),
    withScripts(textDisplayControl("You picked green!"), {
      hidden: notExpr(dataMatchExpr("matchColor", "green")),
    }),
  ],
  "15. DataMatch Conditional Display",
);

// ---------------------------------------------------------------------------
// Assemble form tree
// ---------------------------------------------------------------------------
const formTree = createFormTree([
  visibilitySection,
  labelSection,
  disabledSection,
  readonlySection,
  defaultValueSection,
  styleSection,
  layoutStyleSection,
  allowedOptionsSection,
  displayTextSection,
  displayHtmlSection,
  gridColumnsSection,
  actionDataSection,
  jsonataSection,
  multiScriptSection,
  dataMatchSection,
]);

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function DynamicPropsPage() {
  const data = useControl<DemoForm>({
    // 1
    visToggle: true,
    visName: "",
    // 2
    labelText: "Dynamic Label",
    labelTarget: "",
    // 3
    disToggle: false,
    disEmail: "user@example.com",
    // 4
    roToggle: false,
    roPhone: "555-1234",
    // 5
    defSource: "Hi there!",
    defTarget: "",
    // 6
    styleColor: "",
    styledField: "Type here",
    // 7
    layoutColor: "",
    layoutField: "Inside layout",
    // 8
    limitOptions: false,
    colorPick: "red",
    // 9
    dispTextSrc: "Hello from display",
    // 10
    dispHtmlSrc: "<b>Bold</b> and <i>italic</i>",
    // 11
    gridCols: 2,
    gridA: "A",
    gridB: "B",
    gridC: "C",
    gridD: "D",
    // 12
    actionPayload: "payload-data",
    // 13
    jsonataName: "World",
    // 14
    multiShow: true,
    multiLabel: "Custom Title",
    multiBg: "",
    multiField: "multi",
    // 15
    matchColor: "red",
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-2">
      <h1 className="text-2xl font-bold mb-4">
        Dynamic Properties Showcase
      </h1>
      <p className="text-gray-600 mb-6">
        Each section demonstrates a different dynamic property type using the
        modern <code>scripts</code> system. Change the control values to see
        the dynamic behaviour in real time.
      </p>
      <RenderForm
        data={createSchemaDataNode(schemaTree.rootNode, data)}
        form={formTree.rootNode}
        renderer={formRenderer}
        options={{
          clearHidden: true,
          actionOnClick: (actionId, actionData) => {
            if (actionId === "demo-action") {
              return () =>
                alert(
                  `Action fired!\n\nactionId: ${actionId}\nactionData: ${JSON.stringify(actionData)}`,
                );
            }
            return undefined;
          },
        }}
      />
      <details className="mt-8">
        <summary className="cursor-pointer font-medium">
          Raw form data (JSON)
        </summary>
        <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
          {JSON.stringify(data.value, null, 2)}
        </pre>
      </details>
    </div>
  );
}
