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
  createDataRenderer,
  DataRendererProps,
  RenderOptions,
  mergeObjects,
} from "@react-typed-forms/schemas";
import { ChartData, ChartType, RechartsOptions } from "./types";
import { RechartsDefinition } from "./extensions";

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

export function createRechartsRenderer(defaultOptions?: RechartsOptions) {
  return createDataRenderer(
    (props: DataRendererProps) => {
      const { control, renderOptions } = props;
      const chartData = control.value as ChartData;
      const options = mergeObjects(
        renderOptions as RechartsOptions & RenderOptions,
        defaultOptions
      ) ?? {};

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
                  const color = getDatasetColor(dataset, i, options);
                  if (i % 3 === 0) {
                    return (
                      <Bar
                        key={dataset.label}
                        dataKey={dataset.label}
                        fill={color}
                        animationDuration={animationDuration}
                      />
                    );
                  } else if (i % 3 === 1) {
                    return (
                      <Line
                        key={dataset.label}
                        dataKey={dataset.label}
                        stroke={color}
                        animationDuration={animationDuration}
                      />
                    );
                  } else {
                    return (
                      <Area
                        key={dataset.label}
                        dataKey={dataset.label}
                        stroke={color}
                        fill={color}
                        animationDuration={animationDuration}
                      />
                    );
                  }
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
