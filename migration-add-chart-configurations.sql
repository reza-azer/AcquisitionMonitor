-- Migration: Add chart_configurations table for Chart Studio feature
-- Created: 2026-04-01

-- Create chart_configurations table
CREATE TABLE IF NOT EXISTS chart_configurations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_name VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  chart_type VARCHAR(50) NOT NULL CHECK (chart_type IN ('bar', 'line', 'area', 'pie', 'donut', 'combo', 'horizontal_bar')),
  metric VARCHAR(50) NOT NULL CHECK (metric IN ('points', 'quantity', 'attendance_rate', 'nominal')),
  dimension VARCHAR(50) NOT NULL CHECK (dimension IN ('team', 'member', 'product', 'category', 'week', 'date')),
  config JSONB NOT NULL,
  filters JSONB DEFAULT '{}',
  styles JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chart_config_user ON chart_configurations(user_name);
CREATE INDEX IF NOT EXISTS idx_chart_config_type ON chart_configurations(chart_type);
CREATE INDEX IF NOT EXISTS idx_chart_config_public ON chart_configurations(is_public);
CREATE INDEX IF NOT EXISTS idx_chart_config_template ON chart_configurations(is_template);

-- Enable Row Level Security
ALTER TABLE chart_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust for production with proper auth)
CREATE POLICY "Allow full access to chart_configurations" 
ON chart_configurations FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create policy for public read access to shared charts
CREATE POLICY "Allow public read access to shared charts" 
ON chart_configurations FOR SELECT 
USING (is_public = true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_chart_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chart_config_timestamp
BEFORE UPDATE ON chart_configurations
FOR EACH ROW
EXECUTE FUNCTION update_chart_config_updated_at();

-- Insert default chart templates
INSERT INTO chart_configurations (name, description, chart_type, metric, dimension, config, filters, styles, is_public, is_template) VALUES
-- Template 1: Team Performance Overview
('Team Performance Overview', 'Compare total points by team across weeks', 'bar', 'points', 'team', 
 '{"groupBy": "week", "stacked": false, "showTarget": true}'::jsonb,
 '{"weeks": [1, 2, 3, 4]}'::jsonb,
 '{"colorScheme": "team", "showLabels": true, "showLegend": true, "legendPosition": "bottom"}'::jsonb,
 true, true),

-- Template 2: Weekly Trend Analysis
('Weekly Trend Analysis', 'Track points progression over weeks', 'line', 'points', 'week',
 '{"showPoints": true, "smooth": true, "showTarget": false}'::jsonb,
 '{"teams": []}'::jsonb,
 '{"colorScheme": "team", "showLabels": false, "showLegend": true, "legendPosition": "top"}'::jsonb,
 true, true),

-- Template 3: Product Mix Analysis
('Product Mix Analysis', 'See product composition percentage', 'donut', 'quantity', 'product',
 '{"showPercentage": true, "innerRadius": 60}'::jsonb,
 '{"categories": []}'::jsonb,
 '{"colorScheme": "category", "showLabels": true, "showLegend": true, "legendPosition": "right"}'::jsonb,
 true, true),

-- Template 4: Target vs Actual
('Target vs Actual', 'Compare actual performance against targets', 'combo', 'points', 'team',
 '{"primaryType": "bar", "secondaryType": "line", "showTarget": true}'::jsonb,
 '{"weeks": [1, 2, 3, 4]}'::jsonb,
 '{"colorScheme": "team", "showLabels": true, "showLegend": true, "legendPosition": "bottom"}'::jsonb,
 true, true),

-- Template 5: Member Leaderboard
('Member Leaderboard', 'Top 10 members by total points', 'horizontal_bar', 'points', 'member',
 '{"limit": 10, "sortBy": "desc"}'::jsonb,
 '{"teams": []}'::jsonb,
 '{"colorScheme": "ranking", "showLabels": true, "showLegend": false}'::jsonb,
 true, true),

-- Template 6: Category Performance
('Category Performance Breakdown', 'FUNDING, TRANSACTION, CREDIT breakdown by team', 'bar', 'quantity', 'category',
 '{"groupBy": "team", "stacked": true, "showPercentage": false}'::jsonb,
 '{"weeks": [1, 2, 3, 4]}'::jsonb,
 '{"colorScheme": "category", "showLabels": true, "showLegend": true, "legendPosition": "right"}'::jsonb,
 true, true),

-- Template 7: Daily Momentum
('Daily Momentum', 'Cumulative daily points per team', 'area', 'points', 'date',
 '{"stacked": true, "fillOpacity": 0.7}'::jsonb,
 '{"dateRange": {"start": null, "end": null}}'::jsonb,
 '{"colorScheme": "team", "showLabels": false, "showLegend": true, "legendPosition": "top"}'::jsonb,
 true, true),

-- Template 8: Attendance vs Performance
('Attendance Rate by Team', 'Compare attendance rates across teams', 'bar', 'attendance_rate', 'team',
 '{"showAverage": true, "showTarget": true}'::jsonb,
 '{"weeks": [1, 2, 3, 4]}'::jsonb,
 '{"colorScheme": "team", "showLabels": true, "showLegend": false, "targetLine": 0.85}'::jsonb,
 true, true);

COMMENT ON TABLE chart_configurations IS 'Stores user-saved chart configurations for Chart Studio feature';
COMMENT ON COLUMN chart_configurations.chart_type IS 'Type of chart: bar, line, area, pie, donut, combo, horizontal_bar';
COMMENT ON COLUMN chart_configurations.metric IS 'Metric to visualize: points, quantity, attendance_rate, nominal';
COMMENT ON COLUMN chart_configurations.dimension IS 'Primary dimension: team, member, product, category, week, date';
COMMENT ON COLUMN chart_configurations.config IS 'Chart-specific configuration options';
COMMENT ON COLUMN chart_configurations.filters IS 'Active filters (teams, products, date range, etc.)';
COMMENT ON COLUMN chart_configurations.styles IS 'Visual styling options (colors, labels, legend)';
