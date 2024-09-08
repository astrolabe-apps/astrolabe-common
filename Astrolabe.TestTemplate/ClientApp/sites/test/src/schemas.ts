import {
  buildSchema,
  FieldType,
  makeCompoundField,
  makeScalarField,
} from "@react-typed-forms/schemas";

export enum MaterialsBeingBurnt {
  Grass = "Grass",
  BushScrub = "BushScrub",
  LogHeaps = "LogHeaps",
  LoggingSlash = "LoggingSlash",
  GardenWaste = "GardenWaste",
  CropResidue = "CropResidue",
  MixedFuels = "MixedFuels",
  Other = "Other",
  DomesticFirePot = "DomesticFirePot",
  WoodfiredCooker = "WoodfiredCooker",
}

export enum FuelArrangement {
  Cut = "Cut",
  Piles = "Piles",
  Standing = "Standing",
}

export enum TypeOfFireForm {
  Permit = "Permit",
  BurnRegistration = "BurnRegistration",
}

export enum FireUnitSize {
  CubicMetres = "CubicMetres",
  Hectares = "Hectares",
}

export interface PermitAndTFBForm {
  name: string;
  state: string | null;
  start: string | null;
  end: string | null;
}

export const PermitAndTFBSchema = buildSchema<PermitAndTFBForm>({
  name: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Name",
  }),
  state: makeScalarField({
    type: FieldType.String,
    displayName: "State",
  }),
  start: makeScalarField({
    type: FieldType.DateTime,
    displayName: "Start",
  }),
  end: makeScalarField({
    type: FieldType.DateTime,
    displayName: "End",
  }),
});

export interface FireRegistrationForm {
  startDate: string;
  startTime: string;
  area: number | null;
  endDate: string | null;
  endTime: string | null;
  sentOn: string | null;
  fuelArrangement: FuelArrangement | null;
  nameOfBrigadeInAttendance: string | null;
  doYouRequireMultiLights: boolean | null;
  isYourFireLargerThan1MeterCubed: boolean;
  isYourPropertyLargerThan2000MetersSquared: boolean | null;
  materialsBeingBurnt: MaterialsBeingBurnt | null;
  materialsBeingBurntOther: string | null;
  purpose: string | null;
  acknowledgement: boolean | null;
  otherDetails: string | null;
  escadIncidentNumber: string | null;
  name: string | null;
  receiptNumber: string | null;
  fireUnitSize: FireUnitSize | null;
  latitude: number | null;
  longitude: number | null;
  propertyAddress: string | null;
  typeOfFireForm: TypeOfFireForm;
  fpAndTFBStatus: string | null;
}

export const FireRegistrationSchema = buildSchema<FireRegistrationForm>({
  startDate: makeScalarField({
    type: FieldType.Date,
    notNullable: true,
    required: true,
    displayName: "Start Date",
  }),
  startTime: makeScalarField({
    type: FieldType.Time,
    notNullable: true,
    required: true,
    displayName: "Start Time",
  }),
  area: makeScalarField({
    type: FieldType.Double,
    displayName: "Area",
  }),
  endDate: makeScalarField({
    type: FieldType.Date,
    displayName: "End Date",
  }),
  endTime: makeScalarField({
    type: FieldType.Time,
    displayName: "End Time",
  }),
  sentOn: makeScalarField({
    type: FieldType.DateTime,
    displayName: "Sent On",
  }),
  fuelArrangement: makeScalarField({
    type: FieldType.String,
    displayName: "Fuel Arrangement",
    options: [
      {
        name: "Cut",
        value: "Cut",
      },
      {
        name: "Piles",
        value: "Piles",
      },
      {
        name: "Standing",
        value: "Standing",
      },
    ],
  }),
  nameOfBrigadeInAttendance: makeScalarField({
    type: FieldType.String,
    displayName: "Name Of Brigade In Attendance",
  }),
  doYouRequireMultiLights: makeScalarField({
    type: FieldType.Bool,
    displayName: "Do You Require Multi Lights",
  }),
  isYourFireLargerThan1MeterCubed: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    required: true,
    displayName: "Is Your Fire Larger Than1 Meter Cubed",
  }),
  isYourPropertyLargerThan2000MetersSquared: makeScalarField({
    type: FieldType.Bool,
    displayName: "Is Your Property Larger Than2000 Meters Squared",
  }),
  materialsBeingBurnt: makeScalarField({
    type: FieldType.String,
    displayName: "Materials Being Burnt",
    options: [
      {
        name: "Grass",
        value: "Grass",
      },
      {
        name: "Bush / Scrub",
        value: "BushScrub",
      },
      {
        name: "Log heaps",
        value: "LogHeaps",
      },
      {
        name: "Logging slash",
        value: "LoggingSlash",
      },
      {
        name: "Garden waste",
        value: "GardenWaste",
      },
      {
        name: "Crop residue",
        value: "CropResidue",
      },
      {
        name: "Mixed fuels",
        value: "MixedFuels",
      },
      {
        name: "Domestic fire pot",
        value: "DomesticFirePot",
      },
      {
        name: "Woodfired cooker",
        value: "WoodfiredCooker",
      },
      {
        name: "Other",
        value: "Other",
      },
    ],
  }),
  materialsBeingBurntOther: makeScalarField({
    type: FieldType.String,
    displayName: "Materials Being Burnt Other",
  }),
  purpose: makeScalarField({
    type: FieldType.String,
    displayName: "Purpose",
  }),
  acknowledgement: makeScalarField({
    type: FieldType.Bool,
    displayName: "Acknowledgement",
  }),
  otherDetails: makeScalarField({
    type: FieldType.String,
    displayName: "Other Details",
  }),
  escadIncidentNumber: makeScalarField({
    type: FieldType.String,
    displayName: "ESCAD Incident Number",
  }),
  name: makeScalarField({
    type: FieldType.String,
    displayName: "Name",
  }),
  receiptNumber: makeScalarField({
    type: FieldType.String,
    displayName: "Receipt Number",
  }),
  fireUnitSize: makeScalarField({
    type: FieldType.String,
    displayName: "Fire Unit Size",
    options: [
      {
        name: "Cubic metres",
        value: "CubicMetres",
      },
      {
        name: "Hectares",
        value: "Hectares",
      },
    ],
  }),
  latitude: makeScalarField({
    type: FieldType.Double,
    displayName: "Latitude",
  }),
  longitude: makeScalarField({
    type: FieldType.Double,
    displayName: "Longitude",
  }),
  propertyAddress: makeScalarField({
    type: FieldType.String,
    displayName: "Property Address",
  }),
  typeOfFireForm: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Type Of Fire Form",
    options: [
      {
        name: "Permit",
        value: "Permit",
      },
      {
        name: "Burn Registration",
        value: "BurnRegistration",
      },
    ],
  }),
  fpAndTFBStatus: makeScalarField({
    type: FieldType.String,
    displayName: "FP AndTFB Status",
  }),
});

