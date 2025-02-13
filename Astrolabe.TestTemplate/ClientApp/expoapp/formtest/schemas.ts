import {
  FuelArrangement,
  MaterialsBeingBurnt,
  FireUnitSize,
  TypeOfFireForm,
  FireRegistration,
  MyContactDetails,
  FireRegistrationEdit,
  FirePermitStatus,
  FirePermitSummary,
  DateRange,
  FireDates,
  InitialFireRegistration,
  ReceiptConfirmation,
  SearchResultCount,
  SearchFormRequest,
  SearchForm,
  AcknowledgeService,
  UpgradeOption,
  TUPDetail,
  TUPQuote,
  LineItem,
  TUPQuoteResponse,
  TUPConfirmationRequest,
  TUPVehicleDetail,
  PaymentAvailability,
  PaymentType,
  PaymentOptions,
  MRSTUPVehicleLookup,
  MRSSTPLookupResponse,
  MRSRegistrationLookup,
  TUPsForm,
  MRSReceiptConfirmation,
  MRSRegistrationSummary,
  MRSTUPAcknowledgeService,
  TUPStatus,
  TUPSummary,
} from "./client";
import {
  FieldType,
  makeScalarField,
  buildSchema,
  defaultValueForFields,
  applyDefaultValues,
  makeCompoundField,
} from "@react-typed-forms/schemas";

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
  nearestRoadOrLandmark: string | null;
  insidePermitPeriod: boolean;
  insideFireBanPeriod: boolean;
  datesValid: boolean;
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
        name: "Bonfire",
        value: "Bonfire",
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
  nearestRoadOrLandmark: makeScalarField({
    type: FieldType.String,
    displayName: "Nearest Road Or Landmark",
  }),
  insidePermitPeriod: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    required: true,
    displayName: "Inside Permit Period",
  }),
  insideFireBanPeriod: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    required: true,
    displayName: "Inside Fire Ban Period",
  }),
  datesValid: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    required: true,
    displayName: "Dates Valid",
  }),
});

export const defaultFireRegistrationForm: FireRegistrationForm =
  defaultValueForFields(FireRegistrationSchema);

export function toFireRegistrationForm(
  v: FireRegistration,
): FireRegistrationForm {
  return applyDefaultValues(v, FireRegistrationSchema);
}

export interface MyContactDetailsForm {
  firstName: string | null;
  lastName: string | null;
  mobilePhone: string | null;
  fullAddress: string | null;
  emailAddress: string | null;
  alternativeNumber: string | null;
  dateOfBirth: string | null;
  linkedServices: string[];
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
  linkedServices: makeScalarField({
    type: FieldType.String,
    collection: true,
    notNullable: true,
    displayName: "Linked Services",
  }),
});

export const defaultMyContactDetailsForm: MyContactDetailsForm =
  defaultValueForFields(MyContactDetailsSchema);

export function toMyContactDetailsForm(
  v: MyContactDetails,
): MyContactDetailsForm {
  return applyDefaultValues(v, MyContactDetailsSchema);
}

export interface FireRegistrationEditForm {
  registration: FireRegistrationForm;
  contact: MyContactDetailsForm;
  baseUrl: string | null;
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
    baseUrl: makeScalarField({
      type: FieldType.String,
      displayName: "Base Url",
    }),
  },
);

export const defaultFireRegistrationEditForm: FireRegistrationEditForm =
  defaultValueForFields(FireRegistrationEditSchema);

export function toFireRegistrationEditForm(
  v: FireRegistrationEdit,
): FireRegistrationEditForm {
  return applyDefaultValues(v, FireRegistrationEditSchema);
}

export interface FirePermitSummaryForm {
  id: string;
  date: string;
  status: FirePermitStatus;
  type: TypeOfFireForm;
  escadNumber: string | null;
  receiptNumber: string | null;
  propertyAddress: string;
  editAvailable: boolean;
}

export const FirePermitSummarySchema = buildSchema<FirePermitSummaryForm>({
  id: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Id",
  }),
  date: makeScalarField({
    type: FieldType.Date,
    notNullable: true,
    required: true,
    displayName: "Date",
  }),
  status: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Status",
    options: [
      {
        name: "Draft",
        value: "Draft",
      },
      {
        name: "Registered",
        value: "Registered",
      },
      {
        name: "Submitted",
        value: "Submitted",
      },
      {
        name: "Error",
        value: "Error",
      },
    ],
  }),
  type: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Type",
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
  escadNumber: makeScalarField({
    type: FieldType.String,
    displayName: "ESCAD Number",
  }),
  receiptNumber: makeScalarField({
    type: FieldType.String,
    displayName: "Receipt Number",
  }),
  propertyAddress: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Property Address",
  }),
  editAvailable: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    required: true,
    displayName: "Edit Available",
  }),
});

