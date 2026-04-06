'use client';

import React from 'react';
import { ChartType, COLOR_SCHEMES } from '@/lib/chart-presets';
import { Palette, Type, AlignLeft, Grid3X3 } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

interface StyleConfigPanelProps {
  styles: Record<string, any>;
  chartType: ChartType;
  onChange: (key: string, value: any) => void;
}

export default function StyleConfigPanel({
  styles,
  chartType,
  onChange,
}: StyleConfigPanelProps) {
  const isPieChart = chartType === 'pie' || chartType === 'donut';

  return (
    <CollapsiblePanel
      title="Style Options"
      icon={<Palette className="w-5 h-5 text-gray-500" />}
    >
      <div className="space-y-6">
        {/* Color Scheme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Color Scheme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(COLOR_SCHEMES).map(([name, colors]) => (
              <button
                key={name}
                onClick={() => onChange('colorScheme', name)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  styles.colorScheme === name
                    ? 'border-purple-500 bg-purple-50/60 backdrop-blur-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex gap-1 mb-1">
                  {colors.slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-600 capitalize">
                  {name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Data Labels */}
        {!isPieChart && (
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Show Data Labels
                </span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={styles.showLabels}
                  onChange={(e) => onChange('showLabels', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </div>
            </label>
          </div>
        )}

        {/* Legend */}
        <div>
          <label className="flex items-center justify-between cursor-pointer mb-3">
            <div className="flex items-center gap-2">
              <AlignLeft className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Show Legend
              </span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={styles.showLegend}
                onChange={(e) => onChange('showLegend', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
          </label>

          {styles.showLegend && (
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-2">
                Legend Position
              </label>
              <div className="flex gap-2">
                {['top', 'bottom', 'left', 'right'].map(pos => (
                  <button
                    key={pos}
                    onClick={() => onChange('legendPosition', pos)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      styles.legendPosition === pos
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/40 backdrop-blur-sm text-gray-700 hover:bg-white/60'
                    }`}
                  >
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gridlines */}
        {!isPieChart && (
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Show Gridlines
                </span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={styles.showGridlines}
                  onChange={(e) => onChange('showGridlines', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </div>
            </label>
          </div>
        )}

        {/* Pie/Donut specific options */}
        {isPieChart && (
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                Show Percentages
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={styles.showPercentage}
                  onChange={(e) => onChange('showPercentage', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </div>
            </label>
          </div>
        )}

        {/* For Donut chart - inner radius */}
        {chartType === 'donut' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inner Radius
            </label>
            <input
              type="range"
              min="30"
              max="80"
              value={styles.innerRadius || 60}
              onChange={(e) => onChange('innerRadius', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-xs text-gray-500 mt-1">
              {styles.innerRadius || 60}%
            </div>
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}
