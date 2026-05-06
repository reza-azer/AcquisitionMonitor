import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'sort_order';

    let query = supabase.from('products').select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Support sorting by sort_order, category, or product_name
    const validSortColumns = ['sort_order', 'category', 'product_name', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'sort_order';
    query = query.order(sortColumn, { ascending: true });

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
    // CREDIT products cannot be tiered
    if (category === 'CREDIT') {
      if (is_tiered) {
        return NextResponse.json(
          { data: null, error: 'CREDIT products cannot be tiered. Use nominal per point configuration.' },
          { status: 400 }
        );
      }
      // For CREDIT, validate credit_nominal_per_point
      if (credit_nominal_per_point !== undefined && (typeof credit_nominal_per_point !== 'number' || credit_nominal_per_point <= 0)) {
        return NextResponse.json(
          { data: null, error: 'CREDIT products must have valid credit_nominal_per_point (positive number)' },
          { status: 400 }
        );
      }
    } else if (is_tiered) {
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

    // Prepare data for insert
    let productData: Record<string, any> = {
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
      // Insert new - get max sort_order and add 1
      const { data: maxOrder } = await supabase
        .from('products')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      
      productData.sort_order = maxOrder ? maxOrder.sort_order + 1 : 1;

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

// PATCH - Update sort order for products
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { data: null, error: 'productIds array is required' },
        { status: 400 }
      );
    }

    // Update each product's sort_order based on array index
    const updates = productIds.map((id, index) => ({
      id,
      sort_order: index + 1,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('products')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);

      if (error) throw error;
    }

    return NextResponse.json({ data: null, error: null });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Hard delete product
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json(
        { data: null, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Get product info first
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('product_key')
      .eq('id', id)
      .single();

    if (productError) throw productError;

    // Check if product has existing acquisitions
    const { count, error: countError } = await supabase
      .from('acquisitions')
      .select('*', { count: 'exact', head: true })
      .eq('product_key', product.product_key);

    if (countError) throw countError;

    // If has acquisitions and not forced, return warning
    if (count && count > 0 && !force) {
      return NextResponse.json(
        {
          data: null,
          error: `Produk "${product.product_key}" memiliki ${count} data akuisisi. Hapus lagi untuk konfirmasi hard delete.`,
          acquisitionCount: count,
        },
        { status: 409 }
      );
    }

    // Hard delete the product
    const { error } = await supabase
      .from('products')
      .delete()
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
