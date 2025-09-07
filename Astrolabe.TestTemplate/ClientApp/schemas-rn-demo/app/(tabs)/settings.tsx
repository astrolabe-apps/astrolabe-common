import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useControl} from '@react-typed-forms/core';
import {createDefaultRenderers, defaultRnTailwindTheme} from '@react-typed-forms/schemas-rn';
import {
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

// Schema definition for settings using buildSchema
const settingsSchema = buildSchema<Settings>({
  // Notifications
  pushEnabled: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Push Notifications',
  }),
  emailEnabled: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Email Notifications',
  }),
  smsEnabled: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'SMS Notifications',
  }),
  frequency: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: 'Notification Frequency',
    options: [
      { name: 'Immediately', value: 'immediately' },
      { name: 'Every Hour', value: 'hourly' },
      { name: 'Daily', value: 'daily' },
      { name: 'Weekly', value: 'weekly' },
    ],
  }),
  // Appearance
  theme: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: 'Theme',
    options: [
      { name: 'Light', value: 'light' },
      { name: 'Dark', value: 'dark' },
      { name: 'Auto (System)', value: 'auto' },
    ],
  }),
  fontSize: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: 'Font Size',
    options: [
      { name: 'Small', value: 'small' },
      { name: 'Medium', value: 'medium' },
      { name: 'Large', value: 'large' },
      { name: 'Extra Large', value: 'extra-large' },
    ],
  }),
  compactMode: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Compact Mode',
  }),
  // Privacy
  profileVisibility: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: 'Profile Visibility',
    options: [
      { name: 'Private', value: 'private' },
      { name: 'Friends Only', value: 'friends' },
      { name: 'Public', value: 'public' },
    ],
  }),
  dataSharing: makeScalarField({
    type: FieldType.String,
    collection: true,
    notNullable: true,
    displayName: 'Data Sharing Options',
    options: [
      { name: 'Analytics', value: 'analytics' },
      { name: 'Marketing', value: 'marketing' },
      { name: 'Research', value: 'research' },
      { name: 'Third Party Services', value: 'third-party' },
    ],
  }),
  twoFactorEnabled: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Two-Factor Authentication',
  }),
  biometricEnabled: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Biometric Authentication',
  }),
  // Preferences
  language: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: 'Language',
    options: [
      { name: 'English', value: 'en' },
      { name: 'Spanish', value: 'es' },
      { name: 'French', value: 'fr' },
      { name: 'German', value: 'de' },
      { name: 'Chinese', value: 'zh' },
    ],
  }),
  timezone: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: 'Timezone',
    options: [
      { name: 'UTC-12 (Baker Island)', value: 'UTC-12' },
      { name: 'UTC-11 (American Samoa)', value: 'UTC-11' },
      { name: 'UTC-10 (Hawaii)', value: 'UTC-10' },
      { name: 'UTC-9 (Alaska)', value: 'UTC-9' },
      { name: 'UTC-8 (Pacific)', value: 'UTC-8' },
      { name: 'UTC-7 (Mountain)', value: 'UTC-7' },
      { name: 'UTC-6 (Central)', value: 'UTC-6' },
      { name: 'UTC-5 (Eastern)', value: 'UTC-5' },
      { name: 'UTC+0 (GMT)', value: 'UTC+0' },
      { name: 'UTC+1 (Central European)', value: 'UTC+1' },
      { name: 'UTC+8 (China/Australia)', value: 'UTC+8' },
      { name: 'UTC+10 (Australia East)', value: 'UTC+10' },
    ],
  }),
  autoSave: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Auto-save Changes',
  }),
  showTips: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Show Tips and Tutorials',
  }),
});

// Form definition for settings
const settingsForm = [
  groupedControl([
    dataControl('pushEnabled', 'Push Notifications', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
    dataControl('emailEnabled', 'Email Notifications', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
    dataControl('smsEnabled', 'SMS Notifications', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
    dataControl('frequency', 'Notification Frequency'),
  ], 'Notification Settings'),
  groupedControl([
    dataControl('theme', 'Theme', {
      renderOptions: { type: DataRenderType.Radio },
    }),
    dataControl('fontSize', 'Font Size', {
      renderOptions: { type: DataRenderType.Radio },
    }),
    dataControl('compactMode', 'Compact Mode', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
  ], 'Appearance Settings'),
  groupedControl([
    dataControl('profileVisibility', 'Profile Visibility', {
      renderOptions: { type: DataRenderType.Radio },
    }),
    dataControl('dataSharing', 'Data Sharing Options'),
    dataControl('twoFactorEnabled', 'Two-Factor Authentication', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
    dataControl('biometricEnabled', 'Biometric Authentication', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
  ], 'Privacy & Security'),
  groupedControl([
    dataControl('language', 'Language'),
    dataControl('timezone', 'Timezone'),
    dataControl('autoSave', 'Auto-save Changes', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
    dataControl('showTips', 'Show Tips and Tutorials', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
  ], 'User Preferences'),
];

interface Settings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  frequency: string;
  theme: string;
  fontSize: string;
  compactMode: boolean;
  profileVisibility: string;
  dataSharing: string[];
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  language: string;
  timezone: string;
  autoSave: boolean;
  showTips: boolean;
}

const initialSettings: Settings = {
  pushEnabled: true,
  emailEnabled: false,
  smsEnabled: false,
  frequency: 'daily',
  theme: 'auto',
  fontSize: 'medium',
  compactMode: false,
  profileVisibility: 'friends',
  dataSharing: ['analytics'],
  twoFactorEnabled: true,
  biometricEnabled: false,
  language: 'en',
  timezone: 'UTC-5',
  autoSave: true,
  showTips: true,
};

export default function SettingsScreen() {
  const control = useControl<Settings>(initialSettings);

  const renderer = createFormRenderer([], createDefaultRenderers(defaultRnTailwindTheme));
  const schemaTree = createSchemaTree(settingsSchema);
  const formTree = createFormTree(settingsForm);
  const dataNode = createSchemaDataNode(schemaTree.rootNode, control);

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-4">
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">App Settings</Text>
          <Text className="text-gray-600 mb-6">
            This screen demonstrates dropdowns, radio buttons, checkboxes, checkboxlists, and groups.
          </Text>
          
          <RenderForm
            data={dataNode}
            form={formTree.rootNode}
            renderer={renderer}
            options={{
              variables: () => ({
                platform: 'mobile',
              }),
            }}
          />
          
          <FormDataDisplay control={control} title="Current Settings" maxHeight={160} />
        </View>
      </View>
    </ScrollView>
  );
}