export const defaultFirePermitSummaryForm: FirePermitSummaryForm =
  defaultValueForFields(FirePermitSummarySchema);

export function toFirePermitSummaryForm(
  v: FirePermitSummary,
): FirePermitSummaryForm {
  return applyDefaultValues(v, FirePermitSummarySchema);
}

export interface DateRangeForm {
  start: string;
  end: string | null;
}

export const DateRangeSchema = buildSchema<DateRangeForm>({
  start: makeScalarField({
    type: FieldType.DateTime,
    notNullable: true,
    required: true,
    displayName: "Start",
  }),
  end: makeScalarField({
    type: FieldType.DateTime,
    displayName: "End",
  }),
});

export const defaultDateRangeForm: DateRangeForm =
  defaultValueForFields(DateRangeSchema);

export function toDateRangeForm(v: DateRange): DateRangeForm {
  return applyDefaultValues(v, DateRangeSchema);
}

export interface FireDatesForm {
  area: string;
  permit: DateRangeForm | null;
  fireBan: DateRangeForm | null;
}

export const FireDatesSchema = buildSchema<FireDatesForm>({
  area: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Area",
  }),
  permit: makeCompoundField({
    children: DateRangeSchema,
    schemaRef: "DateRange",
    displayName: "Permit",
  }),
  fireBan: makeCompoundField({
    children: DateRangeSchema,
    schemaRef: "DateRange",
    displayName: "Fire Ban",
  }),
});

export const defaultFireDatesForm: FireDatesForm =
  defaultValueForFields(FireDatesSchema);

export function toFireDatesForm(v: FireDates): FireDatesForm {
  return applyDefaultValues(v, FireDatesSchema);
}

export interface InitialFireRegistrationForm {
  location: string;
  allowedToBurn: boolean | null;
  locationStatus: FireDatesForm | null;
  details: FireRegistrationEditForm;
  typeOfFireForm: TypeOfFireForm;
  burnRegistrationEnabled: boolean;
  initialType: TypeOfFireForm;
  nearestRoadOrLandmark: string | null;
  containsAddress: boolean | null;
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
      children: FireDatesSchema,
      schemaRef: "FireDates",
      displayName: "Location Status",
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
    nearestRoadOrLandmark: makeScalarField({
      type: FieldType.String,
      displayName: "Nearest Road Or Landmark",
    }),
    containsAddress: makeScalarField({
      type: FieldType.Bool,
      displayName: "Contains Address",
    }),
  });

export const defaultInitialFireRegistrationForm: InitialFireRegistrationForm =
  defaultValueForFields(InitialFireRegistrationSchema);

export function toInitialFireRegistrationForm(
  v: InitialFireRegistration,
): InitialFireRegistrationForm {
  return applyDefaultValues(v, InitialFireRegistrationSchema);
}

export interface ReceiptConfirmationForm {
  receipt: string;
  formType: TypeOfFireForm;
  failure: boolean;
}

export const ReceiptConfirmationSchema = buildSchema<ReceiptConfirmationForm>({
  receipt: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Receipt",
  }),
  formType: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Form Type",
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
  failure: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    required: true,
    displayName: "Failure",
  }),
});

export const defaultReceiptConfirmationForm: ReceiptConfirmationForm =
  defaultValueForFields(ReceiptConfirmationSchema);

export function toReceiptConfirmationForm(
  v: ReceiptConfirmation,
): ReceiptConfirmationForm {
  return applyDefaultValues(v, ReceiptConfirmationSchema);
}

export interface SearchResultCountForm {
  total: number;
  firstResult: number;
  lastResult: number;
  resultName: string;
}

export const SearchResultCountSchema = buildSchema<SearchResultCountForm>({
  total: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Total",
  }),
  firstResult: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "First Result",
  }),
  lastResult: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Last Result",
  }),
  resultName: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Result Name",
  }),
});

export const defaultSearchResultCountForm: SearchResultCountForm =
  defaultValueForFields(SearchResultCountSchema);

