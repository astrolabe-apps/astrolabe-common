import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Control } from '@react-typed-forms/core';

interface FormDataDisplayProps<T> {
  control: Control<T>;
  title?: string;
  maxHeight?: number;
}

export function FormDataDisplay({ 
  control, 
  title = "Current Values", 
  maxHeight = 200 
}: FormDataDisplayProps<any>) {
  const maxHeightStyle = { maxHeight };
  return (
    <View className="mt-6 pt-4 border-t border-gray-200">
      <Text className="text-lg font-semibold text-gray-800 mb-2">{title}:</Text>
      <View className="bg-gray-50 rounded-lg p-4" style={maxHeightStyle}>
        <ScrollView nestedScrollEnabled>
          <Text className="font-mono text-xs text-gray-700">
            {JSON.stringify(control.value, null, 2)}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}