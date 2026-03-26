import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch attendance records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const memberId = searchParams.get('memberId');

    let query = supabase.from('attendances').select(`
      *,
      member:members (
        id,
        name,
        position,
        team_id,
        team:teams (
          id,
          name
        )
      )
    `);

    // Filter by date range or specific date
    if (date) {
      query = query.eq('date', date);
    } else if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    // Filter by member
    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    // Order by date descending
    query = query.order('date', { ascending: false });

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

// POST - Create or update attendance record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_id, date, status, leave_reason, late_minutes, notes } = body;

    // Validate required fields
    if (!member_id || !date || !status) {
      return NextResponse.json(
        { data: null, error: 'member_id, date, and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['present', 'late', 'leave', 'alpha'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { data: null, error: 'Invalid status. Must be present, late, leave, or alpha' },
        { status: 400 }
      );
    }

    // Use upsert to handle unique constraint on (member_id, date)
    const { data, error } = await supabase
      .from('attendances')
      .upsert({
        member_id,
        date,
        status,
        leave_reason: leave_reason || null,
        late_minutes: late_minutes || 0,
        notes: notes || null,
      })
      .select(`
        *,
        member:members (
          id,
          name,
          position,
          team_id,
          team:teams (
            id,
            name
          )
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove attendance record
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { data: null, error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('attendances').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ data: null, error: null });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }
}