export function toSearchResultCountForm(
  v: SearchResultCount,
): SearchResultCountForm {
  return applyDefaultValues(v, SearchResultCountSchema);
}

export interface SearchFormRequestForm {
  orderBy: string;
  perPage: number;
  page: number;
}

export const SearchFormRequestSchema = buildSchema<SearchFormRequestForm>({
  orderBy: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Order By",
  }),
  perPage: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Per Page",
  }),
  page: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Page",
  }),
});

export const defaultSearchFormRequestForm: SearchFormRequestForm =
  defaultValueForFields(SearchFormRequestSchema);

export function toSearchFormRequestForm(
  v: SearchFormRequest,
): SearchFormRequestForm {
  return applyDefaultValues(v, SearchFormRequestSchema);
}

export interface SearchFormForm {
  resultCount: SearchResultCountForm | null;
  request: SearchFormRequestForm;
}

export const SearchFormSchema = buildSchema<SearchFormForm>({
  resultCount: makeCompoundField({
    children: SearchResultCountSchema,
    schemaRef: "SearchResultCount",
    displayName: "Result Count",
  }),
  request: makeCompoundField({
    children: SearchFormRequestSchema,
    schemaRef: "SearchFormRequest",
    notNullable: true,
    displayName: "Request",
  }),
});

export const defaultSearchFormForm: SearchFormForm =
  defaultValueForFields(SearchFormSchema);

export function toSearchFormForm(v: SearchForm): SearchFormForm {
  return applyDefaultValues(v, SearchFormSchema);
}

export interface AcknowledgeServiceForm {
  acknowledged: boolean;
  contact: MyContactDetailsForm;
}

export const AcknowledgeServiceSchema = buildSchema<AcknowledgeServiceForm>({
  acknowledged: makeScalarField({
    type: FieldType.Bool,
    notNullable: true,
    required: true,
    displayName: "Acknowledged",
  }),
  contact: makeCompoundField({
    children: MyContactDetailsSchema,
    schemaRef: "MyContactDetails",
    notNullable: true,
    displayName: "Contact",
  }),
});

export const defaultAcknowledgeServiceForm: AcknowledgeServiceForm =
  defaultValueForFields(AcknowledgeServiceSchema);

export function toAcknowledgeServiceForm(
  v: AcknowledgeService,
): AcknowledgeServiceForm {
  return applyDefaultValues(v, AcknowledgeServiceSchema);
}

export interface UpgradeOptionForm {
  classification: string;
  vehicleUseType: string;
  grossCombinationMass: number;
  vehicleAxles: number;
  imageUrl: string | null;
  description: string | null;
}

export const UpgradeOptionSchema = buildSchema<UpgradeOptionForm>({
  classification: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Classification",
  }),
  vehicleUseType: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Vehicle Use Type",
  }),
  grossCombinationMass: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Gross Combination Mass",
  }),
  vehicleAxles: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Vehicle Axles",
  }),
  imageUrl: makeScalarField({
    type: FieldType.String,
    displayName: "Image Url",
  }),
  description: makeScalarField({
    type: FieldType.String,
    displayName: "Description",
  }),
});

export const defaultUpgradeOptionForm: UpgradeOptionForm =
  defaultValueForFields(UpgradeOptionSchema);

export function toUpgradeOptionForm(v: UpgradeOption): UpgradeOptionForm {
  return applyDefaultValues(v, UpgradeOptionSchema);
}

export interface TUPDetailForm {
  grossCombinedMass: number;
  currentClassification: string;
  vehicleUseType: string;
  axles: number;
  expiry: string | null;
  upgradeOptions: UpgradeOptionForm[];
}

export const TUPDetailSchema = buildSchema<TUPDetailForm>({
  grossCombinedMass: makeScalarField({
    type: FieldType.Double,
    notNullable: true,
    required: true,
    displayName: "Gross Combined Mass",
  }),
  currentClassification: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Current Classification",
  }),
  vehicleUseType: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Vehicle Use Type",
  }),
  axles: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Axles",
  }),
  expiry: makeScalarField({
    type: FieldType.DateTime,
    displayName: "Expiry",
  }),
  upgradeOptions: makeCompoundField({
    children: UpgradeOptionSchema,
    schemaRef: "UpgradeOption",
    collection: true,
    notNullable: true,
    displayName: "Upgrade Options",
  }),
});

