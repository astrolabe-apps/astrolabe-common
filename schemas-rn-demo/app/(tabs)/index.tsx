import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useControl } from '@react-typed-forms/core';
import { createDefaultRenderers } from '@react-typed-forms/schemas-rn';
import { RenderForm, createSchemaDataNode, createFormTree, createSchemaTree, createFormRenderer } from '@react-typed-forms/schemas';
import { defaultRnTailwindTheme } from '@react-typed-forms/schemas-rn';
import { FieldType, SchemaField, dataControl, groupedControl } from '@astroapps/forms-core';

// Schema definition for user profile
const profileSchema: SchemaField[] = [
  { field: 'firstName', type: FieldType.String, required: true },
  { field: 'lastName', type: FieldType.String, required: true },
  { field: 'email', type: FieldType.String, required: true },
  { field: 'phone', type: FieldType.String },
  { field: 'dateOfBirth', type: FieldType.Date },
  { field: 'bio', type: FieldType.String },
  { field: 'age', type: FieldType.Int },
  { field: 'isActive', type: FieldType.Bool },
  { field: 'profilePicture', type: FieldType.String },
];

// Form definition for user profile
const profileForm = [
  groupedControl([
    dataControl('firstName', 'First Name'),
    dataControl('lastName', 'Last Name'),
    dataControl('email', 'Email'),
    dataControl('phone', 'Phone Number'),
    dataControl('dateOfBirth', 'Date of Birth'),
    dataControl('bio', 'Biography'),
    dataControl('age', 'Age'),
    dataControl('isActive', 'Account Active'),
    dataControl('profilePicture', 'Profile Picture URL'),
  ], 'Personal Information'),
];

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  bio?: string;
  age?: number;
  isActive: boolean;
  profilePicture?: string;
}

const initialProfile: UserProfile = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  bio: 'Software developer passionate about React Native and TypeScript.',
  age: 30,
  isActive: true,
  profilePicture: 'https://picsum.photos/200/200',
};

export default function ProfileScreen() {
  const control = useControl<UserProfile>(initialProfile);

  const renderer = createFormRenderer([], createDefaultRenderers(defaultRnTailwindTheme));
  const schemaTree = createSchemaTree(profileSchema);
  const formTree = createFormTree(profileForm);
  const dataNode = createSchemaDataNode(schemaTree.rootNode, control);

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-4">
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">User Profile</Text>
          <Text className="text-gray-600 mb-6">
            This form demonstrates text inputs, date picker, numeric input, and boolean toggle.
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
            <Text className="text-lg font-semibold text-gray-800 mb-2">Current Values:</Text>
            <View className="bg-gray-50 rounded-lg p-4">
              <Text className="font-mono text-sm text-gray-700">
                {JSON.stringify(control.value, null, 2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}