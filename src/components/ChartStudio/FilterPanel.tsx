'use client';

import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import CollapsiblePanel from './CollapsiblePanel';

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper function to safely check if value is an array and includes an item
  const arrayIncludes = (value: any, item: any): boolean => {
    return Array.isArray(value) && value.includes(item);
  };

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
          const teamsResponse = await teamsRes.json();
          setTeams(teamsResponse.data || []);
        }

        if (productsRes.ok) {
          const productsResponse = await productsRes.json();
          setProducts(productsResponse.data?.filter((p: any) => p.is_active) || []);
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
    const currentWeeks = Array.isArray(filters.weeks) ? filters.weeks : [];
    const newWeeks = currentWeeks.includes(week)
      ? currentWeeks.filter((w: number) => w !== week)
      : [...currentWeeks, week];
    onChange('weeks', newWeeks);
  };

  const handleTeamToggle = (teamId: string) => {
    const currentTeams = Array.isArray(filters.teams) ? filters.teams : [];
    const newTeams = currentTeams.includes(teamId)
      ? currentTeams.filter((t: string) => t !== teamId)
      : [...currentTeams, teamId];
    onChange('teams', newTeams);
  };

  const handleProductToggle = (productKey: string) => {
    const currentProducts = Array.isArray(filters.products) ? filters.products : [];
    const newProducts = currentProducts.includes(productKey)
      ? currentProducts.filter((p: string) => p !== productKey)
      : [...currentProducts, productKey];
    onChange('products', newProducts);
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = Array.isArray(filters.categories) ? filters.categories : [];
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
    <CollapsiblePanel
      title="Filters"
      icon={<Filter className="w-5 h-5 text-gray-500" />}
      defaultExpanded={true}
    >
      <div className="space-y-6">
        {/* Week Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Weeks
            </label>
            <div className="flex gap-2 text-xs">
              <button
                onClick={selectAllWeeks}
                className="text-blue-600 hover:underline"
              >
                Select All
              </button>
              <button
                onClick={clearAllWeeks}
                className="text-red-600 hover:underline"
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
                  arrayIncludes(filters.weeks, week)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/40 backdrop-blur-sm text-gray-700 hover:bg-white/60'
                }`}
              >
                Week {week}
              </button>
            ))}
          </div>
        </div>

        {/* Team Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Teams
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              teams.map(team => (
                <label
                  key={team.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-white/40 p-2 rounded-lg -m-2"
                >
                  <input
                    type="checkbox"
                    checked={arrayIncludes(filters.teams, team.id)}
                    onChange={() => handleTeamToggle(team.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: team.accent_color }}
                  />
                  <span className="text-sm text-gray-700">{team.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  arrayIncludes(filters.categories, category)
                    ? getCategoryColor(category)
                    : 'bg-white/40 backdrop-blur-sm text-gray-700 hover:bg-white/60'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Products
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              products.map((product: Product) => (
                <label
                  key={product.product_key}
                  className="flex items-center gap-3 cursor-pointer hover:bg-white/40 p-2 rounded-lg -m-2"
                >
                  <input
                    type="checkbox"
                    checked={arrayIncludes(filters.products, product.product_key)}
                    onChange={() => handleProductToggle(product.product_key)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm px-2 py-0.5 rounded ${getCategoryBadgeColor(product.category)}`}>
                    {product.category}
                  </span>
                  <span className="text-sm text-gray-700">{product.product_name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Date Range
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/60 backdrop-blur-sm text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-500">Start</span>
            </div>
            <div className="flex-1">
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/60 backdrop-blur-sm text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-500">End</span>
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
          className="w-full py-2 text-sm text-red-600 hover:bg-red-50/50 rounded-lg transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </CollapsiblePanel>
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
      return 'bg-blue-100 text-blue-700';
    case 'TRANSACTION':
      return 'bg-green-100 text-green-700';
    case 'CREDIT':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
