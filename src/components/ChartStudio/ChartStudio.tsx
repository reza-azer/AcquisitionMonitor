'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChartType, ChartMetric, ChartDimension, CHART_PRESETS, ChartPreset } from '@/lib/chart-presets';
import { deepMerge } from '@/lib/chart-utils';
import ChartTypeSelector from './ChartTypeSelector';
import DataConfigPanel from './DataConfigPanel';
import FilterPanel from './FilterPanel';
import StyleConfigPanel from './StyleConfigPanel';
import AdvancedOptions from './AdvancedOptions';
import ChartPreview from './ChartPreview';
import ExportMenu from './ExportMenu';
import SavedCharts from './SavedCharts';
import { Loader2, Save, RotateCcw, Sparkles, BarChart3, X } from 'lucide-react';

interface ChartConfig {
  chartType: ChartType;
  metric: ChartMetric;
  dimension: ChartDimension;
  filters: Record<string, any>;
  styles: Record<string, any>;
  advanced: Record<string, any>;
  groupBy?: string;
  sortBy?: 'asc' | 'desc';
  limit?: number;
}

interface ChartStudioProps {
  onSaveConfig?: (config: any) => void;
}

const DEFAULT_CONFIG: ChartConfig = {
  chartType: 'bar',
  metric: 'points',
  dimension: 'team',
  filters: {
    teams: [],
    members: [],
    products: [],
    categories: [],
    weeks: [1, 2, 3, 4],
    dateRange: { start: null, end: null },
  },
  styles: {
    colorScheme: 'team',
    showLabels: true,
    showLegend: true,
    legendPosition: 'bottom',
    showGridlines: true,
  },
  advanced: {
    showTarget: false,
    showTrendLine: false,
    showMovingAverage: false,
    showComparison: false,
  },
  sortBy: 'desc',
};

export default function ChartStudio({ onSaveConfig }: ChartStudioProps) {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [chartName, setChartName] = useState('');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedCharts, setShowSavedCharts] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Fetch chart data when config changes
  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/analytics/chart-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chartType: config.chartType,
            metric: config.metric,
            dimension: config.dimension,
            filters: config.filters,
            groupBy: config.groupBy,
            sortBy: config.sortBy,
            limit: config.limit,
            showTarget: config.advanced.showTarget,
            showComparison: config.advanced.showComparison,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }

        const data = await response.json();
        setChartData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchChartData, 300);
    return () => clearTimeout(debounceTimer);
  }, [config]);

  // Apply preset configuration
  const applyPreset = useCallback((preset: ChartPreset) => {
    setConfig({
      chartType: preset.chartType,
      metric: preset.metric,
      dimension: preset.dimension,
      filters: deepMerge(DEFAULT_CONFIG.filters, preset.filters),
      styles: deepMerge(DEFAULT_CONFIG.styles, preset.styles),
      advanced: deepMerge(DEFAULT_CONFIG.advanced, preset.config),
      groupBy: preset.config.groupBy,
      sortBy: preset.config.sortBy,
      limit: preset.config.limit,
    });
    setChartName(preset.name);
    setShowPresets(false);
  }, []);

  // Reset to default config
  const handleReset = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setChartName('');
  }, []);

  // Save chart configuration
  const handleSave = useCallback(async () => {
    if (!chartName.trim()) {
      setError('Please enter a chart name');
      return;
    }

    const configToSave = {
      name: chartName,
      chart_type: config.chartType,
      metric: config.metric,
      dimension: config.dimension,
      config: config.advanced,
      filters: config.filters,
      styles: config.styles,
    };

    try {
      const response = await fetch('/api/chart-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      alert('Chart configuration saved successfully!');
      setChartName('');
      onSaveConfig?.(configToSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }, [chartName, config, onSaveConfig]);

  // Load saved configuration
  const loadConfig = useCallback((savedConfig: any) => {
    setConfig({
      chartType: savedConfig.chart_type,
      metric: savedConfig.metric,
      dimension: savedConfig.dimension,
      filters: savedConfig.filters || DEFAULT_CONFIG.filters,
      styles: savedConfig.styles || DEFAULT_CONFIG.styles,
      advanced: savedConfig.config || DEFAULT_CONFIG.advanced,
      groupBy: savedConfig.config?.groupBy,
      sortBy: savedConfig.config?.sortBy,
      limit: savedConfig.config?.limit,
    });
    setChartName(savedConfig.name);
    setShowSavedCharts(false);
  }, []);

  // Update specific config values
  const updateConfig = useCallback(<K extends keyof ChartConfig>(
    key: K,
    value: ChartConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }));
  }, []);

  const updateStyles = useCallback((key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      styles: { ...prev.styles, [key]: value },
    }));
  }, []);

  const updateAdvanced = useCallback((key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      advanced: { ...prev.advanced, [key]: value },
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chart Studio</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Build custom charts to visualize your data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSavedCharts(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/60 backdrop-blur-lg border border-white/20 rounded-lg hover:bg-white/80 transition-all"
          >
            Saved Charts
          </button>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100/60 backdrop-blur-lg border border-purple-200/50 rounded-lg hover:bg-purple-200/60 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Templates
          </button>
        </div>
      </div>

      {/* Presets Panel */}
      {showPresets && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Start Templates</h3>
            <button
              onClick={() => setShowPresets(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CHART_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="text-left p-4 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 backdrop-blur-sm transition-all"
              >
                <h4 className="font-semibold text-gray-900">{preset.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{preset.description}</p>
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="px-2 py-1 bg-gray-100/80 rounded">{preset.chartType}</span>
                  <span className="px-2 py-1 bg-gray-100/80 rounded">{preset.metric}</span>
                  <span className="px-2 py-1 bg-gray-100/80 rounded">{preset.dimension}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart Name Input */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={chartName}
          onChange={(e) => setChartName(e.target.value)}
          placeholder="Enter chart name..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white/60 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={handleSave}
          disabled={!chartName.trim() || loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-white/60 backdrop-blur-lg border border-white/20 text-gray-700 rounded-lg hover:bg-white/80 transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panels */}
        <div className="lg:col-span-1 space-y-6">
          <ChartTypeSelector
            chartType={config.chartType}
            onChange={(chartType) => updateConfig('chartType', chartType)}
          />

          <DataConfigPanel
            metric={config.metric}
            dimension={config.dimension}
            onMetricChange={(metric) => updateConfig('metric', metric)}
            onDimensionChange={(dimension) => updateConfig('dimension', dimension)}
          />

          <FilterPanel
            filters={config.filters}
            onChange={updateFilters}
          />

          <StyleConfigPanel
            styles={config.styles}
            chartType={config.chartType}
            onChange={updateStyles}
          />

          <AdvancedOptions
            advanced={config.advanced}
            onChange={updateAdvanced}
          />
        </div>

        {/* Chart Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              {loading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {chartData && (
              <>
                <ChartPreview
                  chartType={config.chartType}
                  metric={config.metric}
                  dimension={config.dimension}
                  data={chartData.chartData}
                  groupedData={chartData.groupedData}
                  styles={config.styles}
                  advanced={config.advanced}
                />

                <ExportMenu
                  chartData={chartData.chartData}
                  chartName={chartName || 'Untitled Chart'}
                />
              </>
            )}

            {!loading && !chartData && !error && (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Configure your chart to see preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Charts Modal */}
      {showSavedCharts && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Saved Charts</h3>
              <button
                onClick={() => setShowSavedCharts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <SavedCharts
              onLoadConfig={loadConfig}
              onClose={() => setShowSavedCharts(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
