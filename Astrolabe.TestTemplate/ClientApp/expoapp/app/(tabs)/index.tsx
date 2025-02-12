import {
  Image,
  StyleSheet,
  Platform,
  View,
  Text,
  Pressable,
  TextInput,
} from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  addMissingControlsForSchema,
  compoundField,
  createFormRenderer,
  createSchemaLookup,
  defaultControlForField,
  groupedControl,
  makeSchemaDataNode,
  NewControlRenderer,
  useControlRenderer,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import { createElement, ElementType, Fragment, Key, ReactElement } from "react";
import { TestSchema } from "@/form";
import { useControl, useControlEffect } from "@react-typed-forms/core";

function renderHtml(
  tag: ElementType,
  props: any,
  ...childs: any[]
): ReactElement {
  if (typeof tag !== "string") return createElement(arguments as any);
  const children = props?.children ?? childs;

  switch (tag) {
    case "button":
      const onPress = props.onClick;
      return <Pressable {...props} onPress={onPress} />;
    case "label":
      return <Text {...props} />;
    case "div":
      return <View {...props} children={children} />;
    case "input":
      const { onChange, value, ...rest } = props;
      return (
        <TextInput
          {...rest}
          value={typeof value == "number" ? value.toString() : value}
          onChangeText={(t) => onChange({ target: { value: t } })}
        />
      );
  }
  throw new Error(`Unknown tag: ${tag}`);
}

const renderer = createFormRenderer(
  [],
  createDefaultRenderers({
    ...defaultTailwindTheme,
    label: {
      className: "font-bold",
    },
    h: renderHtml,
    renderText: (p) => <Text>{p}</Text>,
  }),
);

const schemaNode = createSchemaLookup({ "": TestSchema }).getSchema("");
const controlDef = groupedControl(addMissingControlsForSchema(schemaNode, []));
export default function HomeScreen() {
  const data = useControl({});
  useControlEffect(
    () => data.value,
    (v) => console.log(v),
  );
  console.log({ uniqueId: data.uniqueId });
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
        <NewControlRenderer
          definition={controlDef}
          renderer={renderer}
          parentDataNode={makeSchemaDataNode(schemaNode, data)}
        />
        <Text className="text-red-500 font-bold">Welcome!</Text>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit{" "}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText>{" "}
          to see changes. Press{" "}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: "cmd + d",
              android: "cmd + m",
              web: "F12",
            })}
          </ThemedText>{" "}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          Tap the Explore tab to learn more about what's included in this
          starter app.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          When you're ready, run{" "}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText>{" "}
          to get a fresh <ThemedText type="defaultSemiBold">app</ThemedText>{" "}
          directory. This will move the current{" "}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{" "}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
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
