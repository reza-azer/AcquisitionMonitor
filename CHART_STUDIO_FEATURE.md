# Chart Studio Feature

## Overview

Chart Studio is a powerful, user-driven chart visualization feature that allows users to build custom charts to visualize their acquisition data. Instead of pre-defined charts, users have full control over chart type, data metrics, dimensions, and styling.

## Features

### 🎨 Chart Types (7 types)
- **Bar Chart** - Compare values across categories
- **Line Chart** - Show trends over time
- **Area Chart** - Display cumulative trends
- **Pie Chart** - Show composition percentages
- **Donut Chart** - Modern pie chart variant
- **Combo Chart** - Combine multiple chart types (bar + line)
- **Horizontal Bar** - Horizontal bar comparison

### 📊 Metrics (4 options)
- **Points** - Total points earned
- **Quantity** - Number of acquisitions
- **Attendance Rate** - Attendance percentage
- **Nominal** - Nominal value (IDR) for CREDIT products

### 📐 Dimensions (6 options)
- **By Team** - Group data by team
- **By Member** - Group data by individual member
- **By Product** - Group data by product
- **By Category** - Group by FUNDING/TRANSACTION/CREDIT
- **By Week** - Group by week (1-4)
- **By Date** - Group by specific date

### 🔍 Filters
- **Weeks** - Select specific weeks (1-4)
- **Teams** - Filter by specific teams
- **Categories** - Filter by product category
- **Products** - Filter by specific products
- **Date Range** - Custom date range selection

### 🎨 Style Options
- **Color Schemes**: team, category, ranking, status, product, gradient
- **Data Labels** - Show/hide values on charts
- **Legend** - Show/hide with position control (top/bottom/left/right)
- **Gridlines** - Show/hide grid lines
- **Percentages** - For pie/donut charts

### 📈 Advanced Analytics
- **Target Line** - Compare against weekly targets
- **Trend Line** - Linear regression overlay
- **Moving Average** - 3/5/7 period moving average
- **Week-over-Week Comparison** - Show growth percentages

### 💾 Save & Export
- **Save Configuration** - Save chart setups to database
- **Load Saved Charts** - Reuse previous configurations
- **Export as PNG** - Download chart images
- **Export as CSV** - Download underlying data

### 🚀 Quick Start Templates (12 templates)
1. Team Performance Overview
2. Weekly Trend Analysis
3. Product Mix Analysis
4. Target vs Actual
5. Member Leaderboard
6. Category Performance Breakdown
7. Daily Momentum
8. Attendance Rate by Team
9. Credit Product Nominal Analysis
10. Team Weekly Comparison
11. Product Target Achievement
12. Attendance Distribution

## Installation

### 1. Run Database Migration

Execute the migration SQL file in your Supabase SQL Editor:

```sql
-- Run: migration-add-chart-configurations.sql
```

This creates:
- `chart_configurations` table for storing user configs
- 8 default chart templates

### 2. Build & Run

```bash
npm run build
npm run dev
```

## Usage

1. **Navigate to Analytics Tab**
   - Go to the main dashboard
   - Click on the "Analytics" tab
   - Select "Chart Studio" from the view selector

2. **Build Your Chart**
   - Select a chart type
   - Choose metric (what to measure)
   - Choose dimension (how to group)
   - Apply filters (teams, weeks, products, etc.)
   - Customize style (colors, labels, legend)
   - Add advanced analytics (optional)

3. **Save & Export**
   - Enter a chart name
   - Click "Save" to save configuration
   - Use "Export" menu to download as PNG or CSV
   - Click "Saved Charts" to load previous configs

## File Structure

```
src/
├── app/
│   └── api/
│       ├── analytics/
│       │   └── chart-data/
│       │       └── route.ts          # Chart data generator API
│       └── chart-config/
│           └── route.ts              # CRUD API for chart configs
│
├── components/
│   └── ChartStudio/
│       ├── ChartStudio.tsx           # Main container component
│       ├── ChartTypeSelector.tsx     # Chart type picker
│       ├── DataConfigPanel.tsx       # Metric/dimension selector
│       ├── FilterPanel.tsx           # Filters configuration
│       ├── StyleConfigPanel.tsx      # Style options
│       ├── AdvancedOptions.tsx       # Advanced analytics
│       ├── ChartPreview.tsx          # Chart rendering with Recharts
│       ├── ExportMenu.tsx            # Export PNG/CSV
│       └── SavedCharts.tsx           # Saved configurations list
│
└── lib/
    ├── chart-presets.ts              # Pre-built templates
    └── chart-utils.ts                # Helper functions
```

## API Endpoints

### GET /api/analytics/chart-data
Fetch chart data based on configuration.

**Request Body:**
```json
{
  "chartType": "bar",
  "metric": "points",
  "dimension": "team",
  "filters": {
    "teams": [],
    "weeks": [1, 2, 3, 4]
  },
  "groupBy": "week",
  "sortBy": "desc",
  "showTarget": false
}
```

### POST /api/chart-config
Save chart configuration.

**Request Body:**
```json
{
  "name": "My Custom Chart",
  "chart_type": "bar",
  "metric": "points",
  "dimension": "team",
  "config": {},
  "filters": {},
  "styles": {},
  "is_public": false
}
```

### GET /api/chart-config
List or fetch chart configurations.

**Query Parameters:**
- `id` - Get specific config by ID
- `user_name` - Filter by user
- `is_public` - Filter public configs
- `is_template` - Filter templates

### PUT /api/chart-config?id=xxx
Update chart configuration.

### DELETE /api/chart-config?id=xxx
Delete chart configuration.

## Database Schema

```sql
CREATE TABLE chart_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  chart_type VARCHAR(50) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  dimension VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  filters JSONB DEFAULT '{}',
  styles JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Technologies Used

- **Recharts v3.7.0** - Chart rendering library
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Supabase** - Database & storage
- **Tailwind CSS** - Styling

## Tips for Best Results

### For Team Comparisons
- Use **Bar Chart** with **Points** metric **By Team**
- Enable **Target Line** to see target achievement
- Group by **Week** for trend analysis

### For Trend Analysis
- Use **Line Chart** with **Points** metric **By Week**
- Enable **Trend Line** for linear regression
- Add **Moving Average** for smoothed trends

### For Composition Analysis
- Use **Donut Chart** with **Quantity** metric **By Product**
- Enable **Show Percentages** for proportion view
- Filter by **Category** for focused view

### For Performance Tracking
- Use **Area Chart** with **Points** metric **By Date**
- Enable **Stacked** for cumulative view
- Filter by specific **Teams** for comparison

## Troubleshooting

### Chart Not Loading
- Check if data exists for selected filters
- Verify API endpoint is responding
- Check browser console for errors

### Export Not Working
- Ensure chart is fully rendered before exporting
- Check browser popup blocker settings
- Try refreshing the page

### Saved Charts Not Appearing
- Verify database migration was successful
- Check if filters are set correctly (all/my/templates/public)
- Ensure Supabase connection is working

## Future Enhancements

- [ ] AI-powered insights generation
- [ ] Real-time data updates
- [ ] Collaborative chart sharing
- [ ] Advanced drill-down capabilities
- [ ] Custom color picker
- [ ] Annotation support
- [ ] Scheduled exports
- [ ] Alert system for metric thresholds

## Credits

Built with ❤️ for Acquisition Monitor team.