export const defaultTUPDetailForm: TUPDetailForm =
  defaultValueForFields(TUPDetailSchema);

export function toTUPDetailForm(v: TUPDetail): TUPDetailForm {
  return applyDefaultValues(v, TUPDetailSchema);
}

export interface TUPQuoteForm {
  registrationId: number;
  startDate: string | null;
  endDate: string | null;
  fromClassification: string;
  toClassification: string | null;
}

export const TUPQuoteSchema = buildSchema<TUPQuoteForm>({
  registrationId: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Registration Id",
  }),
  startDate: makeScalarField({
    type: FieldType.Date,
    displayName: "Start Date",
  }),
  endDate: makeScalarField({
    type: FieldType.Date,
    displayName: "End Date",
  }),
  fromClassification: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "From Classification",
  }),
  toClassification: makeScalarField({
    type: FieldType.String,
    displayName: "To Classification",
  }),
});

export const defaultTUPQuoteForm: TUPQuoteForm =
  defaultValueForFields(TUPQuoteSchema);

export function toTUPQuoteForm(v: TUPQuote): TUPQuoteForm {
  return applyDefaultValues(v, TUPQuoteSchema);
}

export interface LineItemForm {
  sequenceNumber: number | null;
  feeCode: string;
  description: string;
  amount: number | null;
}

export const LineItemSchema = buildSchema<LineItemForm>({
  sequenceNumber: makeScalarField({
    type: FieldType.Int,
    displayName: "Sequence Number",
  }),
  feeCode: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Fee Code",
  }),
  description: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Description",
  }),
  amount: makeScalarField({
    type: FieldType.Double,
    displayName: "Amount",
  }),
});

export const defaultLineItemForm: LineItemForm =
  defaultValueForFields(LineItemSchema);

export function toLineItemForm(v: LineItem): LineItemForm {
  return applyDefaultValues(v, LineItemSchema);
}

export interface TUPQuoteResponseForm {
  correlationId: string;
  permitFee: number | null;
  permitLineItems: LineItemForm[];
}

export const TUPQuoteResponseSchema = buildSchema<TUPQuoteResponseForm>({
  correlationId: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Correlation Id",
  }),
  permitFee: makeScalarField({
    type: FieldType.Double,
    displayName: "Permit Fee",
  }),
  permitLineItems: makeCompoundField({
    children: LineItemSchema,
    schemaRef: "LineItem",
    collection: true,
    notNullable: true,
    displayName: "Permit Line Items",
  }),
});

export const defaultTUPQuoteResponseForm: TUPQuoteResponseForm =
  defaultValueForFields(TUPQuoteResponseSchema);

export function toTUPQuoteResponseForm(
  v: TUPQuoteResponse,
): TUPQuoteResponseForm {
  return applyDefaultValues(v, TUPQuoteResponseSchema);
}

export interface TUPConfirmationRequestForm {
  paymentReference: string | null;
  paymentAmount: number | null;
  correlationId: string;
  registrationId: number;
  currentFeeCode: string;
  newFeeCode: string;
  combinationAxles: number;
  declaration: boolean | null;
  startDate: string;
  endDate: string;
  paymentReceiptNumber: string;
}

export const TUPConfirmationRequestSchema =
  buildSchema<TUPConfirmationRequestForm>({
    paymentReference: makeScalarField({
      type: FieldType.String,
      displayName: "Payment Reference",
    }),
    paymentAmount: makeScalarField({
      type: FieldType.Double,
      displayName: "Payment Amount",
    }),
    correlationId: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Correlation Id",
    }),
    registrationId: makeScalarField({
      type: FieldType.Int,
      notNullable: true,
      required: true,
      displayName: "Registration Id",
    }),
    currentFeeCode: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Current Fee Code",
    }),
    newFeeCode: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "New Fee Code",
    }),
    combinationAxles: makeScalarField({
      type: FieldType.Int,
      notNullable: true,
      required: true,
      displayName: "Combination Axles",
    }),
    declaration: makeScalarField({
      type: FieldType.Bool,
      displayName: "Declaration",
    }),
    startDate: makeScalarField({
      type: FieldType.DateTime,
      notNullable: true,
      required: true,
      displayName: "Start Date",
    }),
    endDate: makeScalarField({
      type: FieldType.DateTime,
      notNullable: true,
      required: true,
      displayName: "End Date",
    }),
    paymentReceiptNumber: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Payment Receipt Number",
    }),
  });

