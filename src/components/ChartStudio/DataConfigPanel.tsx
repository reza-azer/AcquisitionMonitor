'use client';

import React from 'react';
import { ChartMetric, ChartDimension } from '@/lib/chart-presets';
import { getMetricDisplayName, getDimensionDisplayName } from '@/lib/chart-utils';
import { Target, Users, Package, Tag, Calendar, Clock } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

interface DataConfigPanelProps {
  metric: ChartMetric;
  dimension: ChartDimension;
  onMetricChange: (metric: ChartMetric) => void;
  onDimensionChange: (dimension: ChartDimension) => void;
}

const METRIC_OPTIONS: { value: ChartMetric; icon: React.ReactNode; description: string }[] = [
  {
    value: 'points',
    icon: <Target className="w-5 h-5" />,
    description: 'Total points earned',
  },
  {
    value: 'quantity',
    icon: <Package className="w-5 h-5" />,
    description: 'Number of acquisitions',
  },
  {
    value: 'attendance_rate',
    icon: <Users className="w-5 h-5" />,
    description: 'Attendance percentage',
  },
  {
    value: 'nominal',
    icon: <Tag className="w-5 h-5" />,
    description: 'Nominal value (IDR)',
  },
];

const DIMENSION_OPTIONS: { value: ChartDimension; icon: React.ReactNode; description: string }[] = [
  {
    value: 'team',
    icon: <Users className="w-5 h-5" />,
    description: 'Group by team',
  },
  {
    value: 'member',
    icon: <Users className="w-5 h-5" />,
    description: 'Group by individual',
  },
  {
    value: 'product',
    icon: <Package className="w-5 h-5" />,
    description: 'Group by product',
  },
  {
    value: 'category',
    icon: <Tag className="w-5 h-5" />,
    description: 'Group by category',
  },
  {
    value: 'week',
    icon: <Clock className="w-5 h-5" />,
    description: 'Group by week',
  },
  {
    value: 'date',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Group by date',
  },
];

export default function DataConfigPanel({
  metric,
  dimension,
  onMetricChange,
  onDimensionChange,
}: DataConfigPanelProps) {
  return (
    <CollapsiblePanel
      title="Data Configuration"
      icon={<Target className="w-5 h-5 text-gray-500" />}
    >
      {/* Metric Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Metric (What to measure)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {METRIC_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => onMetricChange(option.value)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                metric === option.value
                  ? 'border-blue-500 bg-blue-50/60 backdrop-blur-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={
                  metric === option.value
                    ? 'text-blue-600'
                    : 'text-gray-500'
                }>
                  {option.icon}
                </div>
                <span className={`font-medium text-sm ${
                  metric === option.value
                    ? 'text-blue-700'
                    : 'text-gray-700'
                }`}>
                  {getMetricDisplayName(option.value)}
                </span>
              </div>
              <div className="text-xs text-gray-500 ml-7">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dimension Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Dimension (How to group)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DIMENSION_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => onDimensionChange(option.value)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                dimension === option.value
                  ? 'border-green-500 bg-green-50/60 backdrop-blur-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={
                  dimension === option.value
                    ? 'text-green-600'
                    : 'text-gray-500'
                }>
                  {option.icon}
                </div>
                <span className={`font-medium text-sm ${
                  dimension === option.value
                    ? 'text-green-700'
                    : 'text-gray-700'
                }`}>
                  {getDimensionDisplayName(option.value)}
                </span>
              </div>
              <div className="text-xs text-gray-500 ml-7">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
