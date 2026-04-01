'use client';

import React, { useRef } from 'react';
import { ChartType, ChartMetric } from '@/lib/chart-presets';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { getValueFormatter, getColorForValue, getColorForCategory, calculateTrendLine, calculateMovingAverage } from '@/lib/chart-utils';

interface ChartPreviewProps {
  chartType: ChartType;
  metric: ChartMetric;
  dimension: string;
  data: any[];
  groupedData?: any[];
  styles: Record<string, any>;
  advanced: Record<string, any>;
}

export default function ChartPreview({
  chartType,
  metric,
  dimension,
  data,
  groupedData,
  styles,
  advanced,
}: ChartPreviewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const formatter = getValueFormatter(metric);
  const isHorizontal = chartType === 'horizontal_bar';

  // Get colors for data
  const getColors = (dataKey: string, index: number) => {
    const scheme = styles.colorScheme || 'team';
    
    if (scheme === 'category') {
      return getColorForCategory(dataKey);
    }
    
    return getColorForValue(scheme, dataKey, index);
  };

  // Calculate trend line data
  const trendLineData = advanced.showTrendLine && data.length > 1
    ? calculateTrendLine(data.map(d => d.value))
    : [];

  // Calculate moving average data
  const maPeriod = advanced.movingAveragePeriod || 3;
  const movingAvgData = advanced.showMovingAverage && data.length > maPeriod
    ? calculateMovingAverage(data.map(d => d.value), maPeriod)
    : [];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="text-gray-600 dark:text-gray-300">{entry.name}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatter(entry.value)}
              </span>
            </div>
          ))}
          {advanced.showComparison && payload[0]?.payload?.growth !== undefined && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className={`text-sm font-medium ${
                payload[0].payload.growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {payload[0].payload.growth >= 0 ? '↑' : '↓'} {Math.abs(payload[0].payload.growth).toFixed(1)}% vs previous
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 60 },
    };

    const gridProps = styles.showGridlines ? {
      grid: <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />,
    } : {};

    const legendProps = styles.showLegend ? {
      legend: <Legend 
        verticalAlign={styles.legendPosition || 'bottom'}
        align="center"
        wrapperStyle={{ 
          paddingTop: '20px',
          fontSize: '12px',
        }}
      />,
    } : {};

    switch (chartType) {
      case 'bar':
      case 'horizontal_bar':
        return (
          <BarChart {...commonProps} layout={isHorizontal ? 'vertical' : 'horizontal'}>
            {gridProps.grid}
            <XAxis 
              dataKey={isHorizontal ? 'value' : dimension === 'date' ? 'name' : 'name'}
              tick={{ fontSize: 12 }}
              angle={isHorizontal ? 0 : -45}
              textAnchor={isHorizontal ? 'middle' : 'end'}
              height={isHorizontal ? undefined : 80}
              width={isHorizontal ? 100 : undefined}
              tickFormatter={metric === 'nominal' ? (v: number) => `${(v / 1000000).toFixed(0)}M` : undefined}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={metric === 'nominal' ? (v: number) => `${(v / 1000000).toFixed(0)}M` : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            {legendProps.legend}
            {advanced.showTarget && (
              <ReferenceLine
                y={advanced.targetValue || data.reduce((sum, d) => sum + d.target, 0) / data.length}
                stroke="#dc2626"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{ value: 'Target', fill: '#dc2626', fontSize: 12 }}
              />
            )}
            <Bar
              dataKey="value"
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
              label={styles.showLabels ? {
                position: 'top',
                content: (props: any) => {
                  const { x, y, value } = props;
                  return (
                    <text x={x} y={y - 5} textAnchor="middle" fontSize="11" fill="#6b7280">
                      {formatter(value)}
                    </text>
                  );
                },
              } : undefined}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColors(entry.name, index)} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {gridProps.grid}
            <XAxis 
              dataKey={dimension === 'date' ? 'name' : 'name'}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={metric === 'nominal' ? (v: number) => `${(v / 1000000).toFixed(0)}M` : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            {legendProps.legend}
            {advanced.showTarget && (
              <ReferenceLine
                y={advanced.targetValue || data.reduce((sum, d) => sum + d.target, 0) / data.length}
                stroke="#dc2626"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{ value: 'Target', fill: '#dc2626', fontSize: 12 }}
              />
            )}
            <Line
              type={advanced.smooth ? 'monotone' : 'linear'}
              dataKey="value"
              stroke="#8884d8"
              strokeWidth={3}
              dot={advanced.showPoints ? { r: 6 } : false}
              activeDot={{ r: 8 }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} stroke={getColors(entry.name, index)} />
              ))}
            </Line>
            {advanced.showTrendLine && trendLineData.length > 0 && (
              <Line
                type="linear"
                data={data.map((d, i) => ({ ...d, trend: trendLineData[i] }))}
                dataKey="trend"
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gridProps.grid}
            <XAxis 
              dataKey={dimension === 'date' ? 'name' : 'name'}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={metric === 'nominal' ? (v: number) => `${(v / 1000000).toFixed(0)}M` : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            {legendProps.legend}
            {advanced.showTarget && (
              <ReferenceLine
                y={advanced.targetValue || data.reduce((sum, d) => sum + d.target, 0) / data.length}
                stroke="#dc2626"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{ value: 'Target', fill: '#dc2626', fontSize: 12 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              fillOpacity={styles.fillOpacity || 0.7}
              label={styles.showLabels ? {
                content: (props: any) => {
                  const { x, y, value } = props;
                  return (
                    <text x={x} y={y - 5} textAnchor="middle" fontSize="11" fill="#6b7280">
                      {formatter(value)}
                    </text>
                  );
                },
              } : undefined}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColors(entry.name, index)} />
              ))}
            </Area>
          </AreaChart>
        );

      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'donut' ? (styles.innerRadius || 60) : 0}
              outerRadius={chartType === 'donut' ? 100 : 120}
              paddingAngle={2}
              label={styles.showLabels ? {
                position: 'outside',
                content: (props: any) => {
                  const { cx, cy, innerRadius, outerRadius, value, name, percent, midAngle } = props;
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 24;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  const text = styles.showPercentage 
                    ? `${name}: ${(percent * 100).toFixed(1)}%`
                    : `${name}: ${formatter(value)}`;
                  return (
                    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11" fill="#6b7280">
                      {text}
                    </text>
                  );
                },
              } : false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColors(entry.name, index)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {legendProps.legend}
          </PieChart>
        );

      case 'combo':
        return (
          <BarChart {...commonProps}>
            {gridProps.grid}
            <XAxis 
              dataKey={dimension === 'date' ? 'name' : 'name'}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            {legendProps.legend}
            <Bar
              yAxisId="left"
              dataKey="value"
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
              label={styles.showLabels ? {
                content: (props: any) => {
                  const { x, y, value } = props;
                  return (
                    <text x={x} y={y - 5} textAnchor="middle" fontSize="11" fill="#6b7280">
                      {formatter(value)}
                    </text>
                  );
                },
              } : undefined}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColors(entry.name, index)} />
              ))}
            </Bar>
            {advanced.showTarget && (
              <Line
                yAxisId="right"
                data={data.map(d => ({ ...d, targetValue: d.target || advanced.targetValue }))}
                dataKey="targetValue"
                stroke="#dc2626"
                strokeWidth={3}
                dot={false}
              />
            )}
          </BarChart>
        );

      default:
        return null;
    }
  };

  // Get chart title
  const getChartTitle = () => {
    const metricNames: Record<ChartMetric, string> = {
      points: 'Points',
      quantity: 'Quantity',
      attendance_rate: 'Attendance Rate',
      nominal: 'Nominal',
    };

    const dimensionNames: Record<string, string> = {
      team: 'by Team',
      member: 'by Member',
      product: 'by Product',
      category: 'by Category',
      week: 'by Week',
      date: 'by Date',
    };

    return `${metricNames[metric]} ${dimensionNames[dimension]}`;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          {getChartTitle()}
        </h4>
        {advanced.showComparison && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Growth rates shown vs previous period
          </p>
        )}
      </div>

      <div className="h-[400px]" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatter(data.reduce((sum, d) => sum + d.value, 0))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatter(data.reduce((sum, d) => sum + d.value, 0) / data.length)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Highest</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatter(Math.max(...data.map(d => d.value)))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Lowest</div>
          <div className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatter(Math.min(...data.map(d => d.value)))}
          </div>
        </div>
      </div>
    </div>
  );
}
