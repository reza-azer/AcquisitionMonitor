import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id');
    const week = searchParams.get('week');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase.from('acquisitions').select('*');
    
    if (memberId) query = query.eq('member_id', memberId);
    if (week) query = query.eq('week', parseInt(week));
    if (date) query = query.eq('date', date);
    
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else if (startDate) {
      query = query.gte('date', startDate);
    } else if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query.order('date', { ascending: false });

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
    const { member_id, week, date, product_key, quantity } = body;

    // Use today's date if not provided
    const inputDate = date || new Date().toISOString().split('T')[0];

    // Calculate week number within the month (1-4) if not provided
    const inputWeek = week || getWeekOfMonth(new Date(inputDate));

    // Upsert: insert or update on conflict (member_id, date, product_key)
    const { data, error } = await supabase
      .from('acquisitions')
      .upsert([{
        member_id,
        week: inputWeek,
        date: inputDate,
        product_key,
        quantity,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'member_id,date,product_key'
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

// Helper function to calculate week of month (1-4)
function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayWeekday = firstDayOfMonth.getDay();
  
  // Calculate the week number within the month
  const weekNum = Math.ceil((day + firstDayWeekday) / 7);
  
  // Ensure week is between 1 and 4
  return Math.min(weekNum, 4);
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
