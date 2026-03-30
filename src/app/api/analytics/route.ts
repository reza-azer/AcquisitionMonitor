import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface AttendanceDetail {
  id: string;
  member_id: string;
  member_name: string;
  member_position: string;
  team_id: string;
  team_name: string;
  date: string;
  status: 'present' | 'late' | 'leave' | 'alpha';
  leave_reason: string | null;
  late_minutes: number;
  notes: string | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'weekly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const teamId = searchParams.get('teamId');
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    // Attendance-specific filters
    const attendanceMonth = searchParams.get('attendanceMonth');
    const attendanceYear = searchParams.get('attendanceYear');

    // Fetch base data
    const { data: teams, error: teamsError } = await supabase.from('teams').select('id, name, accent_color');
    if (teamsError) throw teamsError;

    let membersQuery = supabase.from('members').select('id, name, position, team_id');
    if (teamId) membersQuery = membersQuery.eq('team_id', teamId);
    const { data: members, error: membersError } = await membersQuery;
    if (membersError) throw membersError;

    let productsQuery = supabase.from('products').select('*').eq('is_active', true);
    if (category) productsQuery = productsQuery.eq('category', category);
    const { data: products, error: productsError } = await productsQuery;
    if (productsError) throw productsError;

    // Determine date range for filtering
    const today = new Date();
    let dateFilter: { start?: string; end?: string } = {};

    if (reportType === 'custom' && startDate && endDate) {
      dateFilter = { start: startDate, end: endDate };
    } else if (month && year) {
      // Filter by specific month and year
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const monthStr = String(monthNum).padStart(2, '0');
      const lastDay = new Date(yearNum, monthNum, 0).getDate();
      dateFilter = {
        start: `${yearNum}-${monthStr}-01`,
        end: `${yearNum}-${monthStr}-${String(lastDay).padStart(2, '0')}`
      };
    } else if (reportType === 'monthly') {
      // Current month
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const monthStr = String(currentMonth).padStart(2, '0');
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      dateFilter = {
        start: `${currentYear}-${monthStr}-01`,
        end: `${currentYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`
      };
    } else {
      // Weekly - default to current month
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const monthStr = String(currentMonth).padStart(2, '0');
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      dateFilter = {
        start: `${currentYear}-${monthStr}-01`,
        end: `${currentYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`
      };
    }

    // Fetch acquisitions with date filter
    let acquisitionsQuery = supabase.from('acquisitions').select('*');
    if (dateFilter.start) acquisitionsQuery = acquisitionsQuery.gte('date', dateFilter.start);
    if (dateFilter.end) acquisitionsQuery = acquisitionsQuery.lte('date', dateFilter.end);
    const { data: acquisitions, error: acquisitionsError } = await acquisitionsQuery;
    if (acquisitionsError) throw acquisitionsError;

    // Fetch attendances based on report type
    let attendanceQuery = supabase.from('attendances').select('member_id, date, status, late_minutes, leave_reason, notes');
    if (dateFilter.start && dateFilter.end) {
      attendanceQuery = attendanceQuery.gte('date', dateFilter.start).lte('date', dateFilter.end);
    }
    const { data: attendances, error: attendancesError } = await attendanceQuery;
    if (attendancesError) throw attendancesError;

    // Fetch detailed attendance records with member info (for attendance summary table)
    // Use attendanceMonth/attendanceYear if provided, otherwise use the main dateFilter
    let attendanceDetailStart = dateFilter.start;
    let attendanceDetailEnd = dateFilter.end;
    if (attendanceMonth && attendanceYear) {
      const attMonthNum = parseInt(attendanceMonth);
      const attYearNum = parseInt(attendanceYear);
      const attMonthStr = String(attMonthNum).padStart(2, '0');
      const attLastDay = new Date(attYearNum, attMonthNum, 0).getDate();
      attendanceDetailStart = `${attYearNum}-${attMonthStr}-01`;
      attendanceDetailEnd = `${attYearNum}-${attMonthStr}-${String(attLastDay).padStart(2, '0')}`;
    }

    const { data: attendanceDetailsRaw, error: attendanceDetailsError } = await supabase
      .from('attendances')
      .select(`
        id,
        member_id,
        date,
        status,
        late_minutes,
        leave_reason,
        notes,
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
      .gte('date', attendanceDetailStart || '2020-01-01')
      .lte('date', attendanceDetailEnd || '2099-12-31')
      .in('status', ['late', 'leave', 'alpha'])
      .order('date', { ascending: false });

    if (attendanceDetailsError) throw attendanceDetailsError;

    // Transform attendance details into flat structure
    const attendanceDetails: AttendanceDetail[] = (attendanceDetailsRaw || []).map((a: any) => ({
      id: a.id,
      member_id: a.member_id,
      member_name: a.member?.name || 'Unknown',
      member_position: a.member?.position || '',
      team_id: a.member?.team_id || '',
      team_name: a.member?.team?.name || '',
      date: a.date,
      status: a.status,
      leave_reason: a.leave_reason,
      late_minutes: a.late_minutes || 0,
      notes: a.notes,
    }));

    const memberIds = members.map(m => m.id);
    const filteredAcquisitions = acquisitions.filter(a => memberIds.includes(a.member_id));

    /**
     * Calculate week of month from date (1-4)
     * Formula: CEIL(day_of_month / 7)
     * - Week 1: days 1-7
     * - Week 2: days 8-14
     * - Week 3: days 15-21
     * - Week 4: days 22-31 (caps at 4)
     * 
     * This matches the acquisitions API and SQL migration calculation.
     */
    const getWeekFromDate = (dateStr: string): number => {
      const dateObj = new Date(dateStr);
      const day = dateObj.getDate();
      // Simple ceiling division by 7
      return Math.min(Math.ceil(day / 7), 4);
    };

    // Normalize week field for all acquisitions
    // If week is null/undefined, calculate it from the date
    const normalizedAcquisitions = filteredAcquisitions.map(a => ({
      ...a,
      week: a.week ?? getWeekFromDate(a.date)
    }));

    // Calculate weekly trends (all 4 weeks) - overall
    const weeklyTrends: { week: number; totalPoints: number; totalQuantity: number }[] = [];
    for (let w = 1; w <= 4; w++) {
      const weekAcq = normalizedAcquisitions.filter(a => a.week === w);
      let totalPoints = 0;
      let totalQuantity = 0;
      weekAcq.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;
        
        if (product.category === 'CREDIT') {
          // CREDIT: 1 poin per 100 juta (floor, tanpa koma)
          totalQuantity += 1;
          totalPoints += Math.floor((a.nominal || 0) / 100000000);
        } else {
          // FUNDING/TRANSACTION: use quantity directly
          totalQuantity += a.quantity;
          if (product.is_tiered && product.tier_config) {
            const tier = product.tier_config.find((t: { limit: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
            totalPoints += a.quantity * tier.points;
          } else {
            totalPoints += a.quantity * (product.flat_points || 0);
          }
        }
      });
      weeklyTrends.push({ week: w, totalPoints, totalQuantity });
    }

    // Calculate weekly trends per team
    const teamWeeklyTrends = teams.map(team => {
      const teamMembers = members.filter(m => m.team_id === team.id);
      const teamMemberIds = teamMembers.map(m => m.id);
      const teamAcquisitions = normalizedAcquisitions.filter(a => teamMemberIds.includes(a.member_id));

      const weeklyData: { week: number; [teamName: string]: number }[] = [];
      for (let w = 1; w <= 4; w++) {
        const weekAcq = teamAcquisitions.filter(a => a.week === w);
        let totalPoints = 0;
        weekAcq.forEach(a => {
          const product = products.find(p => p.product_key === a.product_key);
          if (!product) return;
          
          if (product.category === 'CREDIT') {
            // CREDIT: 1 poin per 100 juta (floor, tanpa koma)
            totalPoints += Math.floor((a.nominal || 0) / 100000000);
          } else {
            // FUNDING/TRANSACTION: use quantity directly
            if (product.is_tiered && product.tier_config) {
              const tier = product.tier_config.find((t: { limit: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
              totalPoints += a.quantity * tier.points;
            } else {
              totalPoints += a.quantity * (product.flat_points || 0);
            }
          }
        });
        weeklyData.push({ week: w, [team.name]: totalPoints });
      }
      return { teamId: team.id, teamName: team.name, accentColor: team.accent_color, weeklyData };
    });

    // Calculate team performance
    const teamPerformance = teams.map(team => {
      const teamMembers = members.filter(m => m.team_id === team.id);
      const teamMemberIds = teamMembers.map(m => m.id);
      const teamAcquisitions = normalizedAcquisitions.filter(a => teamMemberIds.includes(a.member_id));
      const teamAttendances = attendances.filter(a => teamMemberIds.includes(a.member_id));
      let totalPoints = 0;
      let totalQuantity = 0;
      const productBreakdown: Record<string, number> = {};
      teamAcquisitions.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;
        
        if (product.category === 'CREDIT') {
          // CREDIT: count as 1 acquisition entry, 1 poin per 100 juta (floor)
          totalQuantity += 1;
          productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + 1;
          totalPoints += Math.floor((a.nominal || 0) / 100000000);
        } else {
          // FUNDING/TRANSACTION: use quantity directly
          totalQuantity += a.quantity;
          productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + a.quantity;
          if (product.is_tiered && product.tier_config) {
            const tier = product.tier_config.find((t: { limit: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
            totalPoints += a.quantity * tier.points;
          } else {
            totalPoints += a.quantity * (product.flat_points || 0);
          }
        }
      });
      const totalDays = teamAttendances.length;
      const presentDays = teamAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
      const lateDays = teamAttendances.filter(a => a.status === 'late').length;
      const leaveDays = teamAttendances.filter(a => a.status === 'leave').length;
      const alphaDays = teamAttendances.filter(a => a.status === 'alpha').length;
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      const totalTarget = products.reduce((sum, p) => sum + p.weekly_target, 0);
      const targetAchievement = totalTarget > 0 ? Math.round((totalQuantity / totalTarget) * 100) : 0;
      return {
        teamId: team.id,
        teamName: team.name,
        accentColor: team.accent_color,
        memberCount: teamMembers.length,
        totalPoints,
        totalQuantity,
        attendanceRate,
        productBreakdown,
        presentDays,
        lateDays,
        leaveDays,
        alphaDays,
        totalDays,
        targetAchievement,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    // Calculate member rankings
    const memberRankings = members.map(member => {
      const memberAcquisitions = normalizedAcquisitions.filter(a => a.member_id === member.id);
      const memberAttendances = attendances.filter(a => a.member_id === member.id);
      let totalPoints = 0;
      let totalQuantity = 0;
      const productBreakdown: Record<string, number> = {};
      memberAcquisitions.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;
        
        if (product.category === 'CREDIT') {
          // CREDIT: count as 1 acquisition entry, 1 poin per 100 juta (floor)
          totalQuantity += 1;
          productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + 1;
          totalPoints += Math.floor((a.nominal || 0) / 100000000);
        } else {
          // FUNDING/TRANSACTION: use quantity directly
          totalQuantity += a.quantity;
          productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + a.quantity;
          if (product.is_tiered && product.tier_config) {
            const tier = product.tier_config.find((t: { limit: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
            totalPoints += a.quantity * tier.points;
          } else {
            totalPoints += a.quantity * (product.flat_points || 0);
          }
        }
      });
      const totalDays = memberAttendances.length;
      const presentDays = memberAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
      const targetAchievements = products.map(p => {
        const qty = productBreakdown[p.product_key] || 0;
        return {
          productKey: p.product_key,
          productName: p.product_name,
          quantity: qty,
          target: p.weekly_target,
          achievement: p.weekly_target > 0 ? Math.round((qty / p.weekly_target) * 100) : 0,
        };
      });
      return {
        memberId: member.id,
        memberName: member.name,
        position: member.position,
        teamId: member.team_id,
        teamName: teams.find(t => t.id === member.team_id)?.name || '',
        totalPoints,
        totalQuantity,
        attendanceRate,
        productBreakdown,
        presentDays,
        totalDays,
        targetAchievements,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    // Calculate category/product performance
    const categoryPerformance = products.map(product => {
      const productAcquisitions = filteredAcquisitions.filter(a => a.product_key === product.product_key);
      const totalQuantity = productAcquisitions.reduce((sum, a) => {
        // For CREDIT: count each entry as 1, for others use quantity
        return sum + (product.category === 'CREDIT' ? 1 : a.quantity);
      }, 0);
      let totalPoints = 0;
      productAcquisitions.forEach(a => {
        if (product.category === 'CREDIT') {
          // CREDIT: 1 poin per 100 juta (floor, tanpa koma)
          totalPoints += Math.floor((a.nominal || 0) / 100000000);
        } else if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find((t: { limit: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
          totalPoints += a.quantity * tier.points;
        } else {
          totalPoints += a.quantity * (product.flat_points || 0);
        }
      });
      return {
        productKey: product.product_key,
        productName: product.product_name,
        category: product.category,
        unit: product.unit,
        totalQuantity,
        totalPoints,
        weeklyTarget: product.weekly_target,
        achievementRate: product.weekly_target > 0 ? Math.round((totalQuantity / product.weekly_target) * 100) : 0,
      };
    });

    // Calculate attendance correlation data
    const attendanceCorrelation = memberRankings
      .filter(m => m.totalDays > 0)
      .map(m => ({
        memberId: m.memberId,
        memberName: m.memberName,
        attendanceRate: m.attendanceRate,
        totalPoints: m.totalPoints,
        totalQuantity: m.totalQuantity,
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    // Calculate insights
    const insights = {
      bestPerformer: memberRankings[0] || null,
      topTeam: teamPerformance[0] || null,
      highestAttendance: memberRankings.filter(m => m.attendanceRate > 0).sort((a, b) => b.attendanceRate - a.attendanceRate)[0] || null,
      mostImproved: memberRankings.slice(0, 3),
      consistencyLeader:
        memberRankings
          .filter(m => m.totalPoints > 0 && m.attendanceRate > 50)
          .sort((a, b) => (a.attendanceRate + a.totalPoints / 10) - (b.attendanceRate + b.totalPoints / 10))
          .pop() || null,
    };

    // Calculate summary with attendance breakdown
    const summary = {
      totalMembers: members.length,
      totalTeams: teams.length,
      totalPoints: memberRankings.reduce((sum, m) => sum + m.totalPoints, 0),
      totalQuantity: memberRankings.reduce((sum, m) => sum + m.totalQuantity, 0),
      avgAttendanceRate:
        memberRankings.length > 0
          ? Math.round(memberRankings.reduce((sum, m) => sum + m.attendanceRate, 0) / memberRankings.length)
          : 0,
      totalPresentDays: memberRankings.reduce((sum, m) => sum + m.presentDays, 0),
      totalLateDays: memberRankings.reduce(
        (sum, m) => sum + attendances.filter(a => a.member_id === m.memberId && a.status === 'late').length,
        0
      ),
      totalLeaveDays: memberRankings.reduce(
        (sum, m) => sum + attendances.filter(a => a.member_id === m.memberId && a.status === 'leave').length,
        0
      ),
      totalAlphaDays: memberRankings.reduce(
        (sum, m) => sum + attendances.filter(a => a.member_id === m.memberId && a.status === 'alpha').length,
        0
      ),
    };

    return NextResponse.json({
      weeklyTrends,
      teamWeeklyTrends,
      teamPerformance,
      memberRankings,
      categoryPerformance,
      insights,
      summary,
      attendanceCorrelation,
      attendanceDetails,
      reportType,
      startDate: reportType === 'custom' ? startDate : null,
      endDate: reportType === 'custom' ? endDate : null,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
