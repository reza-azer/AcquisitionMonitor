import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      const monthStr = String(parseInt(month)).padStart(2, '0');
      const yearNum = parseInt(year);
      dateFilter = {
        start: `${yearNum}-${monthStr}-01`,
        end: `${yearNum}-${monthStr}-31`
      };
    } else if (reportType === 'monthly') {
      // Current month
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      const currentYear = today.getFullYear();
      dateFilter = {
        start: `${currentYear}-${currentMonth}-01`,
        end: `${currentYear}-${currentMonth}-31`
      };
    } else {
      // Weekly - default to current month
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      const currentYear = today.getFullYear();
      dateFilter = {
        start: `${currentYear}-${currentMonth}-01`,
        end: `${currentYear}-${currentMonth}-31`
      };
    }

    // Fetch acquisitions with date filter
    let acquisitionsQuery = supabase.from('acquisitions').select('*');
    if (dateFilter.start) acquisitionsQuery = acquisitionsQuery.gte('date', dateFilter.start);
    if (dateFilter.end) acquisitionsQuery = acquisitionsQuery.lte('date', dateFilter.end);
    const { data: acquisitions, error: acquisitionsError } = await acquisitionsQuery;
    if (acquisitionsError) throw acquisitionsError;

    // Fetch attendances based on report type
    let attendanceQuery = supabase.from('attendances').select('member_id, date, status, late_minutes');
    if (dateFilter.start && dateFilter.end) {
      attendanceQuery = attendanceQuery.gte('date', dateFilter.start).lte('date', dateFilter.end);
    }
    const { data: attendances, error: attendancesError } = await attendanceQuery;
    if (attendancesError) throw attendancesError;

    const memberIds = members.map(m => m.id);
    const filteredAcquisitions = acquisitions.filter(a => memberIds.includes(a.member_id));

    // Calculate weekly trends (all 4 weeks)
    const weeklyTrends: { week: number; totalPoints: number; totalQuantity: number }[] = [];
    for (let w = 1; w <= 4; w++) {
      const weekAcq = acquisitions.filter(a => a.week === w);
      let totalPoints = 0;
      let totalQuantity = 0;
      weekAcq.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;
        totalQuantity += a.quantity;
        if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find((t: { limit: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
          totalPoints += a.quantity * tier.points;
        } else {
          totalPoints += a.quantity * (product.flat_points || 0);
        }
      });
      weeklyTrends.push({ week: w, totalPoints, totalQuantity });
    }

    // Calculate team performance
    const teamPerformance = teams.map(team => {
      const teamMembers = members.filter(m => m.team_id === team.id);
      const teamMemberIds = teamMembers.map(m => m.id);
      const teamAcquisitions = filteredAcquisitions.filter(a => teamMemberIds.includes(a.member_id));
      const teamAttendances = attendances.filter(a => teamMemberIds.includes(a.member_id));
      let totalPoints = 0;
      let totalQuantity = 0;
      const productBreakdown: Record<string, number> = {};
      teamAcquisitions.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;
        totalQuantity += a.quantity;
        productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + a.quantity;
        if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find((t: { limit: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
          totalPoints += a.quantity * tier.points;
        } else {
          totalPoints += a.quantity * (product.flat_points || 0);
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
      const memberAcquisitions = filteredAcquisitions.filter(a => a.member_id === member.id);
      const memberAttendances = attendances.filter(a => a.member_id === member.id);
      let totalPoints = 0;
      let totalQuantity = 0;
      const productBreakdown: Record<string, number> = {};
      memberAcquisitions.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;
        totalQuantity += a.quantity;
        productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + a.quantity;
        if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find((t: { limit: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
          totalPoints += a.quantity * tier.points;
        } else {
          totalPoints += a.quantity * (product.flat_points || 0);
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
      const totalQuantity = productAcquisitions.reduce((sum, a) => sum + a.quantity, 0);
      let totalPoints = 0;
      productAcquisitions.forEach(a => {
        if (product.is_tiered && product.tier_config) {
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
      teamPerformance,
      memberRankings,
      categoryPerformance,
      insights,
      summary,
      attendanceCorrelation,
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
