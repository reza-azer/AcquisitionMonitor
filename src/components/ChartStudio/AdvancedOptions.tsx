'use client';

import React from 'react';
import { TrendingUp, Target, ArrowLeftRight, Activity } from 'lucide-react';

interface AdvancedOptionsProps {
  advanced: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export default function AdvancedOptions({ advanced, onChange }: AdvancedOptionsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Analytics</h3>
      </div>

      <div className="space-y-4">
        {/* Show Target Line */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Target className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Target Line
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Show weekly target comparison
              </div>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={advanced.showTarget}
              onChange={(e) => onChange('showTarget', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-red-600"></div>
          </div>
        </div>

        {/* Show Trend Line */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Trend Line
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Linear regression overlay
              </div>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={advanced.showTrendLine}
              onChange={(e) => onChange('showTrendLine', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600"></div>
          </div>
        </div>

        {/* Show Moving Average */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Moving Average
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                3-period moving average
              </div>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={advanced.showMovingAverage}
              onChange={(e) => onChange('showMovingAverage', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-green-600"></div>
          </div>
        </div>

        {/* Show Comparison (WoW) */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ArrowLeftRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Week-over-Week Comparison
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Show growth percentages
              </div>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={advanced.showComparison}
              onChange={(e) => onChange('showComparison', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-purple-600"></div>
          </div>
        </div>

        {/* Target Value Input */}
        {advanced.showTarget && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Target Value (optional)
            </label>
            <input
              type="number"
              value={advanced.targetValue || ''}
              onChange={(e) => onChange('targetValue', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Leave empty for auto-calculated target"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If not set, target will be calculated from product weekly targets
            </p>
          </div>
        )}

        {/* Moving Average Window */}
        {advanced.showMovingAverage && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Moving Average Period
            </label>
            <div className="flex gap-2">
              {[3, 5, 7].map(period => (
                <button
                  key={period}
                  onClick={() => onChange('movingAveragePeriod', period)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    advanced.movingAveragePeriod === period
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {period} periods
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
