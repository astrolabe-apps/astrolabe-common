import Controls from "./FireInitial.json";
import { Control, RenderControl, useControl } from "@react-typed-forms/core";
import {
  ControlDefinition,
  makeSchemaDataNode,
  rootSchemaNode,
  SchemaField,
  useControlRenderer,
  visitControlDataArray,
} from "@react-typed-forms/schemas";
import { InitialFireRegistrationSchema, TypeOfFireForm } from "~/form/schemas";
import { formRenderer } from "~/form/renderers";
import { ScrollView, View } from "react-native";
import React from "react";
import { FormPager } from "./FormPager";
const AllControls = Controls.controls;

export function ShowForm() {
  const data = useControl<any>({
    burnRegistrationEnabled: true,
    initialType: TypeOfFireForm.Permit,
  });

  const page = useControl(0);
  const currentPage = page.value;

  return (
    <View className={"flex flex-col h-full w-full"}>
      <View className={"flex-1"}>
        <ScrollView className={"w-full p-6"}>
          <RenderControl key={currentPage}>
            {() => {
              const RenderForm = useControlRenderer(
                AllControls[currentPage],
                InitialFireRegistrationSchema,
                formRenderer,
              );
              return <RenderForm control={data} />;
            }}
          </RenderControl>
        </ScrollView>
      </View>
      <View className={"bg-background shadow-lg"}>
        <FormPager
          currentPage={page}
          totalPages={AllControls.length}
          validate={makePageValidator(
            data,
            AllControls[currentPage],
            InitialFireRegistrationSchema,
          )}
        />
        {/*<RenderControl render={() => <Text>{JSON.stringify(data.value)}</Text>} />*/}
      </View>
    </View>
  );
}

function makePageValidator(
  data: Control<any>,
  page: ControlDefinition,
  fields: SchemaField[],
): () => Promise<boolean> {
  return async () => {
    return scrollToFirstErrorOnPage([page], fields, data);
  };
}
function scrollToFirstErrorOnPage(
  controls: ControlDefinition[],
  schema: SchemaField[],
  data: Control<any>,
) {
  // TODO: Implement scroll on mobile
  // let firstError: HTMLElement | undefined;
  let hasError: boolean = false;
  visitControlDataArray(
    controls,
    makeSchemaDataNode(rootSchemaNode(schema), data),
    (d, s) => {
      const v = s.control!;
      v.touched = true;
      v.validate();
      console.log(v.error);

      if (!hasError && v.error) {
        hasError = true;
      }
      // if (!firstError && v.error && v.meta.scrollElement) {
      //   firstError = v.meta.scrollElement;
      // }
      return undefined;
    },
  );
  // console.log(firstError);
  return !hasError;
}