export const defaultTUPConfirmationRequestForm: TUPConfirmationRequestForm =
  defaultValueForFields(TUPConfirmationRequestSchema);

export function toTUPConfirmationRequestForm(
  v: TUPConfirmationRequest,
): TUPConfirmationRequestForm {
  return applyDefaultValues(v, TUPConfirmationRequestSchema);
}

export interface TUPVehicleDetailForm {
  plateNumber: string;
  make: string;
  model: string;
  description: string;
}

export const TUPVehicleDetailSchema = buildSchema<TUPVehicleDetailForm>({
  plateNumber: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Plate Number",
  }),
  make: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Make",
  }),
  model: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Model",
  }),
  description: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Description",
  }),
});

export const defaultTUPVehicleDetailForm: TUPVehicleDetailForm =
  defaultValueForFields(TUPVehicleDetailSchema);

export function toTUPVehicleDetailForm(
  v: TUPVehicleDetail,
): TUPVehicleDetailForm {
  return applyDefaultValues(v, TUPVehicleDetailSchema);
}

export interface PaymentAvailabilityForm {
  applePay: boolean | null;
  googlePay: boolean | null;
  creditCard: boolean | null;
}

export const PaymentAvailabilitySchema = buildSchema<PaymentAvailabilityForm>({
  applePay: makeScalarField({
    type: FieldType.Bool,
    displayName: "Apple Pay",
  }),
  googlePay: makeScalarField({
    type: FieldType.Bool,
    displayName: "Google Pay",
  }),
  creditCard: makeScalarField({
    type: FieldType.Bool,
    displayName: "Credit Card",
  }),
});

export const defaultPaymentAvailabilityForm: PaymentAvailabilityForm =
  defaultValueForFields(PaymentAvailabilitySchema);

export function toPaymentAvailabilityForm(
  v: PaymentAvailability,
): PaymentAvailabilityForm {
  return applyDefaultValues(v, PaymentAvailabilitySchema);
}

export interface PaymentOptionsForm {
  paymentType: PaymentType | null;
  paymentAvailability: PaymentAvailabilityForm;
}

export const PaymentOptionsSchema = buildSchema<PaymentOptionsForm>({
  paymentType: makeScalarField({
    type: FieldType.String,
    displayName: "Payment Type",
    options: [
      {
        name: "Credit Card (Visa and MasterCard only)",
        value: "CreditCard",
      },
      {
        name: "Google Pay",
        value: "GooglePay",
      },
      {
        name: "Apple Pay",
        value: "ApplePay",
      },
    ],
  }),
  paymentAvailability: makeCompoundField({
    children: PaymentAvailabilitySchema,
    schemaRef: "PaymentAvailability",
    notNullable: true,
    displayName: "Payment Availability",
  }),
});

export const defaultPaymentOptionsForm: PaymentOptionsForm =
  defaultValueForFields(PaymentOptionsSchema);

export function toPaymentOptionsForm(v: PaymentOptions): PaymentOptionsForm {
  return applyDefaultValues(v, PaymentOptionsSchema);
}

export interface MRSTUPVehicleLookupForm {
  clientId: string;
  plateNumber: string;
  vin: string | null;
  chassisNumber: string | null;
}

export const MRSTUPVehicleLookupSchema = buildSchema<MRSTUPVehicleLookupForm>({
  clientId: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Client Id",
  }),
  plateNumber: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Plate Number",
  }),
  vin: makeScalarField({
    type: FieldType.String,
    displayName: "Vin",
  }),
  chassisNumber: makeScalarField({
    type: FieldType.String,
    displayName: "Chassis Number",
  }),
});

export const defaultMRSTUPVehicleLookupForm: MRSTUPVehicleLookupForm =
  defaultValueForFields(MRSTUPVehicleLookupSchema);

export function toMRSTUPVehicleLookupForm(
  v: MRSTUPVehicleLookup,
): MRSTUPVehicleLookupForm {
  return applyDefaultValues(v, MRSTUPVehicleLookupSchema);
}

export interface MRSSTPLookupResponseForm {
  make: string;
  model: string;
  colour: string;
  engineSize: string | null;
  registrationId: number | null;
}

