"use client";

import {
  buildSchema,
  boolField,
  compoundField,
  createFormTree,
  createSchemaDataNode,
  doubleField,
  FieldType,
  SchemaField,
  SchemaNode,
  SchemaTree,
  stringField,
  stringOptionsField,
  CompoundField,
} from "@astroapps/forms-core";
import {
  Control,
  useControl,
  trackedValue,
  RenderControl,
} from "@react-typed-forms/core";
import { createFormRenderer, RenderForm } from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { useEffect, useMemo } from "react";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
interface RegistrationData {
  startDate: string;
  isYourFireLargerThan1MeterCubed: boolean;
  area: number | null;
  fireUnitSize: string;
  purpose: string;
  materialsBeingBurnt: string;
  materialsBeingBurntOther: string;
  fuelArrangement: string;
  isYourPropertyLargerThan2000MetersSquared: boolean;
  doYouRequireMultiLights: boolean;
  nameOfBrigadeInAttendance: string;
  acknowledgement: boolean;
  insidePermitPeriod: boolean;
  insideFireBanPeriod: boolean;
}

interface BurnForm {
  registration: RegistrationData;
}

const RegistrationSchema = buildSchema<RegistrationData>({
  startDate: stringField("Intended Burn Date"),
  isYourFireLargerThan1MeterCubed: boolField(
    "Is your fire larger than 1m\u00B3?",
  ),
  area: doubleField("Area Size"),
  fireUnitSize: stringOptionsField(
    "Unit",
    { name: "Cubic Metres", value: "CubicMetres" },
    { name: "Hectares", value: "Hectares" },
  ),
  purpose: stringField("Purpose"),
  materialsBeingBurnt: stringOptionsField(
    "Materials being burnt",
    { name: "Grass", value: "Grass" },
    { name: "Bush/Scrub", value: "BushScrub" },
    { name: "Log Heaps", value: "LogHeaps" },
    { name: "Logging Slash", value: "LoggingSlash" },
    { name: "Garden Waste", value: "GardenWaste" },
    { name: "Crop Residue", value: "CropResidue" },
    { name: "Mixed Fuels", value: "MixedFuels" },
    { name: "Domestic Fire Pot", value: "DomesticFirePot" },
    { name: "Woodfired Cooker", value: "WoodfiredCooker" },
    { name: "Bonfire", value: "Bonfire" },
    { name: "Other", value: "Other" },
  ),
  materialsBeingBurntOther: stringField("Other (please specify)"),
  fuelArrangement: stringOptionsField(
    "Fuel Arrangements",
    { name: "Cut", value: "Cut" },
    { name: "Piles", value: "Piles" },
    { name: "Standing", value: "Standing" },
  ),
  isYourPropertyLargerThan2000MetersSquared: boolField(
    "Is your property larger than 2000m\u00B2?",
  ),
  doYouRequireMultiLights: boolField("Do you require a multi-light permit?"),
  nameOfBrigadeInAttendance: stringField("Name of brigade"),
  acknowledgement: boolField("I acknowledge"),
  insidePermitPeriod: boolField("Inside permit period"),
  insideFireBanPeriod: boolField("Inside fire ban period"),
});

const BurnSchemaFields = buildSchema<BurnForm>({
  registration: compoundField("Registration", RegistrationSchema),
});

// ---------------------------------------------------------------------------
// Delayed Schema Tree - simulates async schema loading like EditorSchemaTree
// ---------------------------------------------------------------------------
class DelayedSchemaTree extends SchemaTree {
  rootNode: SchemaNode;

  constructor(private rootFields: Control<SchemaField[]>) {
    super();
    this.rootNode = new SchemaNode(
      "",
      {
        type: FieldType.Compound,
        field: "",
        children: [],
      } as CompoundField,
      this,
      undefined,
      () => trackedValue(rootFields),
    );
  }

