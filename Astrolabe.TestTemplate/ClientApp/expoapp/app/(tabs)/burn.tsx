import { StyleSheet, Image, Platform, View } from "react-native";

import { Collapsible } from "@/components/Collapsible";
import { ExternalLink } from "@/components/ExternalLink";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { BasicFormEditor } from "@astroapps/schemas-editor";
import {
  createFormRenderer,
  createSchemaLookup,
  makeSchemaDataNode,
  NewControlRenderer,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import { createDefaultRenderers } from "@react-typed-forms/schemas-html";
import { defaultRnTailwindTheme } from "@react-typed-forms/schemas-rn";
import { SchemaMap } from "@/formtest/schemas";
import { FormDefinitions } from "@/formtest/formDefs";
import {
  RenderArrayElements,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import React from "react";

const schemas = createSchemaLookup(SchemaMap) as SchemaTreeLookup;
const renderer = createFormRenderer(
  [],
  createDefaultRenderers({
    ...defaultRnTailwindTheme,
    label: {
      ...defaultRnTailwindTheme.label,
      className: "font-bold py-4",
      groupLabelClass: "text-2xl",
      labelContainer: (c) => (
        <View className="flex flex-row gap-4 items-center" children={c} />
      ),
    },
    action: {
      className: "border text-primary-600 p-3 border-neutral-400 font-bold",
    },
    data: {
      ...defaultRnTailwindTheme.data,
      inputClass: "form-control",
      selectOptions: { className: "form-control" },
      radioOptions: {
        className: "flex flex-row flex-wrap gap-x-4",
        entryClass: "flex flex-row items-center gap-2",
      },
      checkOptions: {
        className: "flex flex-row flex-wrap gap-x-4",
        entryClass: "flex flex-row items-center gap-2",
      },
      checkListOptions: {
        className: "flex flex-wrap gap-x-4",
        entryClass: "flex items-center gap-2",
      },
    },
    display: {
      htmlClassName: "html",
    },
    group: {
      ...defaultRnTailwindTheme.group,
      defaultGridColumns: 1,
      defaultFlexGap: "1em",
    },
    adornment: {
      accordion: {
        className: "flex items-center gap-2 my-2 p-0",
        titleClass: "cursor-pointer",
        iconOpenClass: "fa fa-chevron-up",
        iconClosedClass: "fa fa-chevron-down",
      },
      helpText: {
        triggerContainerClass:
          "flex flex-row gap-2 items-center bg-surface-100 px-2 font-bold text-sm rounded-md whitespace-nowrap",
        contentContainerClass:
          "bg-neutral-900 text-sm text-center font-semibold leading-none text-white w-56 rounded-md px-4 py-2",
        contentTextClass: "text-white text-center",
        iconName: "info-circle",
        iconClass: "!text-[16px] text-black-500",
      },
    },
  }),
);

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