export const MRSSTPLookupResponseSchema = buildSchema<MRSSTPLookupResponseForm>(
  {
    make: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Make",
    }),
    model: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Model",
    }),
    colour: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Colour",
    }),
    engineSize: makeScalarField({
      type: FieldType.String,
      displayName: "Engine Size",
    }),
    registrationId: makeScalarField({
      type: FieldType.Int,
      displayName: "Registration Id",
    }),
  },
);

export const defaultMRSSTPLookupResponseForm: MRSSTPLookupResponseForm =
  defaultValueForFields(MRSSTPLookupResponseSchema);

export function toMRSSTPLookupResponseForm(
  v: MRSSTPLookupResponse,
): MRSSTPLookupResponseForm {
  return applyDefaultValues(v, MRSSTPLookupResponseSchema);
}

export interface MRSRegistrationLookupForm {
  registrationId: number;
  description: string;
}

export const MRSRegistrationLookupSchema =
  buildSchema<MRSRegistrationLookupForm>({
    registrationId: makeScalarField({
      type: FieldType.Int,
      notNullable: true,
      required: true,
      displayName: "Registration Id",
    }),
    description: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Description",
    }),
  });

export const defaultMRSRegistrationLookupForm: MRSRegistrationLookupForm =
  defaultValueForFields(MRSRegistrationLookupSchema);

export function toMRSRegistrationLookupForm(
  v: MRSRegistrationLookup,
): MRSRegistrationLookupForm {
  return applyDefaultValues(v, MRSRegistrationLookupSchema);
}

export interface TUPsFormForm {
  currentPage: number;
  tupDetails: TUPDetailForm;
  toClassification: string;
  tupQuote: TUPQuoteForm;
  tupQuoteResponse: TUPQuoteResponseForm;
  tupConfirmationRequest: TUPConfirmationRequestForm;
  tupVehicleDetails: TUPVehicleDetailForm;
  receiptNumber: string | null;
  paymentOptions: PaymentOptionsForm;
  ownVehicle: boolean | null;
  tupVehicleLookup: MRSTUPVehicleLookupForm;
  tupLookupResponse: MRSSTPLookupResponseForm | null;
  selectedVehicleId: number | null;
  existingVehicles: MRSRegistrationLookupForm[];
}

export const TUPsFormSchema = buildSchema<TUPsFormForm>({
  currentPage: makeScalarField({
    type: FieldType.Int,
    notNullable: true,
    required: true,
    displayName: "Current Page",
  }),
  tupDetails: makeCompoundField({
    children: TUPDetailSchema,
    schemaRef: "TUPDetail",
    notNullable: true,
    displayName: "TUP Details",
  }),
  toClassification: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "To Classification",
    options: [
      {
        name: "SR2",
        value: "SR2",
      },
      {
        name: "SR3",
        value: "SR3",
      },
    ],
  }),
  tupQuote: makeCompoundField({
    children: TUPQuoteSchema,
    schemaRef: "TUPQuote",
    notNullable: true,
    displayName: "Tup Quote",
  }),
  tupQuoteResponse: makeCompoundField({
    children: TUPQuoteResponseSchema,
    schemaRef: "TUPQuoteResponse",
    notNullable: true,
    displayName: "Tup Quote Response",
  }),
  tupConfirmationRequest: makeCompoundField({
    children: TUPConfirmationRequestSchema,
    schemaRef: "TUPConfirmationRequest",
    notNullable: true,
    displayName: "Tup Confirmation Request",
  }),
  tupVehicleDetails: makeCompoundField({
    children: TUPVehicleDetailSchema,
    schemaRef: "TUPVehicleDetail",
    notNullable: true,
    displayName: "Tup Vehicle Details",
  }),
  receiptNumber: makeScalarField({
    type: FieldType.String,
    displayName: "Receipt Number",
  }),
  paymentOptions: makeCompoundField({
    children: PaymentOptionsSchema,
    schemaRef: "PaymentOptions",
    notNullable: true,
    displayName: "Payment Options",
  }),
  ownVehicle: makeScalarField({
    type: FieldType.Bool,
    displayName: "Own Vehicle",
  }),
  tupVehicleLookup: makeCompoundField({
    children: MRSTUPVehicleLookupSchema,
    schemaRef: "MRSTUPVehicleLookup",
    notNullable: true,
    displayName: "TUP Vehicle Lookup",
  }),
  tupLookupResponse: makeCompoundField({
    children: MRSSTPLookupResponseSchema,
    schemaRef: "MRSSTPLookupResponse",
    displayName: "TUP Lookup Response",
  }),
  selectedVehicleId: makeScalarField({
    type: FieldType.Int,
    displayName: "Selected Vehicle Id",
  }),
  existingVehicles: makeCompoundField({
    children: MRSRegistrationLookupSchema,
    schemaRef: "MRSRegistrationLookup",
    collection: true,
    notNullable: true,
    displayName: "Existing Vehicles",
  }),
});

