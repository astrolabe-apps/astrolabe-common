import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useControl } from '@react-typed-forms/core';
import { createDefaultRenderers } from '@react-typed-forms/schemas-rn';
import { RenderForm, createSchemaDataNode, createFormTree, createSchemaTree, createFormRenderer } from '@react-typed-forms/schemas';
import { defaultRnTailwindTheme } from '@react-typed-forms/schemas-rn';
import { FieldType, SchemaField, dataControl, groupedControl } from '@astroapps/forms-core';

// Schema definition for settings
const settingsSchema: SchemaField[] = [
  // Notifications
  { field: 'pushEnabled', type: FieldType.Bool },
  { field: 'emailEnabled', type: FieldType.Bool },
  { field: 'smsEnabled', type: FieldType.Bool },
  { field: 'frequency', type: FieldType.String },
  // Appearance
  { field: 'theme', type: FieldType.String },
  { field: 'fontSize', type: FieldType.String },
  { field: 'compactMode', type: FieldType.Bool },
  // Privacy
  { field: 'profileVisibility', type: FieldType.String },
  { field: 'dataSharing', type: FieldType.String, collection: true },
  { field: 'twoFactorEnabled', type: FieldType.Bool },
  { field: 'biometricEnabled', type: FieldType.Bool },
  // Preferences
  { field: 'language', type: FieldType.String },
  { field: 'timezone', type: FieldType.String },
  { field: 'autoSave', type: FieldType.Bool },
  { field: 'showTips', type: FieldType.Bool },
];

// Form definition for settings
const settingsForm = [
  groupedControl([
    dataControl('pushEnabled', 'Push Notifications'),
    dataControl('emailEnabled', 'Email Notifications'),
    dataControl('smsEnabled', 'SMS Notifications'),
    dataControl('frequency', 'Notification Frequency'),
  ], 'Notification Settings'),
  groupedControl([
    dataControl('theme', 'Theme'),
    dataControl('fontSize', 'Font Size'),
    dataControl('compactMode', 'Compact Mode'),
  ], 'Appearance Settings'),
  groupedControl([
    dataControl('profileVisibility', 'Profile Visibility'),
    dataControl('dataSharing', 'Data Sharing Options'),
    dataControl('twoFactorEnabled', 'Two-Factor Authentication'),
    dataControl('biometricEnabled', 'Biometric Authentication'),
  ], 'Privacy & Security'),
  groupedControl([
    dataControl('language', 'Language'),
    dataControl('timezone', 'Timezone'),
    dataControl('autoSave', 'Auto-save Changes'),
    dataControl('showTips', 'Show Tips and Tutorials'),
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
          
          <View className="mt-6 pt-4 border-t border-gray-200">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Current Settings:</Text>
            <View className="bg-gray-50 rounded-lg p-4 max-h-40">
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