import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/chart-config - List all configurations
// GET /api/chart-config?id=xxx - Get single configuration
// POST /api/chart-config - Create new configuration
// PUT /api/chart-config?id=xxx - Update configuration
// DELETE /api/chart-config?id=xxx - Delete configuration

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const user_name = searchParams.get('user_name');
    const is_public = searchParams.get('is_public');
    const is_template = searchParams.get('is_template');

    let query = supabase.from('chart_configurations').select('*');

    if (id) {
      const { data, error } = await query.eq('id', id).single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Apply filters
    if (user_name) {
      query = query.eq('user_name', user_name);
    }
    
    if (is_public !== null && is_public !== undefined) {
      query = query.eq('is_public', is_public === 'true');
    }
    
    if (is_template !== null && is_template !== undefined) {
      query = query.eq('is_template', is_template === 'true');
    }

    // Order by updated_at descending
    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching chart configuration:', error);
    return NextResponse.json({ error: 'Failed to fetch chart configuration' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      user_name,
      name,
      description,
      chart_type,
      metric,
      dimension,
      config,
      filters,
      styles,
      is_public = false,
      is_template = false,
    } = body;

    // Validate required fields
    if (!name || !chart_type || !metric || !dimension || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: name, chart_type, metric, dimension, config' },
        { status: 400 }
      );
    }

    // Validate chart_type
    const validChartTypes = ['bar', 'line', 'area', 'pie', 'donut', 'combo', 'horizontal_bar'];
    if (!validChartTypes.includes(chart_type)) {
      return NextResponse.json(
        { error: `Invalid chart_type. Must be one of: ${validChartTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate metric
    const validMetrics = ['points', 'quantity', 'attendance_rate', 'nominal'];
    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate dimension
    const validDimensions = ['team', 'member', 'product', 'category', 'week', 'date'];
    if (!validDimensions.includes(dimension)) {
      return NextResponse.json(
        { error: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('chart_configurations')
      .insert({
        user_name,
        name,
        description,
        chart_type,
        metric,
        dimension,
        config,
        filters: filters || {},
        styles: styles || {},
        is_public,
        is_template,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating chart configuration:', error);
    return NextResponse.json({ error: 'Failed to create chart configuration' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const body = await request.json();
    
    // Fields that can be updated
    const allowedFields = [
      'name',
      'description',
      'chart_type',
      'metric',
      'dimension',
      'config',
      'filters',
      'styles',
      'is_public',
      'is_template',
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate chart_type if provided
    if (updateData.chart_type) {
      const validChartTypes = ['bar', 'line', 'area', 'pie', 'donut', 'combo', 'horizontal_bar'];
      if (!validChartTypes.includes(updateData.chart_type)) {
        return NextResponse.json(
          { error: `Invalid chart_type. Must be one of: ${validChartTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate metric if provided
    if (updateData.metric) {
      const validMetrics = ['points', 'quantity', 'attendance_rate', 'nominal'];
      if (!validMetrics.includes(updateData.metric)) {
        return NextResponse.json(
          { error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate dimension if provided
    if (updateData.dimension) {
      const validDimensions = ['team', 'member', 'product', 'category', 'week', 'date'];
      if (!validDimensions.includes(updateData.dimension)) {
        return NextResponse.json(
          { error: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('chart_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating chart configuration:', error);
    return NextResponse.json({ error: 'Failed to update chart configuration' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const { error } = await supabase.from('chart_configurations').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Chart configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting chart configuration:', error);
    return NextResponse.json({ error: 'Failed to delete chart configuration' }, { status: 500 });
  }
}
