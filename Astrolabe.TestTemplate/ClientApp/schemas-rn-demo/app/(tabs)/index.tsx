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
    RenderForm, textfieldOptions
} from '@react-typed-forms/schemas';
import {FormDataDisplay} from '../../components/FormDataDisplay';
import {createRNHelpTextRenderer, helpTextAdornment} from '../../components/RNHelpTextRenderer';

// Schema definition for user profile using buildSchema
const profileSchema = buildSchema<UserProfile>({
  firstName: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: 'First Name',
  }),
  lastName: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: 'Last Name',
  }),
  email: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: 'Email',
  }),
  phone: makeScalarField({
    type: FieldType.String,
    displayName: 'Phone Number',
  }),
  dateOfBirth: makeScalarField({
    type: FieldType.Date,
    displayName: 'Date of Birth',
  }),
  bio: makeScalarField({
    type: FieldType.String,
    displayName: 'Biography',
  }),
  age: makeScalarField({
    type: FieldType.Int,
    displayName: 'Age',
  }),
  isActive: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'Account Active',
  }),
  profilePicture: makeScalarField({
    type: FieldType.String,
    displayName: 'Profile Picture URL',
  }),
});

// Form definition for user profile
const profileForm = [
  groupedControl([
    dataControl('firstName', 'First Name'),
    dataControl('lastName', 'Last Name'),
    dataControl('email', 'Email', {
      adornments: [
        helpTextAdornment("We'll only use this to contact you about your account."),
      ],
    }),
    dataControl('phone', 'Phone Number', {
      adornments: [
        helpTextAdornment('Include the country code, e.g. +1 (555) 123-4567.', 'Format'),
      ],
    }),
    dataControl('dateOfBirth', 'Date of Birth'),
    dataControl('bio', 'Biography', {
      ...textfieldOptions({multiline: true}),
      adornments: [
        helpTextAdornment('A short summary shown on your public profile.'),
      ],
    }),
    dataControl('age', 'Age'),
    dataControl('isActive', 'Account Active', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
    dataControl('profilePicture', 'Profile Picture URL'),
  ], 'Personal Information'),
];

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
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

  const renderer = createFormRenderer(
    [createRNHelpTextRenderer(defaultRnTailwindTheme.adornment?.helpText)],
    createDefaultRenderers(defaultRnTailwindTheme),
  );
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
            Fields with an info icon show a HelpText adornment rendered at the end of the label.
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
          
          <FormDataDisplay control={control} title="Current Values" />
        </View>
      </View>
    </ScrollView>
  );
}