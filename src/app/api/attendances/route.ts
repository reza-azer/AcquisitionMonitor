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

// POST - Create or update attendance record(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle bulk operation
    if (body.bulk === true && Array.isArray(body.records)) {
      const { records } = body;
      
      if (records.length === 0) {
        return NextResponse.json(
          { data: null, error: 'No records provided' },
          { status: 400 }
        );
      }

      // Validate status
      const validStatuses = ['present', 'late', 'leave', 'alpha'];
      
      // Validate all records
      for (const record of records) {
        if (!record.member_id || !record.date || !record.status) {
          return NextResponse.json(
            { data: null, error: 'member_id, date, and status are required for all records' },
            { status: 400 }
          );
        }
        if (!validStatuses.includes(record.status)) {
          return NextResponse.json(
            { data: null, error: `Invalid status in record: ${record.status}` },
            { status: 400 }
          );
        }
      }

      // Bulk upsert using insert with upsert option
      const { data, error } = await supabase
        .from('attendances')
        .upsert(
          records.map((r: any) => ({
            member_id: r.member_id,
            date: r.date,
            status: r.status,
            leave_reason: r.leave_reason || null,
            late_minutes: r.late_minutes || 0,
            notes: r.notes || null,
          })),
          { onConflict: 'member_id,date' }
        )
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
        `);

      if (error) throw error;

      return NextResponse.json({ 
        data, 
        error: null,
        summary: {
          total: records.length,
          created: data?.length || 0,
        }
      });
    }

    // Handle single record operation
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

// DELETE - Remove attendance record(s)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Handle bulk delete
    if (request.nextUrl.searchParams.has('bulk')) {
      const body = await request.json();
      const { records } = body;

      if (!Array.isArray(records) || records.length === 0) {
        return NextResponse.json(
          { data: null, error: 'No records provided for bulk delete' },
          { status: 400 }
        );
      }

      // Delete by member_id and date combinations
      const deletePromises = records.map((r: any) =>
        supabase
          .from('attendances')
          .delete()
          .eq('member_id', r.member_id)
          .eq('date', r.date)
      );

      const results = await Promise.all(deletePromises);
      
      // Check for errors
      for (const result of results) {
        if (result.error) throw result.error;
      }

      return NextResponse.json({ 
        data: null, 
        error: null,
        summary: {
          deleted: records.length,
        }
      });
    }

    // Handle single delete
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