export const defaultTUPsFormForm: TUPsFormForm =
  defaultValueForFields(TUPsFormSchema);

export function toTUPsFormForm(v: TUPsForm): TUPsFormForm {
  return applyDefaultValues(v, TUPsFormSchema);
}

export interface MRSReceiptConfirmationForm {
  receipt: string;
  failure: boolean;
}

export const MRSReceiptConfirmationSchema =
  buildSchema<MRSReceiptConfirmationForm>({
    receipt: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Receipt",
    }),
    failure: makeScalarField({
      type: FieldType.Bool,
      notNullable: true,
      required: true,
      displayName: "Failure",
    }),
  });

export const defaultMRSReceiptConfirmationForm: MRSReceiptConfirmationForm =
  defaultValueForFields(MRSReceiptConfirmationSchema);

export function toMRSReceiptConfirmationForm(
  v: MRSReceiptConfirmation,
): MRSReceiptConfirmationForm {
  return applyDefaultValues(v, MRSReceiptConfirmationSchema);
}

export interface MRSRegistrationSummaryForm {
  id: number;
  status: string;
  plateNumber: string;
  description: string;
  hasDefects: boolean | null;
  renewalAvailable: boolean | null;
  transferAvailable: boolean | null;
  transferPending: boolean | null;
  disposalAvailable: boolean | null;
  disposalPending: boolean | null;
  isVehicleStolen: boolean | null;
  isVehicleStatutoryWriteOff: boolean | null;
  isVehicleRepairableWriteOff: boolean | null;
  bikePlateEligible: boolean | null;
  registrationExpiry: string | null;
  colour: string | null;
  expiresSoon: boolean | null;
}

export const MRSRegistrationSummarySchema =
  buildSchema<MRSRegistrationSummaryForm>({
    id: makeScalarField({
      type: FieldType.Int,
      notNullable: true,
      required: true,
      displayName: "Id",
    }),
    status: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Status",
    }),
    plateNumber: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Plate Number",
    }),
    description: makeScalarField({
      type: FieldType.String,
      notNullable: true,
      required: true,
      displayName: "Description",
    }),
    hasDefects: makeScalarField({
      type: FieldType.Bool,
      displayName: "Has Defects",
    }),
    renewalAvailable: makeScalarField({
      type: FieldType.Bool,
      displayName: "Renewal Available",
    }),
    transferAvailable: makeScalarField({
      type: FieldType.Bool,
      displayName: "Transfer Available",
    }),
    transferPending: makeScalarField({
      type: FieldType.Bool,
      displayName: "Transfer Pending",
    }),
    disposalAvailable: makeScalarField({
      type: FieldType.Bool,
      displayName: "Disposal Available",
    }),
    disposalPending: makeScalarField({
      type: FieldType.Bool,
      displayName: "Disposal Pending",
    }),
    isVehicleStolen: makeScalarField({
      type: FieldType.Bool,
      displayName: "Is Vehicle Stolen",
    }),
    isVehicleStatutoryWriteOff: makeScalarField({
      type: FieldType.Bool,
      displayName: "Is Vehicle Statutory Write Off",
    }),
    isVehicleRepairableWriteOff: makeScalarField({
      type: FieldType.Bool,
      displayName: "Is Vehicle Repairable Write Off",
    }),
    bikePlateEligible: makeScalarField({
      type: FieldType.Bool,
      displayName: "Bike Plate Eligible",
    }),
    registrationExpiry: makeScalarField({
      type: FieldType.DateTime,
      displayName: "Registration Expiry",
    }),
    colour: makeScalarField({
      type: FieldType.String,
      displayName: "Colour",
    }),
    expiresSoon: makeScalarField({
      type: FieldType.Bool,
      displayName: "Expires Soon",
    }),
  });

export const defaultMRSRegistrationSummaryForm: MRSRegistrationSummaryForm =
  defaultValueForFields(MRSRegistrationSummarySchema);

export function toMRSRegistrationSummaryForm(
  v: MRSRegistrationSummary,
): MRSRegistrationSummaryForm {
  return applyDefaultValues(v, MRSRegistrationSummarySchema);
}

