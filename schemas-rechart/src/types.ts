// Chart data structure
export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// Chart types enum
export enum ChartType {
  Line = "Line",
  Bar = "Bar",
  Area = "Area",
  Pie = "Pie",
  Doughnut = "Doughnut",
  Scatter = "Scatter",
  Radar = "Radar",
  Composed = "Composed",
}

// Configuration options for the chart renderer
export interface RechartsOptions {
  chartType?: ChartType;
  width?: number;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  animationDuration?: number;
}
