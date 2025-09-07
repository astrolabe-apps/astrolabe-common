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

// Schema definition for product catalog using buildSchema
const catalogSchema = buildSchema<Product>({
  name: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: 'Product Name',
  }),
  price: makeScalarField({
    type: FieldType.Double,
    notNullable: true,
    required: true,
    displayName: 'Price ($)',
  }),
  category: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: 'Category',
    options: [
      { name: 'Electronics', value: 'electronics' },
      { name: 'Clothing', value: 'clothing' },
      { name: 'Home & Garden', value: 'home-garden' },
      { name: 'Sports & Outdoors', value: 'sports-outdoors' },
      { name: 'Books', value: 'books' },
      { name: 'Toys & Games', value: 'toys-games' },
    ],
  }),
  inStock: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    displayName: 'In Stock',
  }),
  tags: makeScalarField({
    type: FieldType.String,
    collection: true,
    notNullable: true,
    displayName: 'Tags',
    options: [
      { name: 'Featured', value: 'featured' },
      { name: 'New', value: 'new' },
      { name: 'Sale', value: 'sale' },
      { name: 'Popular', value: 'popular' },
      { name: 'Limited Edition', value: 'limited-edition' },
    ],
  }),
  description: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: 'Description',
  }),
  images: makeScalarField({
    type: FieldType.String,
    collection: true,
    notNullable: true,
    displayName: 'Product Images (URLs)',
  }),
  specifications: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    displayName: 'Specifications',
  }),
  reviews: makeScalarField({
    type: FieldType.Any,
    collection: true,
    displayName: 'Reviews',
  }),
});

// Form definition for product catalog
const catalogForm = [
  groupedControl([
    dataControl('name', 'Product Name'),
    dataControl('price', 'Price ($)'),
    dataControl('category', 'Category', {
      renderOptions: { type: DataRenderType.Radio },
    }),
    dataControl('inStock', 'In Stock', {
      renderOptions: { type: DataRenderType.Checkbox },
    }),
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
          
          <FormDataDisplay control={control} title="Current Product" maxHeight={192} />
        </View>
      </View>
    </ScrollView>
  );
}