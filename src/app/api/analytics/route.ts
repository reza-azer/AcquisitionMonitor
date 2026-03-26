import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    const teamId = searchParams.get('teamId');
    const category = searchParams.get('category');

    // Fetch teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, accent_color');

    if (teamsError) throw teamsError;

    // Fetch members
    let membersQuery = supabase.from('members').select('id, name, position, team_id');
    if (teamId) membersQuery = membersQuery.eq('team_id', teamId);
    const { data: members, error: membersError } = await membersQuery;

    if (membersError) throw membersError;

    // Fetch products
    let productsQuery = supabase.from('products').select('*').eq('is_active', true);
    if (category) productsQuery = productsQuery.eq('category', category);
    const { data: products, error: productsError } = await productsQuery;

    if (productsError) throw productsError;

    // Fetch acquisitions
    let acquisitionsQuery = supabase.from('acquisitions').select('*');
    if (week) acquisitionsQuery = acquisitionsQuery.eq('week', parseInt(week));
    const { data: acquisitions, error: acquisitionsError } = await acquisitionsQuery;

    if (acquisitionsError) throw acquisitionsError;

    // Fetch attendances for the current month
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const { data: attendances, error: attendancesError } = await supabase
      .from('attendances')
      .select('member_id, date, status')
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    if (attendancesError) throw attendancesError;

    // Process data
    const memberIds = members.map(m => m.id);
    const filteredAcquisitions = acquisitions.filter(a => memberIds.includes(a.member_id));

    // Calculate weekly trends (all 4 weeks)
    const weeklyTrends: Record<number, { week: number; totalPoints: number; totalQuantity: number }> = [];
    for (let w = 1; w <= 4; w++) {
      const weekAcq = acquisitions.filter(a => a.week === w);
      let totalPoints = 0;
      let totalQuantity = 0;

      weekAcq.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;

        totalQuantity += a.quantity;

        if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find(t => a.quantity <= t.limit) || 
                       product.tier_config[product.tier_config.length - 1];
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

      let totalPoints = 0;
      let totalQuantity = 0;
      const productBreakdown: Record<string, number> = {};

      teamAcquisitions.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;

        totalQuantity += a.quantity;
        productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + a.quantity;

        if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find(t => a.quantity <= t.limit) || 
                       product.tier_config[product.tier_config.length - 1];
          totalPoints += a.quantity * tier.points;
        } else {
          totalPoints += a.quantity * (product.flat_points || 0);
        }
      });

      // Calculate attendance rate
      const teamAttendance = attendances.filter(a => teamMemberIds.includes(a.member_id));
      const presentCount = teamAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
      const attendanceRate = teamAttendance.length > 0 
        ? Math.round((presentCount / teamAttendance.length) * 100) 
        : 0;

      return {
        teamId: team.id,
        teamName: team.name,
        accentColor: team.accent_color,
        totalPoints,
        totalQuantity,
        attendanceRate,
        productBreakdown,
        memberCount: teamMembers.length,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    // Calculate member rankings
    const memberRankings = members.map(member => {
      const memberAcquisitions = filteredAcquisitions.filter(a => a.member_id === member.id);
      let totalPoints = 0;
      let totalQuantity = 0;
      const productBreakdown: Record<string, number> = {};

      memberAcquisitions.forEach(a => {
        const product = products.find(p => p.product_key === a.product_key);
        if (!product) return;

        totalQuantity += a.quantity;
        productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + a.quantity;

        if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find(t => a.quantity <= t.limit) || 
                       product.tier_config[product.tier_config.length - 1];
          totalPoints += a.quantity * tier.points;
        } else {
          totalPoints += a.quantity * (product.flat_points || 0);
        }
      });

      // Calculate attendance
      const memberAttendance = attendances.filter(a => a.member_id === member.id);
      const presentCount = memberAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
      const attendanceRate = memberAttendance.length > 0 
        ? Math.round((presentCount / memberAttendance.length) * 100) 
        : 0;

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
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    // Calculate product category performance
    const categoryPerformance = products.map(product => {
      const productAcquisitions = filteredAcquisitions.filter(a => a.product_key === product.product_key);
      const totalQuantity = productAcquisitions.reduce((sum, a) => sum + a.quantity, 0);
      
      let totalPoints = 0;
      productAcquisitions.forEach(a => {
        if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find(t => a.quantity <= t.limit) || 
                       product.tier_config[product.tier_config.length - 1];
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
        achievementRate: product.weekly_target > 0 
          ? Math.round((totalQuantity / product.weekly_target) * 100) 
          : 0,
      };
    });

    // Calculate insights
    const insights = {
      bestPerformer: memberRankings[0] || null,
      topTeam: teamPerformance[0] || null,
      highestAttendance: memberRankings
        .filter(m => m.attendanceRate > 0)
        .sort((a, b) => b.attendanceRate - a.attendanceRate)[0] || null,
      mostImproved: memberRankings.slice(0, 3), // Top 3 as most improved
      consistencyLeader: memberRankings
        .filter(m => m.totalPoints > 0 && m.attendanceRate > 50)
        .sort((a, b) => (a.attendanceRate + (a.totalPoints / 10)) - (b.attendanceRate + (b.totalPoints / 10)))
        .pop() || null,
    };

    return NextResponse.json({
      weeklyTrends,
      teamPerformance,
      memberRankings,
      categoryPerformance,
      insights,
      summary: {
        totalMembers: members.length,
        totalTeams: teams.length,
        totalPoints: memberRankings.reduce((sum, m) => sum + m.totalPoints, 0),
        totalQuantity: memberRankings.reduce((sum, m) => sum + m.totalQuantity, 0),
        avgAttendanceRate: memberRankings.length > 0
          ? Math.round(memberRankings.reduce((sum, m) => sum + m.attendanceRate, 0) / memberRankings.length)
          : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
