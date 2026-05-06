'use client';

import React from 'react';
import { ChartType } from '@/lib/chart-presets';
import { getChartTypeDisplayName } from '@/lib/chart-utils';
import { BarChart3, TrendingUp, PieChart, Layers } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

interface ChartTypeSelectorProps {
  chartType: ChartType;
  onChange: (chartType: ChartType) => void;
}

const CHART_OPTIONS: { type: ChartType; icon: React.ReactNode; description: string }[] = [
  {
    type: 'bar',
    icon: <BarChart3 className="w-6 h-6" />,
    description: 'Bandingkan nilai antar kategori',
  },
  {
    type: 'line',
    icon: <TrendingUp className="w-6 h-6" />,
    description: 'Tampilkan tren sepanjang waktu',
  },
  {
    type: 'area',
    icon: <Layers className="w-6 h-6" />,
    description: 'Tampilkan tren kumulatif',
  },
  {
    type: 'pie',
    icon: <PieChart className="w-6 h-6" />,
    description: 'Tampilkan komposisi persentase',
  },
  {
    type: 'donut',
    icon: <PieChart className="w-6 h-6" />,
    description: 'Varian diagram lingkaran modern',
  },
  {
    type: 'combo',
    icon: <BarChart3 className="w-6 h-6" />,
    description: 'Gabungkan beberapa jenis grafik',
  },
  {
    type: 'horizontal_bar',
    icon: <BarChart3 className="w-6 h-6" />,
    description: 'Perbandingan batang horizontal',
  },
];

export default function ChartTypeSelector({ chartType, onChange }: ChartTypeSelectorProps) {
  return (
    <CollapsiblePanel
      title="Chart Type"
      icon={<BarChart3 className="w-5 h-5 text-gray-500" />}
    >
      <div className="grid grid-cols-2 gap-3">
        {CHART_OPTIONS.map(option => (
          <button
            key={option.type}
            onClick={() => onChange(option.type)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              chartType === option.type
                ? 'border-purple-500 bg-purple-50/60 backdrop-blur-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`mb-2 ${
              chartType === option.type
                ? 'text-purple-600'
                : 'text-gray-500'
            }`}>
              {option.icon}
            </div>
            <div className={`font-medium text-sm ${
              chartType === option.type
                ? 'text-purple-700'
                : 'text-gray-700'
            }`}>
              {getChartTypeDisplayName(option.type)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {option.description}
            </div>
          </button>
        ))}
      </div>
    </CollapsiblePanel>
  );
}
