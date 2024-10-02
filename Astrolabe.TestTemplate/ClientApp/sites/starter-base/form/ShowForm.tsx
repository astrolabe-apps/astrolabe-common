import Controls from './FireInitial.json';
import { RenderArrayElements, RenderControl, useControl } from '@react-typed-forms/core';
import { ControlRenderer } from '@react-typed-forms/schemas';
import { InitialFireRegistrationSchema, TypeOfFireForm } from '~/form/schemas';
import { formRenderer } from '~/form/renderers';
import { ScrollView, Text, View } from 'react-native';
import React from 'react';
const AllControls = Controls.controls;

export function ShowForm() {
  const data = useControl<any>({
    burnRegistrationEnabled: true,
    initialType: TypeOfFireForm.Permit,
  });
  return (
    <View>
      <ScrollView>
        <RenderArrayElements array={AllControls}>
          {(c) => (
            <ControlRenderer
              definition={c}
              fields={InitialFireRegistrationSchema}
              renderer={formRenderer}
              control={data}
            />
          )}
        </RenderArrayElements>
      </ScrollView>
      <RenderControl render={() => <Text>{JSON.stringify(data.value)}</Text>} />
    </View>
  );
}
