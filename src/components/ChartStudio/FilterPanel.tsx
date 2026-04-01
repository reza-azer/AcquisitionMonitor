'use client';

import React, { useState, useEffect } from 'react';
import { Filter, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterPanelProps {
  filters: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

interface Team {
  id: string;
  name: string;
  accent_color: string;
}

interface Product {
  product_key: string;
  product_name: string;
  category: string;
}

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch teams and products
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [teamsRes, productsRes] = await Promise.all([
          fetch('/api/teams'),
          fetch('/api/products'),
        ]);
        
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData);
        }
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.filter((p: any) => p.is_active));
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = ['FUNDING', 'TRANSACTION', 'CREDIT'];

  const handleWeekToggle = (week: number) => {
    const currentWeeks = filters.weeks || [];
    const newWeeks = currentWeeks.includes(week)
      ? currentWeeks.filter((w: number) => w !== week)
      : [...currentWeeks, week];
    onChange('weeks', newWeeks);
  };

  const handleTeamToggle = (teamId: string) => {
    const currentTeams = filters.teams || [];
    const newTeams = currentTeams.includes(teamId)
      ? currentTeams.filter((t: string) => t !== teamId)
      : [...currentTeams, teamId];
    onChange('teams', newTeams);
  };

  const handleProductToggle = (productKey: string) => {
    const currentProducts = filters.products || [];
    const newProducts = currentProducts.includes(productKey)
      ? currentProducts.filter((p: string) => p !== productKey)
      : [...currentProducts, productKey];
    onChange('products', newProducts);
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c: string) => c !== category)
      : [...currentCategories, category];
    onChange('categories', newCategories);
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const newDateRange = { ...filters.dateRange, [field]: value };
    onChange('dateRange', newDateRange);
  };

  const selectAllWeeks = () => onChange('weeks', [1, 2, 3, 4]);
  const clearAllWeeks = () => onChange('weeks', []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-6">
          {/* Week Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Weeks
              </label>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={selectAllWeeks}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllWeeks}
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(week => (
                <button
                  key={week}
                  onClick={() => handleWeekToggle(week)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    (filters.weeks || []).includes(week)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Week {week}
                </button>
              ))}
            </div>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Teams
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {loading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
              ) : (
                teams.map(team => (
                  <label
                    key={team.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg -m-2"
                  >
                    <input
                      type="checkbox"
                      checked={(filters.teams || []).includes(team.id)}
                      onChange={() => handleTeamToggle(team.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.accent_color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{team.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    (filters.categories || []).includes(category)
                      ? getCategoryColor(category)
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Products
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {loading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
              ) : (
                products.map((product: Product) => (
                  <label
                    key={product.product_key}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg -m-2"
                  >
                    <input
                      type="checkbox"
                      checked={(filters.products || []).includes(product.product_key)}
                      onChange={() => handleProductToggle(product.product_key)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm px-2 py-0.5 rounded ${getCategoryBadgeColor(product.category)}`}>
                      {product.category}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{product.product_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Date Range
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Start</span>
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">End</span>
              </div>
            </div>
          </div>

          {/* Clear All Filters */}
          <button
            onClick={() => {
              onChange('teams', []);
              onChange('members', []);
              onChange('products', []);
              onChange('categories', []);
              onChange('weeks', [1, 2, 3, 4]);
              onChange('dateRange', { start: null, end: null });
            }}
            className="w-full py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'FUNDING':
      return 'bg-blue-600 text-white';
    case 'TRANSACTION':
      return 'bg-green-600 text-white';
    case 'CREDIT':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
}

function getCategoryBadgeColor(category: string): string {
  switch (category) {
    case 'FUNDING':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    case 'TRANSACTION':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'CREDIT':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200';
  }
}
