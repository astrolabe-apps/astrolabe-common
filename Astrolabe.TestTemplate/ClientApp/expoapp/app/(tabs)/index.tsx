import { Image, Platform, StyleSheet, Text, View } from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  addMissingControlsForSchema,
  createFormRenderer,
  createSchemaLookup,
  groupedControl,
  makeSchemaDataNode,
  NewControlRenderer,
} from "@react-typed-forms/schemas";
import { defaultRnTailwindTheme } from "@react-typed-forms/schemas-rn";
import { createDefaultRenderers } from "@react-typed-forms/schemas-html";
import { TestSchema } from "@/form";
import React from "react";
import { BasicFormEditor } from "@astroapps/schemas-editor";
import { useControl, useControlEffect } from "@react-typed-forms/core";

const renderer = createFormRenderer(
  [],
  createDefaultRenderers({
    ...defaultRnTailwindTheme,
  }),
);

const schemas = createSchemaLookup({ TestSchema: TestSchema });
const schemaNode = schemas.getSchema("TestSchema");
const controlDef = groupedControl(addMissingControlsForSchema(schemaNode, []));

export default function HomeScreen() {
  const data = useControl({});
  useControlEffect(
    () => data.value,
    (v) => console.log(v),
  );
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <Text className="text-red-500 font-bold">Welcome!</Text>
        <HelloWave />
      </ThemedView>
      <NewControlRenderer
        definition={controlDef}
        renderer={renderer}
        parentDataNode={makeSchemaDataNode(schemaNode, data)}
      />

      {/*<View className="min-h-screen">*/}
      {/*  <BasicFormEditor*/}
      {/*    schemas={schemas}*/}
      {/*    formRenderer={renderer}*/}
      {/*    formTypes={[["TestSchema", "Test"]]}*/}
      {/*    loadForm={async () => ({ controls: [], schemaName: "TestSchema" })}*/}
      {/*    saveForm={async (form) => console.log(form)}*/}
      {/*  />*/}
      {/*</View>*/}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
