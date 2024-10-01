import { ScrollView, Text, View } from 'react-native';
import {
  ControlLayoutProps,
  ControlRenderer,
  createFormRenderer,
  dataControl,
  DefaultRendererOptions,
  defaultTailwindTheme,
  groupedControl,
  GroupRendererProps,
} from '@react-typed-forms/schemas';
import { RenderArrayElements, useControl } from '@react-typed-forms/core';
import { InitialFireRegistrationSchema, TypeOfFireForm } from './schemas';
import Controls from './FireInitial.json';
import { createDefaultRenderers } from 'renderers/createDefaultRenderers';

const AllControls = Controls.controls;

const theme: DefaultRendererOptions = {
  ...defaultTailwindTheme,
  label: {
    requiredElement: <Text className="text-red-500"></Text>,
    className: 'font-bold py-4',
    groupLabelClass: 'text-2xl',
    labelContainer: (c) => <Text className="flex flex-row items-baseline gap-4" children={c} />,
  },
  action: {
    className: 'border text-primary-600 p-3 border-neutral-400 font-bold',
  },
  layout: {
    ...defaultTailwindTheme.layout,
  },
  data: {
    ...defaultTailwindTheme.data,
    inputClass: 'form-control',
    selectOptions: { className: 'form-control' },
    radioOptions: {
      className: 'flex flex-row flex-wrap gap-x-4',
      entryClass: 'flex flex-row items-center gap-2',
    },
    checkOptions: {
      entryClass: 'flex flex-row items-center gap-1',
    },
    checkListOptions: {
      className: 'flex flex-row flex-wrap gap-x-4',
      entryClass: 'flex flex-row items-center gap-2',
    },
  },
  display: {
    htmlClassName: 'html',
  },
  group: {
    ...defaultTailwindTheme.group,
    defaultGridColumns: 1,
    defaultFlexGap: '1em',
  },
  adornment: {
    accordion: {
      className: 'flex items-center gap-2 my-2 p-0',
      titleClass: 'cursor-pointer',
      iconOpenClass: 'fa fa-chevron-up',
      iconClosedClass: 'fa fa-chevron-down',
    },
  },
};

const formRenderer = createFormRenderer([], {
  ...createDefaultRenderers(theme),
});

export const EditScreenInfo = ({ path }: { path: string }) => {
  const data = useControl<any>({
    burnRegistrationEnabled: true,
    initialType: TypeOfFireForm.Permit,
  });
  return (
    <ScrollView className="px-4">
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
      <View className="py-10">
        <Text>{JSON.stringify(data.value)}</Text>
      </View>
    </ScrollView>
  );
};
