import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useControl } from "@react-typed-forms/core";
import {
  createDefaultRenderers,
  defaultRnTailwindTheme,
} from "@react-typed-forms/schemas-rn";
import {
  actionControl,
  ActionStyle,
  buildSchema,
  createFormRenderer,
  createFormTree,
  createSchemaDataNode,
  createSchemaTree,
  dataControl,
  displayOnlyOptions,
  FieldType,
  groupedControl,
  htmlDisplayControl,
  makeScalarField,
  RenderForm,
  textDisplayControl,
} from "@react-typed-forms/schemas";
import { FormDataDisplay } from "../../components/FormDataDisplay";

interface DisplayDemo {
  name: string;
  email: string;
  status: string;
  notes: string;
}

const displaySchema = buildSchema<DisplayDemo>({
  name: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: "Name",
  }),
  email: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: "Email",
  }),
  status: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: "Status",
  }),
  notes: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: "Notes",
  }),
});

const displayForm = [
  groupedControl(
    [htmlDisplayControl("<b>This is <i>HTML</i> display content</b>")],
    "HTML Display",
  ),
  groupedControl(
    [
      dataControl("name", "Name (selectable)", displayOnlyOptions({})),
      dataControl("email", "Email (selectable)", displayOnlyOptions({})),
    ],
    "Display Only - Selectable",
  ),
  groupedControl(
    [
      dataControl("status", "Status (not selectable)", {
        ...displayOnlyOptions({}),
        noSelection: true,
      }),
      dataControl("notes", "Notes (not selectable)", {
        ...displayOnlyOptions({}),
        noSelection: true,
      }),
    ],
    "Display Only - No Selection",
  ),
  groupedControl(
    [
      textDisplayControl("This is a plain text display control."),
      htmlDisplayControl(
        '<p style="color: blue;">Blue HTML text</p><ul><li>Item 1</li><li>Item 2</li></ul>',
      ),
    ],
    "Text & HTML Display Controls",
  ),
  actionControl("Action Group", "actionGroup", {
    actionStyle: ActionStyle.Group,
    children: [
      textDisplayControl("Text inside an action group."),
      textDisplayControl("Another text display control (not selectable).", {
        noSelection: true,
      }),
    ],
  }),
];

const initialData: DisplayDemo = {
  name: "Jane Smith",
  email: "jane.smith@example.com",
  status: "Active",
  notes: "Try selecting this text - you should not be able to.",
};

export default function DisplayScreen() {
  const control = useControl<DisplayDemo>(initialData);

  const renderer = createFormRenderer(
    [],
    createDefaultRenderers(defaultRnTailwindTheme),
  );
  const schemaTree = createSchemaTree(displaySchema);
  const formTree = createFormTree(displayForm);
  const dataNode = createSchemaDataNode(schemaTree.rootNode, control);

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-4">
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Display Controls
          </Text>
          <Text className="text-gray-600 mb-6">
            Demonstrates HTML display, display-only fields (selectable), and
            display-only fields with noSelection.
          </Text>

          <RenderForm
            data={dataNode}
            form={formTree.rootNode}
            renderer={renderer}
            options={{
              variables: () => ({
                platform: "mobile",
              }),
            }}
          />

          <FormDataDisplay control={control} title="Underlying Data" />
        </View>
      </View>
    </ScrollView>
  );
}