# Recharts Form Control Implementation Plan

## Overview
Create a new `schemas-rechart` package to provide a chart form control using Recharts library. This will be a display renderer (read-only) that visualizes data from form state.

## Requirements Summary
- **Chart Types**: All Recharts types with dropdown selector (Line, Bar, Area, Pie, Scatter, Radar, Composed)
- **Data Source**: Bound form data field
- **Renderer Type**: Display renderer (read-only)
- **Configuration**: Moderate (chart type, colors, legend, dimensions)
- **Data Format**: Structured format with labels and datasets:
  ```typescript
  {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color?: string;
    }>;
  }
  ```

## Implementation Steps

### 1. Create Package Structure
Create new package: `/home/doolse/astrolabe/astrolabe-common/schemas-rechart/`

**Directory structure:**
```
schemas-rechart/
├── src/
│   ├── index.tsx
│   ├── extensions.ts
│   ├── RechartsRenderer.tsx
│   └── types.ts
├── package.json
├── tsconfig.json
├── .babelrc
├── .gitignore
└── .npmignore
```

### 2. Create package.json
Base on `astrolabe-schemas-datagrid/package.json` with these modifications:

```json
{
  "name": "@astroapps/schemas-rechart",
  "version": "0.0.1",
  "description": "Recharts renderer for @react-typed-forms/schemas",
  "type": "module",
  "main": "lib/index.cjs",
  "module": "lib/index.js",
  "types": "lib/index.d.ts",
  "exports": {
    "types": "./lib/index.d.ts",
    "require": "./lib/index.cjs",
    "default": "./lib/index.js"
  },
  "author": "Astrolabe Enterprises",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/astrolabe-apps/astrolabe-common/issues"
  },
  "homepage": "https://github.com/astrolabe-apps/astrolabe-common#readme",
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "prepack": "npm run build",
    "build": "rimraf ./lib/ node_modules/.cache && microbundle -f modern,cjs --no-compress --jsx React.createElement --jsxFragment React.Fragment",
    "watch": "microbundle -f modern,cjs --no-compress --jsx React.createElement --jsxFragment React.Fragment"
  },
  "dependencies": {
    "clsx": "^2",
    "recharts": "^2.12.0"
  },
  "peerDependencies": {
    "react": "^18.2.0 || ^19",
    "@react-typed-forms/core": "^4.0.0",
    "@react-typed-forms/schemas": "^16.0.0"
  },
  "devDependencies": {
    "react": "^18.2.0",
    "@react-typed-forms/core": "^4.4.0",
    "@react-typed-forms/schemas": "^16.0.0",
    "@react-typed-forms/transform": "^0.2.0",
    "@babel/core": "^7.23.7",
    "@babel/cli": "^7.23.4",
    "@babel/preset-env": "^7.23.8",
    "@babel/preset-react": "^7.23.3",
    "@babel/preset-typescript": "^7.23.3",
    "microbundle": "^0.15.1",
    "rimraf": "^5.0.5",
    "typescript": "^5.6.2",
    "@types/react": "^18.2.37",
    "prettier": "^3.0.3"
  }
}
```

### 3. Create Configuration Files

