import { StyleSheet } from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { IconSymbol } from "@/components/ui/IconSymbol";
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
import React from "react";
import { renderer } from "@/components/FormRenderer";

const schemas = createSchemaLookup(SchemaMap) as SchemaTreeLookup;

type FormType = keyof typeof FormDefinitions;
const controls = FormDefinitions.Burn.controls;
const schemaNode = schemas.getSchema(FormDefinitions.Burn.schemaName)!;

export default function TabThreeScreen() {
  const data = useControl(testFormData);
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

const testFormData = {
  registration: {
    startDate: "2025-02-18",
    startTime: "10:13:00",
    endDate: "2025-02-18",
    endTime: "10:14:00",
    isYourFireLargerThan1MeterCubed: true,
    fireUnitSize: "CubicMetres",
    area: 2,
    purpose: "Purpose",
    materialsBeingBurnt: "Grass",
    fuelArrangement: "Piles",
    otherDetails: "Details",
    isYourPropertyLargerThan2000MetersSquared: false,
    nameOfBrigadeInAttendance: "Support",
    acknowledgement: true,
  },
  contact: {
    linkedServices: [],
  },
  isYourFireLargerThan1MeterCubed: true,
};
