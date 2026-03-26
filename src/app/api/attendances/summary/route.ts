import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch attendance summary per member
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const teamId = searchParams.get('teamId');

    // Default to current month if no dates provided
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaultEnd = today;

    const from = startDate || defaultStart.toISOString().split('T')[0];
    const to = endDate || defaultEnd.toISOString().split('T')[0];

    // Build the query to get all attendance records in the date range
    let query = supabase
      .from('attendances')
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
      .gte('date', from)
      .lte('date', to);

    if (teamId) {
      query = query.eq('member->team_id', teamId);
    }

    const { data: attendances, error } = await query;

    if (error) throw error;

    // Aggregate data per member
    const summaryMap = new Map<string, {
      member_id: string;
      member_name: string;
      member_position: string;
      team_id: string;
      team_name: string;
      present: number;
      late: number;
      leave: number;
      alpha: number;
      total_days: number;
      total_late_minutes: number;
      leave_reasons: Record<string, number>;
    }>();

    // Get all members to include those with no attendance
    const { data: allMembers } = await supabase
      .from('members')
      .select(`
        id,
        name,
        position,
        team_id,
        team:teams (
          id,
          name
        )
      `);

    // Initialize summary for all members
    if (allMembers) {
      for (const member of allMembers) {
        const teamName = (member.team as any)?.name || 'Unknown';
        summaryMap.set(member.id, {
          member_id: member.id,
          member_name: member.name,
          member_position: member.position,
          team_id: member.team_id,
          team_name: teamName,
          present: 0,
          late: 0,
          leave: 0,
          alpha: 0,
          total_days: 0,
          total_late_minutes: 0,
          leave_reasons: {},
        });
      }
    }

    // Aggregate attendance data
    if (attendances) {
      for (const attendance of attendances) {
        const member = attendance.member as any;
        const memberId = attendance.member_id;
        const summary = summaryMap.get(memberId);

        if (summary) {
          summary.total_days++;

          switch (attendance.status) {
            case 'present':
              summary.present++;
              break;
            case 'late':
              summary.late++;
              summary.total_late_minutes += attendance.late_minutes || 0;
              break;
            case 'leave':
              summary.leave++;
              if (attendance.leave_reason) {
                summary.leave_reasons[attendance.leave_reason] = 
                  (summary.leave_reasons[attendance.leave_reason] || 0) + 1;
              }
              break;
            case 'alpha':
              summary.alpha++;
              break;
          }
        }
      }
    }

    // Convert map to array and sort by member name
    const summary = Array.from(summaryMap.values()).sort((a, b) =>
      a.member_name.localeCompare(b.member_name)
    );

    return NextResponse.json({ 
      data: summary, 
      error: null,
      period: { from, to }
    });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }
}