  getSchemaTree(_schemaId: string): SchemaTree | undefined {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const formRenderer = createFormRenderer(
  [],
  createDefaultRenderers(defaultTailwindTheme),
);

// ---------------------------------------------------------------------------
// Form controls (exact JSON from original form definition)
// ---------------------------------------------------------------------------
const formControls: any[] = [
  {
    type: "Data",
    title: "Burn Activity",
    children: [
      {
        type: "Data",
        title: "Intended Burn Date",
        field: "startDate",
        required: true,
        renderOptions: {
          type: "DisplayOnly",
        },
        disabled: true,
      },
      {
        type: "Group",
        title: "Fire Size",
        groupOptions: {
          type: "Standard",
        },
        children: [
          {
            type: "Data",
            title: "Is your fire larger than 1m<sup>3</sup>?",
            field: "isYourFireLargerThan1MeterCubed",
            renderOptions: {
              type: "DisplayOnly",
            },
            disabled: true,
          },
          {
            type: "Data",
            title: "Area Size",
            field: "area",
            renderOptions: {
              type: "Standard",
            },
            required: true,
            dynamic: [
              {
                type: "Visible",
                expr: {
                  type: "FieldValue",
                  field: "isYourFireLargerThan1MeterCubed",
                  value: true,
                },
              },
            ],
            adornments: [
              {
                type: "HelpText",
                helpText:
                  "The estimated total area of your fire. This is measured in cubic metres or hectares",
                helpLabel: "Help",
              },
            ],
            validators: [
              {
                type: "Jsonata",
                expression:
                  "$exists(area) and $exists(isYourFireLargerThan1MeterCubed) and $exists(fireUnitSize) and fireUnitSize='CubicMetres' and isYourFireLargerThan1MeterCubed=true and area<=1 ? 'You cannot enter an area size less than or equal to 1m3' : ''",
              },
              {
                type: "Jsonata",
                expression:
                  "$exists(area) and area<=0 ? 'Please enter an area size greater than 0' : ''",
              },
            ],
          },
          {
            title: "Unit",
            type: "Data",
            styleClass: "",
            field: "fireUnitSize",
            renderOptions: {
              type: "Radio",
            },
            dynamic: [
              {
                type: "Visible",
                expr: {
                  type: "Data",
                  field: "isYourFireLargerThan1MeterCubed",
                },
              },
            ],
            hideTitle: false,
            required: true,
          },
          {
            type: "Display",
            title: "Over 2 hectares",
            dynamic: [
              {
                type: "Visible",
                expr: {
                  type: "Jsonata",
                  expression: "area>=2 and fireUnitSize='Hectares'",
                },
              },
            ],
            displayData: {
              type: "Text",
              text: "As your burn is 2 hectares or greater, it must be managed in accordance with an approved Burning Plan as the primary condition of any fire permit (crop stubble excluded).",
            },
          },
        ],
      },
    ],
    field: "registration",
    renderOptions: {
      type: "Group",
      groupOptions: {
        type: "TopLevelGroup",
      },
    },
  },
  {
    type: "Data",
    title: "Burn Information",
    children: [
      {
        type: "Group",
        title: "Purpose",
        children: [
          {
            type: "Data",
            title: "Purpose",
            field: "purpose",
            hideTitle: true,
            required: true,
            renderOptions: {
              type: "Standard",
            },
          },
        ],
        groupOptions: {
          type: "Standard",
        },
        adornments: [
          {
            type: "HelpText",
            helpText:
              "What is the purpose of your burn, i.e. fuel reduction, land clearing?",
            helpLabel: "Help",
          },
        ],
      },
      {
        type: "Group",
        title: "Materials Being Burnt",
        children: [
          {
            type: "Display",
            title: "Information",
            displayData: {
              type: "Html",
              html: '<p>For more information on what materials can be burnt visit the <a href="https://epa.tas.gov.au/environment/air/backyard-burning" rel="noopener noreferrer" target="_blank">EPA website</a></p>',
            },
          },
          {
            type: "Data",
            title: "Materials being burnt",
            field: "materialsBeingBurnt",
            hideTitle: true,
            renderOptions: {
              type: "Radio",
              entryWrapperClass:
                "flex flex-col border w-full p-4 rounded-lg gap-2 shadow cursor-pointer",
              selectedClass: "border-primary border-2",
              notSelectedClass: "hover:border-primary",
            },
            styleClass: "flex flex-col gap-4",
            required: true,
            dynamic: [
              {
                type: "AllowedOptions",
                expr: {
                  type: "Jsonata",
                  expression:
                    "insidePermitPeriod=false and insideFireBanPeriod=false ?[    'Grass',      isYourFireLargerThan1MeterCubed=true ? 'BushScrub' : null,        isYourFireLargerThan1MeterCubed=true and fireUnitSize='CubicMetres' ? 'LogHeaps' : null,        isYourFireLargerThan1MeterCubed=true and fireUnitSize='CubicMetres' ? 'LoggingSlash' : null,       $exists(fireUnitSize)=false or fireUnitSize!='Hectares' ? 'GardenWaste' : null,        isYourFireLargerThan1MeterCubed=true ?  'CropResidue': null,        isYourFireLargerThan1MeterCubed=true ? null : 'DomesticFirePot',        isYourFireLargerThan1MeterCubed=true ? null : 'WoodfiredCooker',        $exists(fireUnitSize)=false or fireUnitSize!='Hectares' ? 'Bonfire' : null,        'Other'] : insidePermitPeriod?[        'Grass',      isYourFireLargerThan1MeterCubed=true ? 'BushScrub' : null,        isYourFireLargerThan1MeterCubed=true ? 'LogHeaps' : null,        isYourFireLargerThan1MeterCubed=true ? 'LoggingSlash' : null,        'GardenWaste',        isYourFireLargerThan1MeterCubed=true ?  'CropResidue': null,        isYourFireLargerThan1MeterCubed=true ?  'MixedFuels': null,        isYourFireLargerThan1MeterCubed=true ? null : 'DomesticFirePot',        isYourFireLargerThan1MeterCubed=true ? null : 'WoodfiredCooker',        isYourFireLargerThan1MeterCubed=true ? null : 'Bonfire',        'Other'] : null",
                },
              },
            ],
            children: [
              {
                type: "Group",
                title: "Container",
                styleClass:
                  "grid min-[540px]:!grid-cols-[1fr_,_200px] min-[540px]:!grid-rows-1 grid-cols-1 grid-rows-[1fr_,200px]",
                children: [
                  {
                    type: "Display",
                    title: "Description",
                    dynamic: [
                      {
                        type: "Display",
                        expr: {
                          type: "Jsonata",
                          expression:
                            '( \n$o := {"Grass": "An area of uncut, dry grass with well defined boundaries", "BushScrub": "An area of uncut bushland and/or scrub of varying height and density","LogHeaps":"Logs, tree trunks, stumps and branches greater than 250mm in diameter, piled and stacked for burning","LoggingSlash":"Vegetation generally as a result of forest or scrub clearing. May be placed in piles or long narrow rows (windrows)","GardenWaste":"Dead plant material or organic plant matter cut and piled. <br/>Can include pruned leaves and branches, weeds, compost, and whole plants that have been removed from the soil", "CropResidue":"Plant crowns and straw left on soil after harvest. Includes straw and chaff discharged from harvester\u200B", "MixedFuels":"A combination of cut and/or standing fuels burnt together", "DomesticFirePot":"Fire contained in a vessel primarily for warmth", "WoodfiredCooker":"A vessel that burns solid fuel for the purpose of cooking food", "Bonfire":"A large fire of leaves and branches etc. built in the open air to burn, for warmth, entertainment, or celebration", "Other":"Fires not captured in other fire types. Examples include but are not limited to: fires for biosecurity or public health, planned structure fires"\n\n};\n\n$v := $formData.option.value;$lookup($o, $v);\n)',
                        },
                      },
                    ],
                    displayData: {
                      type: "Html",
                      html: "<p>Sample</p>",
                    },
                  },
                  {
                    type: "Display",
                    title: "Image",
                    styleClass:
                      "[&>*]:object-cover min-[540px]:[&>*]:h-full min-[540px]:[&>*]:max-w-full min-[540px]:[&>*]:aspect-[1.5]  [&>*]:object-bottom [&>*]:w-full [&>*]:h-[200px] [&>*]:aspect-[0.6] ",
                    displayData: {
                      type: "Html",
                      html: "<p></p>",
                    },
                    dynamic: [
                      {
                        type: "Display",
                        expr: {
                          type: "Jsonata",
                          expression:
                            '( $v := $formData.option.value; $extension := ".jpg"; $src := $.baseUrl&"/tfs/"&$v&$extension; "<img src=\'"&$src&"\'>" )',
                        },
                      },
                      {
                        type: "Visible",
                        expr: {
                          type: "Jsonata",
                          expression: "$formData.option.value!='Other'",
                        },
                      },
                    ],
                  },
                ],
                groupOptions: {
                  type: "Standard",
                  hideTitle: true,
                },
              },
            ],
          },
          {
            type: "Data",
            title: "Other (please specify)",
            dynamic: [
              {
                type: "Visible",
                expr: {
                  type: "FieldValue",
                  field: "materialsBeingBurnt",
                  value: "Other",
                },
              },
            ],
            field: "materialsBeingBurntOther",
            required: true,
            renderOptions: {
              type: "Standard",
            },
          },
        ],
        groupOptions: {
          type: "Standard",
        },
      },
      {
        type: "Group",
        title: "Fuel Arrangements",
        adornments: [
          {
            type: "HelpText",
            helpText: "How are the materials arranged?",
            helpLabel: "Help",
          },
        ],
        children: [
          {
            type: "Data",
            title: "Fuel Arrangements",
            field: "fuelArrangement",
            required: true,
            renderOptions: {
              type: "Radio",
              entryWrapperClass:
                "flex flex-col border w-full p-4 rounded-lg gap-2 shadow cursor-pointer",
              selectedClass: "border-primary border-2",
              notSelectedClass: "hover:border-primary",
            },
            styleClass: "flex flex-col gap-4",
            hideTitle: true,
            dynamic: [
              {
                type: "AllowedOptions",
                expr: {
                  type: "Jsonata",
                  expression:
                    "insidePermitPeriod=false and insideFireBanPeriod=false\n? isYourFireLargerThan1MeterCubed=true \n    ? fireUnitSize='CubicMetres'? ['Cut','Piles','Standing'] : ['Cut','Standing']\n    : ['Piles']\n: insidePermitPeriod\n    ? isYourFireLargerThan1MeterCubed=true ? ['Cut','Piles','Standing'] : ['Piles']\n: null",
                },
              },
            ],
            children: [
              {
                type: "Group",
                title: "Container",
                styleClass:
                  "grid min-[540px]:!grid-cols-[1fr_,_200px] min-[540px]:!grid-rows-1 grid-cols-1 grid-rows-[1fr_,200px]",
                children: [
                  {
                    type: "Display",
                    title: "Description",
                    displayData: {
                      type: "Html",
                    },
                  },
                  {
                    type: "Display",
                    title: "Image",
                    dynamic: [
                      {
                        type: "Display",
                        expr: {
                          type: "Jsonata",
                          expression:
                            '($v := $formData.option.value; $extension := ".jpg"; $prefix := "FuelArrangement-"; $src := $.baseUrl&"/tfs/"&$prefix&$v&$extension; "<img src=\'"&$src&"\'>" )',
                        },
                      },
                    ],
                    styleClass:
                      "[&>*]:object-cover min-[540px]:[&>*]:h-full min-[540px]:[&>*]:max-w-full min-[540px]:[&>*]:aspect-[1.5]  [&>*]:object-bottom [&>*]:w-full [&>*]:h-[200px] [&>*]:aspect-[0.6]",
                    displayData: {
                      type: "Html",
                    },
                  },
                ],
                groupOptions: {
                  type: "Standard",
                  hideTitle: true,
                },
              },
            ],
          },
        ],
        groupOptions: {
          type: "Standard",
        },
      },
    ],
    field: "registration",
    renderOptions: {
      type: "Group",
      groupOptions: {
        type: "TopLevelGroup",
      },
    },
  },
  {
    type: "Data",
    title: "Property Information",
    children: [
      {
        type: "Group",
        title: "Property Size",
        children: [
          {
            type: "Group",
            title: "Is your property larger than 2000m squared",
            styleClass: "",
            children: [
              {
                type: "Display",
                title: "Header",
                styleClass: "font-bold",
                displayData: {
                  type: "Html",
                  html: "<p>Is your property larger than 2000m<sup>2</sup>?</p>",
                },
              },
              {
                type: "Data",
                title: "Is your property larger than 2000m squared?",
                field: "isYourPropertyLargerThan2000MetersSquared",
                required: true,
                renderOptions: {
                  type: "Radio",
                },
                adornments: [
                  {
                    type: "HelpText",
                    helpText:
                      "It is an offence to undertake backyard burning for any purpose on land with an area of <2,000m2; UNLESS it is done in accordance with any relevant fire permit, environment protection notice (EPN) or council bylaw.",
                    helpLabel: "Help",
                  },
                ],
                hideTitle: true,
              },
            ],
            groupOptions: {
              type: "Standard",
              hideTitle: true,
            },
          },
          {
            type: "Group",
            title: "Multi light",
            children: [
              {
                type: "Data",
                title: "Do you require a multi-light permit?",
                field: "doYouRequireMultiLights",
                required: true,
                renderOptions: {
                  type: "Radio",
                },
                adornments: [
                  {
                    type: "HelpText",
                    helpText:
                      "Will your burn require mulitple ignitions over the duration of your fire permit?",
                    helpLabel: "Help",
                  },
                ],
              },
            ],
            groupOptions: {
              type: "Standard",
              hideTitle: true,
            },
          },
        ],
        groupOptions: {
          type: "Standard",
          hideTitle: true,
        },
      },
      {
        type: "Group",
        title: "Burn Support",
        children: [
          {
            type: "Display",
            title: "Information",
            displayData: {
              type: "Text",
              text: "Please list any supporting organisation / fire brigade that will be in attendance to support your burning activity.",
            },
          },
          {
            type: "Data",
            title: "Name of brigade",
            field: "nameOfBrigadeInAttendance",
            renderOptions: {
              type: "Standard",
            },
            hideTitle: true,
          },
        ],
        groupOptions: {
          type: "Standard",
        },
      },
    ],
    field: "registration",
    renderOptions: {
      type: "Group",
      groupOptions: {
        type: "TopLevelGroup",
      },
    },
  },
  {
    type: "Data",
    title: "Acknowledgement & Submission",
    children: [
      {
        type: "Display",
        title: "Terms",
        displayData: {
          type: "Html",
          html: "<p>I confirm that the information provided is true to the best of my knowledge.&nbsp;&nbsp;</p>",
        },
      },
      {
        type: "Data",
        title: "I acknowledge",
        field: "acknowledgement",
        required: true,
        renderOptions: {
          type: "Checkbox",
        },
        validators: [
          {
            type: "Jsonata",
            expression:
              "acknowledgement= true ? '' : 'Please acknowledge the information you have provided is true'",
          },
        ],
      },
    ],
    field: "registration",
    renderOptions: {
      type: "Group",
      groupOptions: {
        type: "TopLevelGroup",
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Form tree
// ---------------------------------------------------------------------------
const formTree = createFormTree(formControls);

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function BurnRegistrationPage() {
  const fieldsControl = useControl<SchemaField[]>([]);
  const schemaTree = useMemo(() => new DelayedSchemaTree(fieldsControl), []);

  useEffect(() => {
    // Simulate async schema loading - fields arrive after 2 seconds
    const timer = setTimeout(() => {
      console.log("Loading schema fields...");
      fieldsControl.value = BurnSchemaFields;
      console.log("Schema fields loaded:", fieldsControl.value);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const data = useControl<BurnForm>({
    registration: {
      startDate: new Date().toISOString().slice(0, 10),
      isYourFireLargerThan1MeterCubed: false,
      area: null,
      fireUnitSize: "",
      purpose: "",
      materialsBeingBurnt: "",
      materialsBeingBurntOther: "",
      fuelArrangement: "",
      isYourPropertyLargerThan2000MetersSquared: false,
      doYouRequireMultiLights: false,
      nameOfBrigadeInAttendance: "",
      acknowledgement: false,
      insidePermitPeriod: false,
      insideFireBanPeriod: false,
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-2">
      <h1 className="text-2xl font-bold mb-4">Burn Registration</h1>
      <p className="text-gray-600 mb-6">
        This example simulates a race condition where schema fields are loaded
        after a 2-second delay. Initially you should see &quot;Can&apos;t render
        field&quot; errors because the schema isn&apos;t available yet. After 2
        seconds, the schema loads - check if the form updates reactively.
      </p>
      <RenderForm
        data={createSchemaDataNode(schemaTree.rootNode, data)}
        form={formTree.rootNode}
        renderer={formRenderer}
        options={{ clearHidden: true }}
      />
      <RenderControl
        children={() => (
          <details className="mt-8">
            <summary className="cursor-pointer font-medium">
              Raw form data (JSON)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
              {JSON.stringify(data.value, null, 2)}
            </pre>
          </details>
        )}
      />
    </div>
  );
}
