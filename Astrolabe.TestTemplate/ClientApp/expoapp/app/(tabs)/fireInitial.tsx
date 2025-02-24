import {
  createSchemaLookup,
  makeSchemaDataNode,
  NewControlRenderer,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import { SchemaMap } from "@/formtest/schemas";
import { FormDefinitions } from "@/formtest/formDefs";
import {
  RenderArrayElements,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { renderer } from "@/components/FormRenderer";
import React from "react";
import { StyleSheet } from "react-native";

const schemas = createSchemaLookup(SchemaMap) as SchemaTreeLookup;
type FormType = keyof typeof FormDefinitions;
const controls = FormDefinitions.FireInitial.controls;
const schemaNode = schemas.getSchema(FormDefinitions.FireInitial.schemaName)!;

export default function TabFourScreen() {
  const data = useControl({});
  useControlEffect(
    () => data.value,
    (v) => console.log(v),
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <RenderArrayElements array={controls}>
        {(c) => (
          <NewControlRenderer
            definition={c}
            renderer={renderer}
            parentDataNode={makeSchemaDataNode(schemaNode, data)}
          />
        )}
      </RenderArrayElements>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
