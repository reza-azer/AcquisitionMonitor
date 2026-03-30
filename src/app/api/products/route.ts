import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = supabase.from('products').select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('category', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create or update product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      product_key,
      product_name,
      category,
      unit,
      weekly_target,
      is_tiered,
      tier_config,
      flat_points,
      credit_nominal_per_point,
      is_active,
    } = body;

    // Validate required fields
    if (!product_key || !product_name || !category || !unit) {
      return NextResponse.json(
        { data: null, error: 'product_key, product_name, category, and unit are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['FUNDING', 'TRANSACTION', 'CREDIT'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { data: null, error: 'Invalid category. Must be FUNDING, TRANSACTION, or CREDIT' },
        { status: 400 }
      );
    }

    // Validate tiered vs flat product configuration
    if (is_tiered) {
      if (!tier_config || !Array.isArray(tier_config) || tier_config.length === 0) {
        return NextResponse.json(
          { data: null, error: 'Tiered products must have tier_config array' },
          { status: 400 }
        );
      }
      // Validate tier structure
      for (const tier of tier_config) {
        if (typeof tier.limit !== 'number' || typeof tier.points !== 'number') {
          return NextResponse.json(
            { data: null, error: 'Each tier must have limit (number) and points (number)' },
            { status: 400 }
          );
        }
      }
    } else {
      if (typeof flat_points !== 'number' || flat_points < 0) {
        return NextResponse.json(
          { data: null, error: 'Non-tiered products must have valid flat_points' },
          { status: 400 }
        );
      }
    }

    // Prepare data for upsert
    const productData = {
      product_key,
      product_name,
      category,
      unit,
      weekly_target: weekly_target || 0,
      is_tiered: is_tiered || false,
      tier_config: is_tiered ? tier_config : null,
      flat_points: is_tiered ? null : flat_points,
      credit_nominal_per_point: category === 'CREDIT' ? (credit_nominal_per_point || 100) : null,
      is_active: is_active !== undefined ? is_active : true,
    };

    // Use upsert to handle unique constraint on product_key
    let query;
    if (id) {
      // Update existing
      query = supabase
        .from('products')
        .update({ ...productData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    } else {
      // Insert new
      query = supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { data: null, error: 'Product key already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove product
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { data: null, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ data: null, error: null });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }
}