**`.babelrc`:**
```json
{
  "plugins": [
    "module:@react-typed-forms/transform"
  ],
  "presets": [
    "@babel/preset-typescript",
    [
      "@babel/preset-react",
      {
        "runtime": "automatic",
        "useSpread": true,
        "useBuiltIns": true
      }
    ]
  ]
}
```

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "declaration": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "outDir": "lib"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "lib"]
}
```

**`.gitignore`:**
```
node_modules/
*.tsbuildinfo
client.build.log
lib/*
```

**`.npmignore`:**
```
src/
.rush/
*.log
.babelrc
```

### 4. Define TypeScript Interfaces

**`src/types.ts`:**
```typescript
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
```

### 5. Create Extension Definition

**`src/extensions.ts`:**
```typescript
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
```

### 6. Implement Recharts Renderer

**`src/RechartsRenderer.tsx`:**
```typescript
import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  createDisplayRenderer,
  DisplayRendererProps,
  DisplayDataType,
} from "@react-typed-forms/schemas";
import { ChartData, ChartType, RechartsOptions } from "./types";

// Default colors for datasets
const DEFAULT_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
  "#a4de6c",
];

// Transform data to Recharts format
function transformData(chartData: ChartData) {
  const { labels, datasets } = chartData;

  return labels.map((label, index) => {
    const dataPoint: any = { name: label };
    datasets.forEach((dataset) => {
      dataPoint[dataset.label] = dataset.data[index] ?? 0;
    });
    return dataPoint;
  });
}

// Get color for dataset
function getDatasetColor(dataset: any, index: number, options: RechartsOptions) {
  if (dataset.color) return dataset.color;
  if (index === 0 && options.primaryColor) return options.primaryColor;
  if (index === 1 && options.secondaryColor) return options.secondaryColor;
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

export function createRechartsRenderer() {
  return createDisplayRenderer(
    (props: DisplayRendererProps) => {
      const { data, renderOptions } = props;
      const chartData = data as ChartData;
      const options = (renderOptions ?? {}) as RechartsOptions;

      // Set defaults
      const chartType = options.chartType ?? ChartType.Line;
      const width = options.width ?? 600;
      const height = options.height ?? 400;
      const showLegend = options.showLegend ?? true;
      const showGrid = options.showGrid ?? true;
      const animationDuration = options.animationDuration ?? 300;

      // Validate data
      if (!chartData || !chartData.labels || !chartData.datasets) {
        return <div className="text-red-500">Invalid chart data</div>;
      }

      if (chartData.datasets.length === 0) {
        return <div className="text-gray-500">No data to display</div>;
      }

      const transformedData = transformData(chartData);

      // Common chart props
      const commonProps = {
        width,
        height,
        data: transformedData,
      };

      // Render appropriate chart type
      switch (chartType) {
        case ChartType.Line:
          return (
            <ResponsiveContainer width={width} height={height}>
              <LineChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey="name" label={options.xAxisLabel} />
                <YAxis label={options.yAxisLabel} />
                <Tooltip />
                {showLegend && <Legend />}
                {chartData.datasets.map((dataset, i) => (
                  <Line
                    key={dataset.label}
                    type="monotone"
                    dataKey={dataset.label}
                    stroke={getDatasetColor(dataset, i, options)}
                    animationDuration={animationDuration}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );

        case ChartType.Bar:
          return (
            <ResponsiveContainer width={width} height={height}>
              <BarChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey="name" label={options.xAxisLabel} />
                <YAxis label={options.yAxisLabel} />
                <Tooltip />
                {showLegend && <Legend />}
                {chartData.datasets.map((dataset, i) => (
                  <Bar
                    key={dataset.label}
                    dataKey={dataset.label}
                    fill={getDatasetColor(dataset, i, options)}
                    animationDuration={animationDuration}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );

        case ChartType.Area:
          return (
            <ResponsiveContainer width={width} height={height}>
              <AreaChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey="name" label={options.xAxisLabel} />
                <YAxis label={options.yAxisLabel} />
                <Tooltip />
                {showLegend && <Legend />}
                {chartData.datasets.map((dataset, i) => (
                  <Area
                    key={dataset.label}
                    type="monotone"
                    dataKey={dataset.label}
                    stroke={getDatasetColor(dataset, i, options)}
                    fill={getDatasetColor(dataset, i, options)}
                    animationDuration={animationDuration}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );

        case ChartType.Pie:
        case ChartType.Doughnut:
          // For pie charts, use first dataset only
          const pieData = chartData.labels.map((label, i) => ({
            name: label,
            value: chartData.datasets[0]?.data[i] ?? 0,
          }));
          return (
            <ResponsiveContainer width={width} height={height}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={chartType === ChartType.Doughnut ? "40%" : 0}
                  outerRadius="80%"
                  animationDuration={animationDuration}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                {showLegend && <Legend />}
              </PieChart>
            </ResponsiveContainer>
          );

        case ChartType.Scatter:
          return (
            <ResponsiveContainer width={width} height={height}>
              <ScatterChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey="name" label={options.xAxisLabel} />
                <YAxis label={options.yAxisLabel} />
                <Tooltip />
                {showLegend && <Legend />}
                {chartData.datasets.map((dataset, i) => (
                  <Scatter
                    key={dataset.label}
                    name={dataset.label}
                    dataKey={dataset.label}
                    fill={getDatasetColor(dataset, i, options)}
                    animationDuration={animationDuration}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          );

        case ChartType.Radar:
          return (
            <ResponsiveContainer width={width} height={height}>
              <RadarChart {...commonProps}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis />
                <Tooltip />
                {showLegend && <Legend />}
                {chartData.datasets.map((dataset, i) => (
                  <Radar
                    key={dataset.label}
                    name={dataset.label}
                    dataKey={dataset.label}
                    stroke={getDatasetColor(dataset, i, options)}
                    fill={getDatasetColor(dataset, i, options)}
                    fillOpacity={0.6}
                    animationDuration={animationDuration}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          );

        case ChartType.Composed:
          return (
            <ResponsiveContainer width={width} height={height}>
              <ComposedChart {...commonProps}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey="name" label={options.xAxisLabel} />
                <YAxis label={options.yAxisLabel} />
                <Tooltip />
                {showLegend && <Legend />}
                {chartData.datasets.map((dataset, i) => {
                  // Alternate between Bar, Line, and Area
                  const Component = i % 3 === 0 ? Bar : i % 3 === 1 ? Line : Area;
                  return (
                    <Component
                      key={dataset.label}
                      dataKey={dataset.label}
                      fill={getDatasetColor(dataset, i, options)}
                      stroke={getDatasetColor(dataset, i, options)}
                      animationDuration={animationDuration}
                    />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          );

        default:
          return <div className="text-red-500">Unknown chart type</div>;
      }
    },
    {
      renderType: RechartsDefinition.value,
    }
  );
}

export const RechartsRenderer = createRechartsRenderer();
```

### 7. Create Index Export

**`src/index.tsx`:**
```typescript
export * from "./types";
export * from "./extensions";
export * from "./RechartsRenderer";
```

### 8. Register Package in rush.json

Add to `/home/doolse/astrolabe/astrolabe-common/Astrolabe.TestTemplate/rush.json` in the `projects` array:

```json
{
  "packageName": "@astroapps/schemas-rechart",
  "projectFolder": "../schemas-rechart",
  "shouldPublish": true
}
```

Insert after the `schemas-datagrid` entry (around line 539).

### 9. Install and Build

```bash
# Navigate to Rush workspace
cd /home/doolse/astrolabe/astrolabe-common/Astrolabe.TestTemplate

# Update dependencies
rush update

# Build the new package
rush build --to @astroapps/schemas-rechart
```

## Usage Example

Once implemented, the chart control can be used in forms like this:

```typescript
import { RechartsExtension, RechartsRenderer, ChartType } from "@astroapps/schemas-rechart";

// Register the extension
const formRenderer = createStdRenderer(
  defaults,
  options,
  RechartsRenderer,
  ...otherRenderers
);

// Use in form schema
const chartField = {
  type: "display",
  renderType: "Recharts",
  renderOptions: {
    chartType: ChartType.Bar,
    width: 800,
    height: 400,
    showLegend: true,
    showGrid: true,
    primaryColor: "#3b82f6",
  },
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Sales",
        data: [65, 59, 80, 81, 56],
        color: "#3b82f6",
      },
      {
        label: "Revenue",
        data: [28, 48, 40, 19, 86],
        color: "#10b981",
      },
    ],
  },
};
```

## Testing Considerations

1. **Test with empty data** - Should show "No data to display"
2. **Test with invalid data** - Should show error message
3. **Test each chart type** - Verify all 8 chart types render correctly
4. **Test configuration options** - Colors, legend, grid, dimensions
5. **Test responsive behavior** - Charts should resize appropriately
6. **Test multiple datasets** - Verify colors cycle correctly
7. **Test single dataset** - Especially for Pie/Doughnut charts

## Future Enhancements

1. **Interactive features** - Click handlers, drill-down
2. **Data refresh** - Auto-update when form data changes
3. **Export functionality** - Save chart as image
4. **More configuration options** - Stacking, custom tooltips, etc.
5. **Data renderer version** - Allow editing data points on the chart
6. **Theme support** - Light/dark mode
7. **Custom color palettes** - Predefined color schemes
8. **Accessibility** - Better ARIA labels and keyboard navigation