'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Clock, User, Globe, Lock } from 'lucide-react';

interface SavedChart {
  id: string;
  name: string;
  description?: string;
  chart_type: string;
  metric: string;
  dimension: string;
  user_name?: string;
  is_public: boolean;
  is_template: boolean;
  updated_at: string;
}

interface SavedChartsProps {
  onLoadConfig: (config: any) => void;
  onClose: () => void;
}

export default function SavedCharts({ onLoadConfig, onClose }: SavedChartsProps) {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'my' | 'templates' | 'public'>('all');

  useEffect(() => {
    fetchCharts();
  }, [filter]);

  const fetchCharts = async () => {
    setLoading(true);
    try {
      let url = '/api/chart-config';
      const params = new URLSearchParams();

      if (filter === 'my') {
        // In a real app, this would use authenticated user
        params.append('is_public', 'false');
      } else if (filter === 'templates') {
        params.append('is_template', 'true');
      } else if (filter === 'public') {
        params.append('is_public', 'true');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCharts(Array.isArray(data) ? data : [data]);
      }
    } catch (error) {
      console.error('Error fetching saved charts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = (chart: SavedChart) => {
    fetch(`/api/chart-config?id=${chart.id}`)
      .then(res => res.json())
      .then(data => {
        onLoadConfig(data);
      })
      .catch(error => {
        console.error('Error loading chart config:', error);
      });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chart configuration?')) return;

    try {
      const response = await fetch(`/api/chart-config?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCharts();
      } else {
        alert('Failed to delete chart configuration');
      }
    } catch (error) {
      console.error('Error deleting chart:', error);
    }
  };

  const getChartTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      bar: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      line: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      area: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      pie: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      donut: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
      combo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
      horizontal_bar: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    };
    return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter Tabs */}
      <div className="flex gap-2 p-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { value: 'all', label: 'All Charts' },
          { value: 'templates', label: 'Templates' },
          { value: 'my', label: 'My Charts' },
          { value: 'public', label: 'Public' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : charts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No saved charts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {charts.map(chart => (
              <div
                key={chart.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-colors bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {chart.name}
                      </h4>
                      {chart.is_template && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                          Template
                        </span>
                      )}
                      {chart.is_public && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                          Public
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getChartTypeBadgeColor(chart.chart_type)}`}>
                        {chart.chart_type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {chart.metric} / {chart.dimension}
                      </span>
                    </div>

                    {chart.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {chart.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {chart.user_name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{chart.user_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(chart.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoad(chart)}
                      className="px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    >
                      Load
                    </button>
                    {!chart.is_template && (
                      <button
                        onClick={() => handleDelete(chart.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
