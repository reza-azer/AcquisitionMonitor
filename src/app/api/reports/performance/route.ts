import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const reportType = searchParams.get('type') || 'weekly';

    const { data: teams, error: teamsError } = await supabase.from('teams').select('id, name, accent_color');
    if (teamsError) throw teamsError;

    const { data: members, error: membersError } = await supabase.from('members').select('id, name, position, team_id');
    if (membersError) throw membersError;

    const { data: products, error: productsError } = await supabase.from('products').select('*').eq('is_active', true);
    if (productsError) throw productsError;

    let acquisitionsQuery = supabase.from('acquisitions').select('*');
    if (reportType === 'weekly') {
      const today = new Date();
      const weekNum = Math.ceil(today.getDate() / 7);
      acquisitionsQuery = acquisitionsQuery.eq('week', weekNum);
    }
    const { data: acquisitions, error: acquisitionsError } = await acquisitionsQuery;
    if (acquisitionsError) throw acquisitionsError;

    let attendanceQuery = supabase.from('attendances').select('member_id, date, status, late_minutes');
    if (startDate && endDate) {
      attendanceQuery = attendanceQuery.gte('date', startDate).lte('date', endDate);
    } else {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      attendanceQuery = attendanceQuery.gte('date', startOfMonth.toISOString().split('T')[0]);
    }
    const { data: attendances, error: attendancesError } = await attendanceQuery;
    if (attendancesError) throw attendancesError;

    const teamPerformance = teams.map(team => {
      const teamMembers = members.filter(m => m.team_id === team.id);
      const teamMemberIds = teamMembers.map(m => m.id);
      const teamAcquisitions = acquisitions.filter(a => teamMemberIds.includes(a.member_id));
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
          const tier = product.tier_config.find(t => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
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
        teamId: team.id, teamName: team.name, accentColor: team.accent_color, memberCount: teamMembers.length,
        totalPoints, totalQuantity, productBreakdown, attendanceRate, presentDays, lateDays, leaveDays, alphaDays, totalDays, targetAchievement,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    const memberPerformance = members.map(member => {
      const memberAcquisitions = acquisitions.filter(a => a.member_id === member.id);
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
          const tier = product.tier_config.find(t => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
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
        return { productKey: p.product_key, productName: p.product_name, quantity: qty, target: p.weekly_target, achievement: p.weekly_target > 0 ? Math.round((qty / p.weekly_target) * 100) : 0 };
      });
      return {
        memberId: member.id, memberName: member.name, position: member.position, teamId: member.team_id,
        teamName: teams.find(t => t.id === member.team_id)?.name || '', totalPoints, totalQuantity, productBreakdown,
        attendanceRate, presentDays, totalDays, targetAchievements,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    const summary = {
      totalMembers: members.length, totalTeams: teams.length,
      totalPoints: memberPerformance.reduce((sum, m) => sum + m.totalPoints, 0),
      totalQuantity: memberPerformance.reduce((sum, m) => sum + m.totalQuantity, 0),
      avgAttendanceRate: memberPerformance.length > 0 ? Math.round(memberPerformance.reduce((sum, m) => sum + m.attendanceRate, 0) / memberPerformance.length) : 0,
      totalPresentDays: memberPerformance.reduce((sum, m) => sum + m.presentDays, 0),
      totalLateDays: memberPerformance.reduce((sum, m) => sum + attendances.filter(a => a.member_id === m.memberId && a.status === 'late').length, 0),
      totalLeaveDays: memberPerformance.reduce((sum, m) => sum + attendances.filter(a => a.member_id === m.memberId && a.status === 'leave').length, 0),
      totalAlphaDays: memberPerformance.reduce((sum, m) => sum + attendances.filter(a => a.member_id === m.memberId && a.status === 'alpha').length, 0),
    };

    const topPerformers = memberPerformance.slice(0, 5);
    const bottomPerformers = memberPerformance.slice(-5).reverse();

    const productBreakdown = products.map(p => {
      const totalQty = memberPerformance.reduce((sum, m) => sum + (m.productBreakdown[p.product_key] || 0), 0);
      return { productKey: p.product_key, productName: p.product_name, category: p.category, unit: p.unit, totalQuantity: totalQty, weeklyTarget: p.weekly_target, achievementRate: p.weekly_target > 0 ? Math.round((totalQty / p.weekly_target) * 100) : 0 };
    }).sort((a, b) => b.totalQuantity - a.totalQuantity);

    const attendanceCorrelation = memberPerformance.filter(m => m.totalDays > 0).map(m => ({
      memberId: m.memberId, memberName: m.memberName, attendanceRate: m.attendanceRate, totalPoints: m.totalPoints, totalQuantity: m.totalQuantity,
    })).sort((a, b) => b.attendanceRate - a.attendanceRate);

    return NextResponse.json({
      reportType, startDate, endDate, teamPerformance, memberPerformance, summary, topPerformers,
      bottomPerformers, productBreakdown, attendanceCorrelation, generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching performance report:', error);
    return NextResponse.json({ error: 'Failed to fetch performance report' }, { status: 500 });
  }
}
