import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';

interface ChartData {
  [key: string]: any;
}

interface DataVisualizationProps {
  type: 'line' | 'area' | 'bar' | 'pie';
  data: ChartData[];
  title?: string;
  xAxisKey?: string;
  dataKey?: string;
  height?: number;
  color?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  type,
  data,
  title,
  xAxisKey = 'name',
  dataKey = 'value',
  height = 300,
  color,
  colors,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
}) => {
  const theme = useTheme();
  
  const defaultColor = color || theme.palette.primary.main;
  const defaultColors = colors || [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const renderChart = () => {
    const commonProps = {
      data,
      height,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={defaultColor}
              strokeWidth={2}
              dot={{ fill: defaultColor, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={defaultColor}
              fill={defaultColor}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} fill={defaultColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              fill={defaultColor}
              dataKey={dataKey}
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={defaultColors[index % defaultColors.length]}
                />
              ))}
            </Pie>
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {title && (
        <Typography variant="h6" gutterBottom textAlign="center">
          {title}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart() || <Box />}
      </ResponsiveContainer>
    </Box>
  );
};

export default DataVisualization;
