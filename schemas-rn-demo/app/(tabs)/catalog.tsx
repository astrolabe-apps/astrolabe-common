import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useControl } from '@react-typed-forms/core';
import { createDefaultRenderers } from '@react-typed-forms/schemas-rn';
import { RenderForm, createSchemaDataNode, createFormTree, createSchemaTree, createFormRenderer } from '@react-typed-forms/schemas';
import { defaultRnTailwindTheme } from '@react-typed-forms/schemas-rn';
import { FieldType, SchemaField, dataControl, groupedControl } from '@astroapps/forms-core';

// Schema definition for product catalog
const catalogSchema: SchemaField[] = [
  { field: 'name', type: FieldType.String, required: true },
  { field: 'price', type: FieldType.Double, required: true },
  { field: 'category', type: FieldType.String, required: true },
  { field: 'inStock', type: FieldType.Bool },
  { field: 'tags', type: FieldType.String, collection: true },
  { field: 'description', type: FieldType.String },
  { field: 'images', type: FieldType.String, collection: true },
  { field: 'specifications', type: FieldType.String },
  { field: 'reviews', type: FieldType.Any, collection: true },
];

// Form definition for product catalog
const catalogForm = [
  groupedControl([
    dataControl('name', 'Product Name'),
    dataControl('price', 'Price ($)'),
    dataControl('category', 'Category'),
    dataControl('inStock', 'In Stock'),
  ], 'Product Information'),
  groupedControl([
    dataControl('tags', 'Tags'),
    dataControl('description', 'Description'),
    dataControl('images', 'Product Images (URLs)'),
    dataControl('specifications', 'Specifications'),
  ], 'Product Details'),
];

interface Product {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  tags: string[];
  description: string;
  images: string[];
  specifications: string;
  reviews?: any[];
}

const initialProduct: Product = {
  name: 'Wireless Bluetooth Headphones',
  price: 79.99,
  category: 'electronics',
  inStock: true,
  tags: ['featured', 'new'],
  description: 'High-quality wireless headphones with noise cancellation and long battery life.',
  images: [
    'https://picsum.photos/400/300?random=1',
    'https://picsum.photos/400/300?random=2',
    'https://picsum.photos/400/300?random=3',
  ],
  specifications: 'Bluetooth 5.0, 30-hour battery life, Active noise cancellation',
  reviews: [],
};

export default function CatalogScreen() {
  const control = useControl<Product>(initialProduct);

  const renderer = createFormRenderer([], createDefaultRenderers(defaultRnTailwindTheme));
  const schemaTree = createSchemaTree(catalogSchema);
  const formTree = createFormTree(catalogForm);
  const dataNode = createSchemaDataNode(schemaTree.rootNode, control);

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-4">
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Product Catalog</Text>
          <Text className="text-gray-600 mb-6">
            This form demonstrates dynamic arrays, nested forms, and complex product data.
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
            <Text className="text-lg font-semibold text-gray-800 mb-2">Current Product:</Text>
            <View className="bg-gray-50 rounded-lg p-4 max-h-48">
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