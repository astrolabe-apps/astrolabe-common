import React from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import {useControl} from '@react-typed-forms/core';
import {
    createButtonActionRenderer,
    createDefaultRenderers,
    defaultRnTailwindTheme
} from '@react-typed-forms/schemas-rn';
import {
    actionControl,
    buildSchema,
    createFormRenderer,
    createFormTree,
    createSchemaDataNode,
    createSchemaTree,
    dataControl,
    DataRenderType,
    FieldType,
    groupedControl,
    makeScalarField,
    RenderForm
} from '@react-typed-forms/schemas';
import {FormDataDisplay} from '../../components/FormDataDisplay';

// Schema definition for survey using buildSchema
const surveySchema = buildSchema<Survey>({
  name: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: 'Full Name',
  }),
  email: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: 'Email Address',
  }),
  age: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: 'Age',
  }),
  rating: makeScalarField({
    type: FieldType.Int,
    displayName: 'Overall Rating',
    options: [
      { name: '1 Star - Very Poor', value: 1 },
      { name: '2 Stars - Poor', value: 2 },
      { name: '3 Stars - Average', value: 3 },
      { name: '4 Stars - Good', value: 4 },
      { name: '5 Stars - Excellent', value: 5 },
    ],
  }),
  satisfaction: makeScalarField({
    type: FieldType.String,
    displayName: 'How satisfied are you?',
    options: [
      { name: 'Very Dissatisfied', value: 'very-dissatisfied' },
      { name: 'Dissatisfied', value: 'dissatisfied' },
      { name: 'Neutral', value: 'neutral' },
      { name: 'Satisfied', value: 'satisfied' },
      { name: 'Very Satisfied', value: 'very-satisfied' },
    ],
  }),
  features: makeScalarField({
    type: FieldType.String,
    collection: true,
    notNullable: true,
    displayName: 'Which features do you use most?',
    options: [
      { name: 'Messaging', value: 'messaging' },
      { name: 'Notifications', value: 'notifications' },
      { name: 'File Sharing', value: 'file-sharing' },
      { name: 'Calendar', value: 'calendar' },
      { name: 'Search', value: 'search' },
      { name: 'Settings', value: 'settings' },
    ],
  }),
  improvements: makeScalarField({
    type: FieldType.String,
    collection: true,
    notNullable: true,
    displayName: 'What would you like to see improved?',
    options: [
      { name: 'Performance', value: 'performance' },
      { name: 'User Interface', value: 'user-interface' },
      { name: 'New Features', value: 'new-features' },
      { name: 'Bug Fixes', value: 'bug-fixes' },
      { name: 'Documentation', value: 'documentation' },
      { name: 'Customer Support', value: 'customer-support' },
    ],
  }),
  feedback: makeScalarField({
    type: FieldType.String,
    displayName: 'Additional Comments',
  }),
  recommend: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Would you recommend this app to others?',
  }),
  followUp: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'May we contact you for follow-up questions?',
  }),
  contactTime: makeScalarField({
    type: FieldType.String,
    displayName: 'Best time to contact you',
    options: [
      { name: 'Morning (9AM - 12PM)', value: 'morning' },
      { name: 'Afternoon (12PM - 6PM)', value: 'afternoon' },
      { name: 'Evening (6PM - 9PM)', value: 'evening' },
      { name: 'Weekend', value: 'weekend' },
    ],
  }),
  newsletter: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Subscribe to our newsletter',
  }),
});

// Form definition for survey
const surveyForm = [
  groupedControl([
    dataControl('name', 'Full Name'),
    dataControl('email', 'Email Address'),
    dataControl('age', 'Age'),
  ], 'Personal Information'),
  groupedControl([
    dataControl('rating', 'Overall Rating', {
      renderOptions: { type: DataRenderType.Radio },
    }),
    dataControl('satisfaction', 'How satisfied are you?', {
      renderOptions: { type: DataRenderType.Radio },
    }),
    dataControl('features', 'Which features do you use most?'),
  ], 'Satisfaction Survey'),
  groupedControl([
    dataControl('improvements', 'What would you like to see improved?'),
    dataControl('feedback', 'Additional Comments'),
    dataControl('recommend', 'Would you recommend this app to others?', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
  ], 'Feedback & Suggestions'),
  groupedControl([
    dataControl('followUp', 'May we contact you for follow-up questions?', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
    dataControl('contactTime', 'Best time to contact you', {
      renderOptions: { type: DataRenderType.Radio },
    }),
    dataControl('newsletter', 'Subscribe to our newsletter', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
  ], 'Contact Preferences'),
  actionControl('Submit Survey', 'submit'),
];

interface Survey {
  name: string;
  email: string;
  age: number;
  rating?: number;
  satisfaction?: string;
  features: string[];
  improvements: string[];
  feedback?: string;
  recommend: boolean;
  followUp: boolean;
  contactTime?: string;
  newsletter: boolean;
}

const initialSurvey: Survey = {
  name: '',
  email: '',
  age: 25,
  rating: 4,
  satisfaction: 'satisfied',
  features: ['messaging', 'notifications'],
  improvements: ['performance'],
  feedback: '',
  recommend: true,
  followUp: false,
  contactTime: 'afternoon',
  newsletter: false,
};

export default function SurveyScreen() {
  const control = useControl<Survey>(initialSurvey);

  const handleSubmit = () => {
    Alert.alert(
      'Survey Submitted',
      'Thank you for your feedback! Your responses have been recorded.',
      [{ text: 'OK' }]
    );
  };

  const renderer = createFormRenderer(
    [createButtonActionRenderer('submit')],
    createDefaultRenderers(defaultRnTailwindTheme)
  );

  const schemaTree = createSchemaTree(surveySchema);
  const formTree = createFormTree(surveyForm);
  const dataNode = createSchemaDataNode(schemaTree.rootNode, control);

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-4">
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">User Survey</Text>
          <Text className="text-gray-600 mb-6">
            Help us improve our app by completing this comprehensive survey. All control types are demonstrated here.
          </Text>
          
          <RenderForm
            data={dataNode}
            form={formTree.rootNode}
            renderer={renderer}
            options={{
              variables: () => ({
                platform: 'mobile',
              }),
              actionOnClick: (actionId) => {
                if (actionId === 'submit') {
                  return handleSubmit;
                }
                return undefined;
              },
            }}
          />
          
          <FormDataDisplay control={control} title="Survey Data" maxHeight={256} />
        </View>
      </View>
    </ScrollView>
  );
}