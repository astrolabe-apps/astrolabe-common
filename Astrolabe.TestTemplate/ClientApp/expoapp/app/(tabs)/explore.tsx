import { StyleSheet, View } from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { BasicFormEditor, readOnlySchemas } from "@astroapps/schemas-editor";
import {
  createFormRenderer,
  createSchemaLookup,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import { createDefaultRenderers } from "@react-typed-forms/schemas-html";
import { defaultRnTailwindTheme } from "@react-typed-forms/schemas-rn";
import { SchemaMap } from "@/formtest/schemas";
import { FormDefinitions } from "@/formtest/formDefs";
import "flexlayout-react/style/light.css";
import { renderer } from "@/components/FormRenderer";

const editorRenderer = createFormRenderer(
  [],
  createDefaultRenderers({
    ...defaultRnTailwindTheme,
  }),
);

type FormType = keyof typeof FormDefinitions;
export default function TabTwoScreen() {
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
      <View className="min-h-screen">
        <BasicFormEditor<FormType>
          loadSchema={readOnlySchemas(SchemaMap)}
          formRenderer={editorRenderer}
          formTypes={Object.entries(FormDefinitions).map((x) => [
            x[0] as FormType,
            x[1].name,
          ])}
          loadForm={async (v) => ({
            controls: FormDefinitions[v].controls,
            schemaName: FormDefinitions[v].schemaName,
            renderer: editorRenderer,
          })}
          saveForm={async (form) => console.log(form)}
        />
      </View>
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
