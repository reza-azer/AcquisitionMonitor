/**
 * Format number with thousand separators (dots)
 * Example: 100000 → "100.000"
 */
export function formatNumber(value: number): string {
  if (value === 0) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Parse formatted string back to number
 * Example: "100.000" → 100000
 */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
}

/**
 * Format large numbers in compact format
 * - < 1.000: show as is (e.g., "500")
 * - < 1.000.000: show with dots (e.g., "100.000")
 * - < 1.000.000.000: show in jt (e.g., "1.5jt")
 * - >= 1.000.000.000: show in M (e.g., "100M")
 */
export function formatCompact(value: number): string {
  if (value === 0) return '0';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000000) {
    // Billions → M (Miliar)
    const result = value / 1000000000;
    return `${Number.isInteger(result) ? result : result.toFixed(1)}M`;
  }
  
  if (absValue >= 1000000) {
    // Millions → jt (juta)
    const result = value / 1000000;
    return `${Number.isInteger(result) ? result : result.toFixed(1)}jt`;
  }
  
  // Below million: format with thousand separators
  return new Intl.NumberFormat('id-ID').format(value);
}
