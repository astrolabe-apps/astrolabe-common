import {
  buildSchema,
  stringField,
  intField,
  doubleField,
  dateField,
  timeField,
  dateTimeField,
  boolField,
  compoundField,
  stringOptionsField,
  SchemaTags,
  makeParamTag,
  FieldType,
  makeScalarField,
} from "@react-typed-forms/schemas";

interface ControlsData {
  // Basic scalar fields
  string: string;
  integer: number;
  decimal: number;
  boolean: boolean;
  date: string;
  time: string;
  dateTime: string;

  // Validation options
  stringWithValidation: string;
  numberWithValidation: number;

  // Fields with options (dropdowns)
  selectString: string;

  // Field with tags
  htmlEditor: string;
  groupedField: string;
  noControlField: string;
  fieldWithId: string;

  // Type fields and conditional fields
  contentType: string;
  textContent?: string;
  imageContent?: {
    url: string;
    alt: string;
  };

  // Arrays/collections
  stringArray: string[];
  objectArray: Array<{
    name: string;
    value: number;
  }>;

  // Nested objects
  address: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };

  // Entity references
  entityRef: string;
}

export const AllControlsSchema = buildSchema<ControlsData>({
  // Basic field types
  string: stringField("String Field"),
  integer: intField("Integer Field"),
  decimal: doubleField("Decimal Field"),
  boolean: boolField("Boolean Field"),
  date: dateField("Date Field"),
  time: timeField("Time Field"),
  dateTime: dateTimeField("Date and Time Field"),

  // Fields with validation
  stringWithValidation: stringField("String with Validation", {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: "^[A-Za-z0-9 ]+$",
  }),

  numberWithValidation: intField("Number with Validation", {
    required: true,
    min: 0,
    max: 100,
  }),

  // Field with options (dropdown)
  selectString: stringOptionsField(
    "Select Option",
    { name: "Option 1", value: "option1" },
    { name: "Option 2", value: "option2" },
    { name: "Option 3", value: "option3" },
  ),

  // Special tag fields
  htmlEditor: stringField("HTML Content", {
    tags: [SchemaTags.HtmlEditor],
  }),

  groupedField: stringField("Grouped Field", {
    tags: [makeParamTag(SchemaTags.ControlGroup, "customGroup")],
  }),

  noControlField: stringField("No Control Field", {
    tags: [SchemaTags.NoControl],
  }),

  fieldWithId: stringField("ID Field", {
    tags: [makeParamTag(SchemaTags.IdField, "someEntityType")],
  }),

  // Type field for conditional rendering
  contentType: stringOptionsField(
    "Content Type",
    { name: "Text", value: "text" },
    { name: "Image", value: "image" },
  ),

  // Conditional field only shown for text type
  textContent: stringField("Text Content", {
    onlyForTypes: ["text"],
  }),

  // Compound field only shown for image type
  imageContent: compoundField(
    "Image Content",
    [stringField("Image URL")("url"), stringField("Alt Text")("alt")],
    {
      onlyForTypes: ["image"],
    },
  ),

  // Array of strings (collection)
  stringArray: stringField("String Array Item", {
    collection: true,
  }),

  // Array of objects
  objectArray: compoundField(
    "Object Array",
    [stringField("Name")("name"), intField("Value")("value")],
    {
      collection: true,
    },
  ),

  // Compound field for nested object
  address: compoundField("Address", [
    stringField("Street")("street"),
    stringField("City")("city"),
    stringField("Zip Code")("zipCode"),
    stringField("Country")("country"),
  ]),

  // Entity reference field
  entityRef: stringField("Entity Reference", {
    type: FieldType.EntityRef,
    entityType: "someEntityType",
  }),
  scalar: makeScalarField,
});
