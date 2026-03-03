import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    const week = searchParams.get('week');

    let query = supabase.from('acquisitions').select('*');
    if (memberId) query = query.eq('member_id', memberId);
    if (week) query = query.eq('week', parseInt(week));

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching acquisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch acquisitions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { member_id, week, product_key, quantity } = body;

    // Upsert: insert or update on conflict
    const { data, error } = await supabase
      .from('acquisitions')
      .upsert([{ member_id, week, product_key, quantity }], {
        onConflict: 'member_id,week,product_key'
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error saving acquisition:', error);
    return NextResponse.json({ error: 'Failed to save acquisition' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Acquisition ID required' }, { status: 400 });
    }

    const { error } = await supabase.from('acquisitions').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting acquisition:', error);
    return NextResponse.json({ error: 'Failed to delete acquisition' }, { status: 500 });
  }
}
