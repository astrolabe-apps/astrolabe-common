import React from 'react';
import { ScrollView, Text, View, Alert } from 'react-native';
import { useControl } from '@react-typed-forms/core';
import { createDefaultRenderers, createButtonActionRenderer } from '@react-typed-forms/schemas-rn';
import { RenderForm, createSchemaDataNode, createFormTree, createSchemaTree, createFormRenderer } from '@react-typed-forms/schemas';
import { defaultRnTailwindTheme } from '@react-typed-forms/schemas-rn';
import { FieldType, SchemaField, dataControl, groupedControl, actionControl } from '@astroapps/forms-core';

// Schema definition for survey
const surveySchema: SchemaField[] = [
  { field: 'name', type: FieldType.String, required: true },
  { field: 'email', type: FieldType.String, required: true },
  { field: 'age', type: FieldType.Int, required: true },
  { field: 'rating', type: FieldType.Int },
  { field: 'satisfaction', type: FieldType.String },
  { field: 'features', type: FieldType.String, collection: true },
  { field: 'improvements', type: FieldType.String, collection: true },
  { field: 'feedback', type: FieldType.String },
  { field: 'recommend', type: FieldType.Bool },
  { field: 'followUp', type: FieldType.Bool },
  { field: 'contactTime', type: FieldType.String },
  { field: 'newsletter', type: FieldType.Bool },
];

// Form definition for survey
const surveyForm = [
  groupedControl([
    dataControl('name', 'Full Name'),
    dataControl('email', 'Email Address'),
    dataControl('age', 'Age'),
  ], 'Personal Information'),
  groupedControl([
    dataControl('rating', 'Overall Rating'),
    dataControl('satisfaction', 'How satisfied are you?'),
    dataControl('features', 'Which features do you use most?'),
  ], 'Satisfaction Survey'),
  groupedControl([
    dataControl('improvements', 'What would you like to see improved?'),
    dataControl('feedback', 'Additional Comments'),
    dataControl('recommend', 'Would you recommend this app to others?'),
  ], 'Feedback & Suggestions'),
  groupedControl([
    dataControl('followUp', 'May we contact you for follow-up questions?'),
    dataControl('contactTime', 'Best time to contact you'),
    dataControl('newsletter', 'Subscribe to our newsletter'),
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
          
          <View className="mt-6 pt-4 border-t border-gray-200">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Survey Data:</Text>
            <View className="bg-gray-50 rounded-lg p-4 max-h-64">
              <ScrollView>
                <Text className="font-mono text-xs text-gray-700">
                  {JSON.stringify(control.value, null, 2)}
                </Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}