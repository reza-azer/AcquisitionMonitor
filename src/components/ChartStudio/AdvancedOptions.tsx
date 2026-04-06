'use client';

import React from 'react';
import { TrendingUp, Target, ArrowLeftRight, Activity } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

interface AdvancedOptionsProps {
  advanced: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export default function AdvancedOptions({ advanced, onChange }: AdvancedOptionsProps) {
  return (
    <CollapsiblePanel
      title="Advanced Analytics"
      icon={<Activity className="w-5 h-5 text-gray-500" />}
    >
      <div className="space-y-4">
        {/* Show Target Line */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-white/40 backdrop-blur-sm cursor-pointer hover:bg-white/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Target className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Garis Target
              </div>
              <div className="text-xs text-gray-500">
                Tampilkan perbandingan target mingguan
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </div>
        </label>

        {/* Show Trend Line */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-white/40 backdrop-blur-sm cursor-pointer hover:bg-white/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Garis Tren
              </div>
              <div className="text-xs text-gray-500">
                Overlay regresi linear
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
        </label>

        {/* Show Moving Average */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-white/40 backdrop-blur-sm cursor-pointer hover:bg-white/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Rata-rata Bergerak
              </div>
              <div className="text-xs text-gray-500">
                Rata-rata bergerak 3 periode
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </div>
        </label>

        {/* Show Comparison (WoW) */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-white/40 backdrop-blur-sm cursor-pointer hover:bg-white/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowLeftRight className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Perbandingan Minggu-ke-Minggu
              </div>
              <div className="text-xs text-gray-500">
                Tampilkan persentase pertumbuhan
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
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </div>
        </label>

        {/* Target Value Input */}
        {advanced.showTarget && (
          <div className="pt-3 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nilai Target Kustom (opsional)
            </label>
            <input
              type="number"
              value={advanced.targetValue || ''}
              onChange={(e) => onChange('targetValue', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Kosongkan untuk target otomatis"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/60 backdrop-blur-sm text-gray-900 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Jika tidak diatur, target akan dihitung dari target mingguan produk
            </p>
          </div>
        )}

        {/* Moving Average Window */}
        {advanced.showMovingAverage && (
          <div className="pt-3 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periode Rata-rata Bergerak
            </label>
            <div className="flex gap-2">
              {[3, 5, 7].map(period => (
                <button
                  key={period}
                  onClick={() => onChange('movingAveragePeriod', period)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    advanced.movingAveragePeriod === period
                      ? 'bg-green-600 text-white'
                      : 'bg-white/40 backdrop-blur-sm text-gray-700 hover:bg-white/60'
                  }`}
                >
                  {period} periode
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsiblePanel>
  );
}
