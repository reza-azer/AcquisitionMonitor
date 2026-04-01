/**
 * Pre-built Chart Templates for Chart Studio
 * These templates provide quick-start configurations for common analytics scenarios
 */

export interface ChartPreset {
  id: string;
  name: string;
  description: string;
  chartType: ChartType;
  metric: ChartMetric;
  dimension: ChartDimension;
  config: Record<string, any>;
  filters: Record<string, any>;
  styles: Record<string, any>;
}

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'combo' | 'horizontal_bar';
export type ChartMetric = 'points' | 'quantity' | 'attendance_rate' | 'nominal';
export type ChartDimension = 'team' | 'member' | 'product' | 'category' | 'week' | 'date';

export const CHART_PRESETS: ChartPreset[] = [
  {
    id: 'team-performance-overview',
    name: 'Team Performance Overview',
    description: 'Compare total points by team across weeks',
    chartType: 'bar',
    metric: 'points',
    dimension: 'team',
    config: {
      groupBy: 'week',
      stacked: false,
      showTarget: true,
      barSize: 40,
    },
    filters: {
      weeks: [1, 2, 3, 4],
    },
    styles: {
      colorScheme: 'team',
      showLabels: true,
      showLegend: true,
      legendPosition: 'bottom',
      showGridlines: true,
    },
  },
  {
    id: 'weekly-trend-analysis',
    name: 'Weekly Trend Analysis',
    description: 'Track points progression over weeks',
    chartType: 'line',
    metric: 'points',
    dimension: 'week',
    config: {
      showPoints: true,
      smooth: true,
      showTarget: false,
      lineStrokeWidth: 3,
    },
    filters: {
      teams: [],
    },
    styles: {
      colorScheme: 'team',
      showLabels: false,
      showLegend: true,
      legendPosition: 'top',
      showGridlines: true,
    },
  },
  {
    id: 'product-mix-analysis',
    name: 'Product Mix Analysis',
    description: 'See product composition percentage',
    chartType: 'donut',
    metric: 'quantity',
    dimension: 'product',
    config: {
      showPercentage: true,
      innerRadius: 60,
      outerRadius: 100,
    },
    filters: {
      categories: [],
    },
    styles: {
      colorScheme: 'category',
      showLabels: true,
      showLegend: true,
      legendPosition: 'right',
    },
  },
  {
    id: 'target-vs-actual',
    name: 'Target vs Actual',
    description: 'Compare actual performance against targets',
    chartType: 'combo',
    metric: 'points',
    dimension: 'team',
    config: {
      primaryType: 'bar',
      secondaryType: 'line',
      showTarget: true,
      targetLineColor: '#dc2626',
      targetLineStrokeWidth: 3,
    },
    filters: {
      weeks: [1, 2, 3, 4],
    },
    styles: {
      colorScheme: 'team',
      showLabels: true,
      showLegend: true,
      legendPosition: 'bottom',
      showGridlines: true,
    },
  },
  {
    id: 'member-leaderboard',
    name: 'Member Leaderboard',
    description: 'Top 10 members by total points',
    chartType: 'horizontal_bar',
    metric: 'points',
    dimension: 'member',
    config: {
      limit: 10,
      sortBy: 'desc',
      barSize: 24,
    },
    filters: {
      teams: [],
    },
    styles: {
      colorScheme: 'ranking',
      showLabels: true,
      showLegend: false,
    },
  },
  {
    id: 'category-performance',
    name: 'Category Performance Breakdown',
    description: 'FUNDING, TRANSACTION, CREDIT breakdown by team',
    chartType: 'bar',
    metric: 'quantity',
    dimension: 'category',
    config: {
      groupBy: 'team',
      stacked: true,
      showPercentage: false,
    },
    filters: {
      weeks: [1, 2, 3, 4],
    },
    styles: {
      colorScheme: 'category',
      showLabels: true,
      showLegend: true,
      legendPosition: 'right',
      showGridlines: true,
    },
  },
  {
    id: 'daily-momentum',
    name: 'Daily Momentum',
    description: 'Cumulative daily points per team',
    chartType: 'area',
    metric: 'points',
    dimension: 'date',
    config: {
      stacked: true,
      fillOpacity: 0.7,
      showTarget: false,
    },
    filters: {
      dateRange: {
        start: null,
        end: null,
      },
    },
    styles: {
      colorScheme: 'team',
      showLabels: false,
      showLegend: true,
      legendPosition: 'top',
      showGridlines: true,
    },
  },
  {
    id: 'attendance-rate-by-team',
    name: 'Attendance Rate by Team',
    description: 'Compare attendance rates across teams',
    chartType: 'bar',
    metric: 'attendance_rate',
    dimension: 'team',
    config: {
      showAverage: true,
      showTarget: true,
      targetValue: 85,
      barSize: 40,
    },
    filters: {
      weeks: [1, 2, 3, 4],
    },
    styles: {
      colorScheme: 'team',
      showLabels: true,
      showLegend: false,
      showGridlines: true,
      targetLine: 0.85,
    },
  },
  {
    id: 'nominal-by-product-credit',
    name: 'Credit Product Nominal Analysis',
    description: 'Total nominal value by CREDIT products',
    chartType: 'bar',
    metric: 'nominal',
    dimension: 'product',
    config: {
      sortBy: 'desc',
      showTarget: true,
      valueFormatter: 'currency_idr',
    },
    filters: {
      categories: ['CREDIT'],
    },
    styles: {
      colorScheme: 'product',
      showLabels: true,
      showLegend: false,
      showGridlines: true,
    },
  },
  {
    id: 'team-weekly-comparison',
    name: 'Team Weekly Comparison',
    description: 'Side-by-side team performance per week',
    chartType: 'line',
    metric: 'points',
    dimension: 'week',
    config: {
      groupBy: 'team',
      showPoints: true,
      smooth: false,
      showTarget: false,
    },
    filters: {
      teams: [],
    },
    styles: {
      colorScheme: 'team',
      showLabels: false,
      showLegend: true,
      legendPosition: 'top',
      showGridlines: true,
    },
  },
  {
    id: 'product-target-achievement',
    name: 'Product Target Achievement',
    description: 'Progress toward weekly targets by product',
    chartType: 'horizontal_bar',
    metric: 'quantity',
    dimension: 'product',
    config: {
      showTarget: true,
      showPercentage: true,
      sortBy: 'desc',
    },
    filters: {},
    styles: {
      colorScheme: 'category',
      showLabels: true,
      showLegend: false,
      showGridlines: true,
    },
  },
  {
    id: 'attendance-distribution',
    name: 'Attendance Distribution',
    description: 'Distribution of attendance statuses',
    chartType: 'pie',
    metric: 'attendance_rate',
    dimension: 'category',
    config: {
      showPercentage: true,
      showTotal: true,
    },
    filters: {},
    styles: {
      colorScheme: 'status',
      showLabels: true,
      showLegend: true,
      legendPosition: 'right',
    },
  },
];

