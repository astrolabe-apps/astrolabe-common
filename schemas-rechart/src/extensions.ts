import {
  buildSchema,
  CustomRenderOptions,
  ControlDefinitionExtension,
  boolField,
  stringField,
  intField,
  stringOptionsField,
} from "@react-typed-forms/schemas";
import { RechartsOptions, ChartType } from "./types";

export const RechartsDefinition: CustomRenderOptions = {
  name: "Recharts",
  value: "Recharts",
  fields: buildSchema<RechartsOptions>({
    chartType: stringOptionsField(
      "Chart Type",
      { name: "Line", value: ChartType.Line },
      { name: "Bar", value: ChartType.Bar },
      { name: "Area", value: ChartType.Area },
      { name: "Pie", value: ChartType.Pie },
      { name: "Doughnut", value: ChartType.Doughnut },
      { name: "Scatter", value: ChartType.Scatter },
      { name: "Radar", value: ChartType.Radar },
      { name: "Composed", value: ChartType.Composed }
    ),
    width: intField("Width"),
    height: intField("Height"),
    showLegend: boolField("Show Legend"),
    showGrid: boolField("Show Grid"),
    primaryColor: stringField("Primary Color"),
    secondaryColor: stringField("Secondary Color"),
    xAxisLabel: stringField("X-Axis Label"),
    yAxisLabel: stringField("Y-Axis Label"),
    animationDuration: intField("Animation Duration (ms)"),
  }),
};

export const RechartsExtension: ControlDefinitionExtension = {
  RenderOptions: RechartsDefinition,
};
