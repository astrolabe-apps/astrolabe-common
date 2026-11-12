import React from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useControl } from "@react-typed-forms/core";
import {
  createButtonActionRenderer,
  createDefaultRenderers,
  defaultRnTailwindTheme,
} from "@react-typed-forms/schemas-rn";
import {
  actionControl,
  buildSchema,
  createFormRenderer,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  dataControl,
  FieldType,
  groupedControl,
  GroupRenderType,
  makeScalarField,
  RenderForm,
  textfieldOptions,
  WizardRenderOptions,
} from "@react-typed-forms/schemas";
import { FormDataDisplay } from "../../components/FormDataDisplay";

interface Registration {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const registrationSchema = buildSchema<Registration>({
  name: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Full Name",
  }),
  email: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Email",
  }),
  phone: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Phone",
  }),
  notes: makeScalarField({
    type: FieldType.String,
    displayName: "Notes",
  }),
});

// Each child of the Wizard group is a page; Next validates the current page.
const wizardForm = [
  groupedControl(
    [
      groupedControl(
        [
          dataControl("name", null, { required: true }),
          dataControl("email", null, { required: true }),
        ],
        "Your Details",
      ),
      groupedControl(
        [dataControl("phone", null, { required: true })],
        "Contact",
      ),
      groupedControl(
        [
          dataControl("notes", null, textfieldOptions({ multiline: true })),
          actionControl("Finish", "finish"),
        ],
        "Anything Else",
      ),
    ],
    "Registration Wizard",
    {
      groupOptions: {
        type: GroupRenderType.Wizard,
      } as WizardRenderOptions,
    },
  ),
];

const schemaTree = createSchemaTree(registrationSchema);
const formTree = createFormTree(wizardForm);

// Mirrors a hand-rolled wizard (e.g. servicetas RWVP): a step control picks which
// page to render, and a form action validates a field before advancing.
const steppedForm = [
  groupedControl(
    [
      dataControl("name", null, { required: true }),
      // Disabled while name is blank, the way RWVP gates its Next buttons.
      actionControl("Next (Jsonata disabled)", "next", {
        dynamic: [
          {
            type: "Disabled",
            expr: { type: "Jsonata", expression: "$not($boolean(name))" },
          },
        ],
      } as any),
      actionControl("Next (FieldValue disabled)", "nextFieldValue", {
        dynamic: [
          {
            type: "Disabled",
            expr: { type: "FieldValue", field: "name", value: "" },
          },
        ],
      } as any),
    ],
    "Step 1",
  ),
  groupedControl(
    [
      dataControl("phone", null, { required: true }),
      actionControl("Back", "previous"),
    ],
    "Step 2",
  ),
];
const steppedTree = createFormTree(steppedForm);

const renderer = createFormRenderer(
  [createButtonActionRenderer("finish")],
  createDefaultRenderers(defaultRnTailwindTheme),
);

// Same wizard option servicetas-rn uses: before Next, run the form's "wizardValidate" action.
const validatingRenderer = createFormRenderer(
  [createButtonActionRenderer("finish")],
  createDefaultRenderers({
    ...defaultRnTailwindTheme,
    group: {
      ...defaultRnTailwindTheme.group,
      wizard: {
        actions: { validateActionId: "wizardValidate" },
      },
    },
  }),
);

export default function WizardScreen() {
  const control = useControl<Registration>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const validateLog = useControl("wizardValidate not called");

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-4">
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Wizard
          </Text>
          <Text className="text-gray-600 mb-6">
            Next validates the current page: it should not advance while a
            required field is empty, and should show the errors.
          </Text>

          <RenderForm
            data={createSchemaDataNode(schemaTree.rootNode, control)}
            form={formTree.rootNode}
            renderer={validatingRenderer}
            options={{
              actionOnClick: (actionId, actionData) =>
                actionId === "finish"
                  ? () => Alert.alert("Finished", "Wizard complete.")
                  : actionId === "wizardValidate"
                    ? () => {
                        // Leaving "Contact" (page 1) forwards needs phone 123.
                        const { current, dir } = actionData;
                        const ok =
                          !(current === 1 && dir === 1) ||
                          control.fields.phone.value === "123";
                        validateLog.value = `wizardValidate(current=${current}, dir=${dir}) -> ${ok}`;
                        return ok;
                      }
                    : undefined,
            }}
          />
          <Text className="text-gray-700">{validateLog.value}</Text>

          <FormDataDisplay
            control={control}
            title="Wizard Data"
            maxHeight={256}
          />
        </View>
        <SteppedWizard />
      </View>
    </ScrollView>
  );
}

function SteppedWizard() {
  const control = useControl<Registration>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const step = useControl(0);
  const lastValidate = useControl<string>("-");
  const pressed = useControl<string>("no handler has run");
  const page = steppedTree.rootNode.getChildNodes()[step.value];

  function next(source: string) {
    pressed.value = `${source} handler ran`;
    const name = control.fields.name;
    name.setTouched(true);
    const valid = name.validate();
    lastValidate.value = `validate() returned ${valid}, error=${JSON.stringify(name.error ?? null)}`;
    if (!valid) return;
    step.setValue((v) => v + 1);
  }

  return (
    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Stepped wizard
      </Text>
      <Text className="text-gray-600 mb-4">
        Hand-rolled paging with a form "Next" action that calls
        control.validate() before advancing.
      </Text>
      <Text className="mb-4">Step {step.value + 1}</Text>
      <RenderForm
        key={step.value}
        data={createSchemaDataNode(schemaTree.rootNode, control)}
        form={page}
        renderer={renderer}
        options={{
          actionOnClick: (actionId) =>
            actionId === "next" || actionId === "nextFieldValue"
              ? () => next(actionId)
              : actionId === "previous"
                ? () => step.setValue((v) => v - 1)
                : undefined,
        }}
      />
      <Text className="mt-4 text-gray-700">{pressed.value}</Text>
      <Text className="mt-1 text-gray-700">{lastValidate.value}</Text>
    </View>
  );
}
