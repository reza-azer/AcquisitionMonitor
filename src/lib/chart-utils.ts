/**
 * Chart Studio Utility Functions
 */

import { ChartType, ChartMetric, ChartDimension } from './chart-presets';

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format number as Indonesian Rupiah
 */
export function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format number with Indonesian locale
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get chart type display name
 */
export function getChartTypeDisplayName(type: ChartType): string {
  const names: Record<ChartType, string> = {
    bar: 'Diagram Batang',
    line: 'Diagram Garis',
    area: 'Diagram Area',
    pie: 'Diagram Lingkaran',
    donut: 'Diagram Donat',
    combo: 'Diagram Kombinasi',
    horizontal_bar: 'Batang Horizontal',
  };
  return names[type];
}

/**
 * Get metric display name
 */
export function getMetricDisplayName(metric: ChartMetric): string {
  const names: Record<ChartMetric, string> = {
    points: 'Poin',
    quantity: 'Jumlah',
    attendance_rate: 'Tingkat Kehadiran',
    nominal: 'Nominal (IDR)',
  };
  return names[metric];
}

/**
 * Get dimension display name
 */
export function getDimensionDisplayName(dimension: ChartDimension): string {
  const names: Record<ChartDimension, string> = {
    team: 'Menurut Tim',
    member: 'Menurut Anggota',
    product: 'Menurut Produk',
    category: 'Menurut Kategori',
    week: 'Menurut Minggu',
    date: 'Menurut Tanggal',
  };
  return names[dimension];
}

/**
 * Get value formatter based on metric
 */
export function getValueFormatter(metric: ChartMetric) {
  switch (metric) {
    case 'nominal':
      return formatRupiah;
    case 'attendance_rate':
      return (v: number) => formatPercentage(v, 1);
    case 'points':
    case 'quantity':
    default:
      return formatNumber;
  }
}

/**
 * Calculate trend line (simple linear regression)
 */
export function calculateTrendLine(data: number[]): number[] {
  const n = data.length;
  if (n < 2) return data;

  const xSum = ((n - 1) * n) / 2;
  const ySum = data.reduce((a, b) => a + b, 0);
  const xMean = xSum / n;
  const yMean = ySum / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  return data.map((_, i) => slope * i + intercept);
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
      continue;
    }
    const slice = data.slice(i - window + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / window;
    result.push(avg);
  }
  return result;
}

/**
 * Calculate week-over-week growth
 */
export function calculateWoWGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Generate date range array
 */
export function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Get week number from date
 */
export function getWeekFromDate(dateStr: string): number {
  const date = new Date(dateStr);
  const day = date.getDate();
  return Math.min(Math.ceil(day / 7), 4);
}

/**
 * Get start and end dates for a week in current month
 */
export function getWeekDateRange(week: number, year?: number, month?: number): { start: string; end: string } {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth();
  
  const startDay = (week - 1) * 7 + 1;
  const endDay = Math.min(week * 7, new Date(y, m + 1, 0).getDate());
  
  const startDate = new Date(y, m, startDay);
  const endDate = new Date(y, m, endDay);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
}

/**
 * Stack data for stacked bar/area charts
 */
export function stackData(
  data: any[],
  keys: string[]
): Array<{ [key: string]: any }> {
  const stacked = data.map(item => ({ ...item }));
  
  let cumulative = new Array(data.length).fill(0);
  
  for (const key of keys) {
    for (let i = 0; i < data.length; i++) {
      const value = data[i][key] || 0;
      stacked[i][`${key}_start`] = cumulative[i];
      stacked[i][`${key}_end`] = cumulative[i] + value;
      cumulative[i] += value;
    }
  }
  
  return stacked;
}

/**
 * Get color from team accent color or fallback
 */
export function getColorForTeam(
  teamName: string,
  accentColor?: string,
  index?: number
): string {
  if (accentColor) return accentColor;
  
  const defaultColors = ['#003d79', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#db2777'];
  
  if (index !== undefined) {
    return defaultColors[index % defaultColors.length];
  }
  
  // Hash team name for consistent color
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return defaultColors[Math.abs(hash) % defaultColors.length];
}

/**
 * Get color for product category
 */
export function getColorForCategory(category: string): string {
  const colors: Record<string, string> = {
    FUNDING: '#2563eb',
    TRANSACTION: '#16a34a',
    CREDIT: '#dc2626',
  };
  return colors[category] || '#6b7280';
}

/**
 * Get color for a value based on scheme
 */
export function getColorForValue(
  scheme: string,
  value: string | number,
  index?: number
): string {
  const colors: Record<string, string[]> = {
    team: ['#003d79', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#db2777'],
    category: ['#2563eb', '#16a34a', '#dc2626'],
    ranking: ['#fbbf24', '#94a3b8', '#b45309', '#64748b', '#78350f'],
    status: ['#22c55e', '#eab308', '#ef4444', '#6b7280'],
    product: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16'],
    gradient: ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'],
  };
  
  const schemeColors = colors[scheme] || colors.team;
  
  if (index !== undefined) {
    return schemeColors[index % schemeColors.length];
  }
  
  // Hash string to get consistent color
  if (typeof value === 'string') {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    return schemeColors[Math.abs(hash) % schemeColors.length];
  }
  
  return schemeColors[0];
}

/**
 * Export chart data as CSV
 */
export function exportDataAsCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/**
 * Download chart as PNG
 */
export async function downloadChartAsPNG(
  svgElement: SVGSVGElement | null,
  filename: string
): Promise<void> {
  if (!svgElement) return;
  
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Get SVG dimensions
  const svgRect = svgElement.getBoundingClientRect();
  const width = svgRect.width * 2; // 2x for better resolution
  const height = svgRect.height * 2;
  
  canvas.width = width;
  canvas.height = height;
  
  if (!ctx) return;
  
  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  img.onload = () => {
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    
    canvas.toBlob(blob => {
      if (blob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
      }
    }, 'image/png');
  };
  
  img.src = url;
}

/**
 * Validate chart configuration
 */
export function validateChartConfig(config: {
  chartType?: ChartType;
  metric?: ChartMetric;
  dimension?: ChartDimension;
}): string[] {
  const errors: string[] = [];
  
  const validChartTypes: ChartType[] = ['bar', 'line', 'area', 'pie', 'donut', 'combo', 'horizontal_bar'];
  const validMetrics: ChartMetric[] = ['points', 'quantity', 'attendance_rate', 'nominal'];
  const validDimensions: ChartDimension[] = ['team', 'member', 'product', 'category', 'week', 'date'];
  
  if (config.chartType && !validChartTypes.includes(config.chartType)) {
    errors.push(`Invalid chart type: ${config.chartType}`);
  }
  
  if (config.metric && !validMetrics.includes(config.metric)) {
    errors.push(`Invalid metric: ${config.metric}`);
  }
  
  if (config.dimension && !validDimensions.includes(config.dimension)) {
    errors.push(`Invalid dimension: ${config.dimension}`);
  }
  
  return errors;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== null && typeof source[key] === 'object' && key in target) {
      result[key] = deepMerge(result[key], source[key] as any);
    } else {
      result[key] = source[key] as any;
    }
  }

  return result;
}