export interface MyContactDetailsForm {
  firstName: string | null;
  lastName: string | null;
  mobilePhone: string | null;
  fullAddress: string | null;
  emailAddress: string | null;
  alternativeNumber: string | null;
  dateOfBirth: string | null;
}

export const MyContactDetailsSchema = buildSchema<MyContactDetailsForm>({
  firstName: makeScalarField({
    type: FieldType.String,
    displayName: "First Name",
  }),
  lastName: makeScalarField({
    type: FieldType.String,
    displayName: "Last Name",
  }),
  mobilePhone: makeScalarField({
    type: FieldType.String,
    displayName: "Mobile Phone",
  }),
  fullAddress: makeScalarField({
    type: FieldType.String,
    displayName: "Full Address",
  }),
  emailAddress: makeScalarField({
    type: FieldType.String,
    displayName: "Email Address",
  }),
  alternativeNumber: makeScalarField({
    type: FieldType.String,
    displayName: "Alternative Number",
  }),
  dateOfBirth: makeScalarField({
    type: FieldType.Date,
    displayName: "Date Of Birth",
  }),
});

export interface FireRegistrationEditForm {
  registration: FireRegistrationForm;
  contact: MyContactDetailsForm;
}

export const FireRegistrationEditSchema = buildSchema<FireRegistrationEditForm>(
  {
    registration: makeCompoundField({
      children: FireRegistrationSchema,
      schemaRef: "FireRegistration",
      notNullable: true,
      displayName: "Registration",
    }),
    contact: makeCompoundField({
      children: MyContactDetailsSchema,
      schemaRef: "MyContactDetails",
      notNullable: true,
      displayName: "Contact",
    }),
  },
);

export interface InitialFireRegistrationForm {
  location: string;
  allowedToBurn: boolean | null;
  locationStatus: PermitAndTFBForm | null;
  insidePermitPeriod: boolean;
  details: FireRegistrationEditForm;
  typeOfFireForm: TypeOfFireForm;
  burnRegistrationEnabled: boolean;
  initialType: TypeOfFireForm;
}

export const InitialFireRegistrationSchema =
  buildSchema<InitialFireRegistrationForm>({
    location: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Location",
    }),
    allowedToBurn: makeScalarField({
      type: FieldType.Bool,
      displayName: "Allowed To Burn",
    }),
    locationStatus: makeCompoundField({
      children: PermitAndTFBSchema,
      schemaRef: "PermitAndTFB",
      displayName: "Location Status",
    }),
    insidePermitPeriod: makeScalarField({
      type: FieldType.Bool,
      notNullable: true,
      required: true,
      displayName: "Inside Permit Period",
    }),
    details: makeCompoundField({
      children: FireRegistrationEditSchema,
      schemaRef: "FireRegistrationEdit",
      notNullable: true,
      displayName: "Details",
    }),
    typeOfFireForm: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Type Of Fire Form",
      options: [
        {
          name: "Permit",
          value: "Permit",
        },
        {
          name: "Burn Registration",
          value: "BurnRegistration",
        },
      ],
    }),
    burnRegistrationEnabled: makeScalarField({
      type: FieldType.Bool,
      notNullable: true,
      required: true,
      displayName: "Burn Registration Enabled",
    }),
    initialType: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Initial Type",
      options: [
        {
          name: "Permit",
          value: "Permit",
        },
        {
          name: "Burn Registration",
          value: "BurnRegistration",
        },
      ],
    }),
  });