export interface MRSTUPAcknowledgeServiceForm {
  acknowledged: boolean;
}

export const MRSTUPAcknowledgeServiceSchema =
  buildSchema<MRSTUPAcknowledgeServiceForm>({
    acknowledged: makeScalarField({
      type: FieldType.Bool,
      notNullable: true,
      required: true,
      displayName: "Acknowledged",
    }),
  });

export const defaultMRSTUPAcknowledgeServiceForm: MRSTUPAcknowledgeServiceForm =
  defaultValueForFields(MRSTUPAcknowledgeServiceSchema);

export function toMRSTUPAcknowledgeServiceForm(
  v: MRSTUPAcknowledgeService,
): MRSTUPAcknowledgeServiceForm {
  return applyDefaultValues(v, MRSTUPAcknowledgeServiceSchema);
}

export interface TUPSummaryForm {
  id: string;
  status: TUPStatus;
  receiptNumber: string | null;
  vehicleDescription: string | null;
  plateNumber: string | null;
  currentClassification: string | null;
  toClassification: string | null;
  startDate: string | null;
  endDate: string | null;
}

export const TUPSummarySchema = buildSchema<TUPSummaryForm>({
  id: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Id",
  }),
  status: makeScalarField({
    type: FieldType.String,
    notNullable: true,
    required: true,
    displayName: "Status",
    options: [
      {
        name: "Draft",
        value: "Draft",
      },
      {
        name: "Submitted",
        value: "Submitted",
      },
    ],
  }),
  receiptNumber: makeScalarField({
    type: FieldType.String,
    displayName: "Receipt Number",
  }),
  vehicleDescription: makeScalarField({
    type: FieldType.String,
    displayName: "Vehicle Description",
  }),
  plateNumber: makeScalarField({
    type: FieldType.String,
    displayName: "Plate Number",
  }),
  currentClassification: makeScalarField({
    type: FieldType.String,
    displayName: "Current Classification",
  }),
  toClassification: makeScalarField({
    type: FieldType.String,
    displayName: "To Classification",
  }),
  startDate: makeScalarField({
    type: FieldType.Date,
    displayName: "Start Date",
  }),
  endDate: makeScalarField({
    type: FieldType.Date,
    displayName: "End Date",
  }),
});

export const defaultTUPSummaryForm: TUPSummaryForm =
  defaultValueForFields(TUPSummarySchema);

export function toTUPSummaryForm(v: TUPSummary): TUPSummaryForm {
  return applyDefaultValues(v, TUPSummarySchema);
}

export const SchemaMap = {
  FireRegistration: FireRegistrationSchema,
  MyContactDetails: MyContactDetailsSchema,
  FireRegistrationEdit: FireRegistrationEditSchema,
  FirePermitSummary: FirePermitSummarySchema,
  DateRange: DateRangeSchema,
  FireDates: FireDatesSchema,
  InitialFireRegistration: InitialFireRegistrationSchema,
  ReceiptConfirmation: ReceiptConfirmationSchema,
  SearchResultCount: SearchResultCountSchema,
  SearchFormRequest: SearchFormRequestSchema,
  SearchForm: SearchFormSchema,
  AcknowledgeService: AcknowledgeServiceSchema,
  UpgradeOption: UpgradeOptionSchema,
  TUPDetail: TUPDetailSchema,
  TUPQuote: TUPQuoteSchema,
  LineItem: LineItemSchema,
  TUPQuoteResponse: TUPQuoteResponseSchema,
  TUPConfirmationRequest: TUPConfirmationRequestSchema,
  TUPVehicleDetail: TUPVehicleDetailSchema,
  PaymentAvailability: PaymentAvailabilitySchema,
  PaymentOptions: PaymentOptionsSchema,
  MRSTUPVehicleLookup: MRSTUPVehicleLookupSchema,
  MRSSTPLookupResponse: MRSSTPLookupResponseSchema,
  MRSRegistrationLookup: MRSRegistrationLookupSchema,
  TUPsForm: TUPsFormSchema,
  MRSReceiptConfirmation: MRSReceiptConfirmationSchema,
  MRSRegistrationSummary: MRSRegistrationSummarySchema,
  MRSTUPAcknowledgeService: MRSTUPAcknowledgeServiceSchema,
  TUPSummary: TUPSummarySchema,
};
