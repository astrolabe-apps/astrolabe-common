import { Image, StyleSheet, Text, View } from "react-native";
import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedView } from "@/components/ThemedView";
import {
  addMissingControlsForSchema,
  createFormRenderer,
  createSchemaLookup,
  groupedControl,
  makeSchemaDataNode,
  NewControlRenderer,
} from "@react-typed-forms/schemas";
import {
  defaultRnTailwindTheme,
  RNButton,
  RNDialog,
  RNText,
} from "@react-typed-forms/schemas-rn";
import { createDefaultRenderers } from "@react-typed-forms/schemas-html";
import { TestSchema } from "@/form";
import React from "react";
import { useControl, useControlEffect } from "@react-typed-forms/core";
import { ScrollView } from "react-native-gesture-handler";

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
  const dialogOpen = useControl(false);
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
      <View className={"flex-1 py-6"}>
        <RNDialog
          open={dialogOpen}
          title={"Dialog Title"}
          trigger={
            <RNButton>
              <RNText>Open Dialog</RNText>
            </RNButton>
          }
          containerClass={"max-h-[600px] w-[300px]"}
          content={
            <ScrollView nestedScrollEnabled={true}>
              <View onStartShouldSetResponder={() => true}>
                {[...Array(100).keys()].map((x) => (
                  <Text key={x}>{`Item ${x}`}</Text>
                ))}
              </View>
            </ScrollView>
          }
          footer={
            <View className={"flex flex-row justify-end gap-2"}>
              <RNButton onPress={() => (dialogOpen.value = false)}>
                <RNText>Confirm</RNText>
              </RNButton>
              <RNButton
                variant={"outline"}
                onPress={() => (dialogOpen.value = false)}
              >
                <RNText>Cancel</RNText>
              </RNButton>
            </View>
          }
        />
      </View>
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