/**
 * Get a preset by ID
 */
export function getChartPreset(id: string): ChartPreset | undefined {
  return CHART_PRESETS.find(preset => preset.id === id);
}

/**
 * Get presets by chart type
 */
export function getPresetsByChartType(chartType: ChartType): ChartPreset[] {
  return CHART_PRESETS.filter(preset => preset.chartType === chartType);
}

/**
 * Get presets by metric
 */
export function getPresetsByMetric(metric: ChartMetric): ChartPreset[] {
  return CHART_PRESETS.filter(preset => preset.metric === metric);
}

/**
 * Get presets by dimension
 */
export function getPresetsByDimension(dimension: ChartDimension): ChartPreset[] {
  return CHART_PRESETS.filter(preset => preset.dimension === dimension);
}

/**
 * Search presets by name or description
 */
export function searchPresets(query: string): ChartPreset[] {
  const lowerQuery = query.toLowerCase();
  return CHART_PRESETS.filter(
    preset =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Color schemes for charts
 */
export const COLOR_SCHEMES: Record<string, string[]> = {
  team: ['#003d79', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#db2777'],
  category: ['#2563eb', '#16a34a', '#dc2626'], // FUNDING, TRANSACTION, CREDIT
  ranking: ['#fbbf24', '#94a3b8', '#b45309', '#64748b', '#78350f'], // Gold, Silver, Bronze, etc.
  status: ['#22c55e', '#eab308', '#ef4444', '#6b7280'], // Present, Late, Leave, Alpha
  product: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16'],
  gradient: ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'],
};

/**
 * Get color for a value based on scheme
 */
export function getColorForValue(
  scheme: string,
  value: string | number,
  index?: number
): string {
  const colors = COLOR_SCHEMES[scheme] || COLOR_SCHEMES.team;
  
  if (index !== undefined) {
    return colors[index % colors.length];
  }
  
  // Hash string to get consistent color
  if (typeof value === 'string') {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
  
  return colors[0];
}
