import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface DailyTeamPerformance {
  date: string;
  day: number;
  [teamName: string]: number | string;
}

interface DailyProductPerformance {
  date: string;
  day: number;
  productKey: string;
  productName: string;
  category: string;
  quantity: number;
  nominal?: number;
  points: number;
}

interface DailyActivity {
  date: string;
  day: number;
  count: number;
  totalPoints: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
    }

    // Fetch teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, accent_color');
    if (teamsError) throw teamsError;

    // Fetch members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name, team_id');
    if (membersError) throw membersError;

    // Fetch products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);
    if (productsError) throw productsError;

    // Fetch acquisitions within date range
    const { data: acquisitions, error: acquisitionsError } = await supabase
      .from('acquisitions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    if (acquisitionsError) throw acquisitionsError;

    // Generate all dates in range
    const dateRange: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateRange.push(d.toISOString().split('T')[0]);
    }

    // Create member lookup
    const memberTeamMap = new Map<string, { teamId: string; teamName: string }>();
    members?.forEach(m => {
      const team = teams.find(t => t.id === m.team_id);
      if (team) {
        memberTeamMap.set(m.id, { teamId: team.id, teamName: team.name });
      }
    });

    // Create product lookup
    const productMap = new Map<string, any>();
    products?.forEach(p => {
      productMap.set(p.product_key, p);
    });

    // 1. Daily Team Performance (cumulative points per day)
    const teamDailyData = new Map<string, Map<string, number>>();
    teams.forEach(t => {
      teamDailyData.set(t.name, new Map<string, number>());
      dateRange.forEach(date => {
        teamDailyData.get(t.name)!.set(date, 0);
      });
    });

    // Calculate cumulative points for each team per day
    const teamCumulativePoints = new Map<string, Map<string, number>>();
    teams.forEach(t => {
      teamCumulativePoints.set(t.name, new Map<string, number>());
      dateRange.forEach(date => {
        teamCumulativePoints.get(t.name)!.set(date, 0);
      });
    });

    // First pass: calculate daily points
    acquisitions?.forEach(a => {
      const memberTeam = memberTeamMap.get(a.member_id);
      if (!memberTeam) return;
      
      const product = productMap.get(a.product_key);
      if (!product || !product.is_active) return;

      let points = 0;
      if (product.category === 'CREDIT') {
        const nominalPerPoint = product.credit_nominal_per_point || 100;
        points = Math.floor((a.nominal || 0) / 1000000 / nominalPerPoint);
      } else if (product.is_tiered && product.tier_config) {
        // For tiered products, we need to calculate based on cumulative quantity
        // For simplicity, use flat calculation per acquisition
        const tier = product.tier_config.find((t: { limit: number; points: number }) => a.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
        points = a.quantity * tier.points;
      } else {
        points = a.quantity * (product.flat_points || 0);
      }

      const currentDaily = teamDailyData.get(memberTeam.teamName)!.get(a.date) || 0;
      teamDailyData.get(memberTeam.teamName)!.set(a.date, currentDaily + points);
    });

    // Second pass: calculate cumulative points
    let runningTotals = new Map<string, number>();
    teams.forEach(t => runningTotals.set(t.name, 0));

    const dailyTeamPerformance: DailyTeamPerformance[] = dateRange.map(date => {
      const entry: DailyTeamPerformance = {
        date,
        day: parseInt(date.split('-')[2])
      };
      
      teams.forEach(team => {
        const dailyPoints = teamDailyData.get(team.name)!.get(date) || 0;
        const prevTotal = runningTotals.get(team.name) || 0;
        const newTotal = prevTotal + dailyPoints;
        runningTotals.set(team.name, newTotal);
        entry[team.name] = newTotal;
      });
      
      return entry;
    });

    // 2. Daily Product Performance
    const productDailyData = new Map<string, {
      quantity: number;
      nominal: number;
      points: number;
    }>();

    const dailyProductPerformance: DailyProductPerformance[] = [];
    
    for (const date of dateRange) {
      const dayAcquisitions = acquisitions?.filter(a => a.date === date) || [];
      
      for (const product of products || []) {
        const productAcqs = dayAcquisitions.filter(a => a.product_key === product.product_key);
        
        if (productAcqs.length === 0) {
          dailyProductPerformance.push({
            date,
            day: parseInt(date.split('-')[2]),
            productKey: product.product_key,
            productName: product.product_name,
            category: product.category,
            quantity: 0,
            points: 0
          });
          continue;
        }

        let totalQuantity = 0;
        let totalNominal = 0;
        let totalPoints = 0;

        for (const acq of productAcqs) {
          totalQuantity += acq.quantity;
          if (product.category === 'CREDIT') {
            totalNominal += acq.nominal || 0;
            const nominalPerPoint = product.credit_nominal_per_point || 100;
            totalPoints += Math.floor((acq.nominal || 0) / 1000000 / nominalPerPoint);
          } else if (product.is_tiered && product.tier_config) {
            const tier = product.tier_config.find((t: { limit: number; points: number }) => acq.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
            totalPoints += acq.quantity * tier.points;
          } else {
            totalPoints += acq.quantity * (product.flat_points || 0);
          }
        }

        dailyProductPerformance.push({
          date,
          day: parseInt(date.split('-')[2]),
          productKey: product.product_key,
          productName: product.product_name,
          category: product.category,
          quantity: product.category === 'CREDIT' ? totalQuantity : totalQuantity,
          nominal: product.category === 'CREDIT' ? totalNominal : undefined,
          points: totalPoints
        });
      }
    }

    // 3. Daily Activity (total acquisitions and points per day)
    const dailyActivity: DailyActivity[] = dateRange.map(date => {
      const dayAcqs = acquisitions?.filter(a => a.date === date) || [];
      let totalCount = 0;
      let totalPoints = 0;

      for (const acq of dayAcqs) {
        totalCount += acq.quantity;
        const product = productMap.get(acq.product_key);
        if (product && product.is_active) {
          if (product.category === 'CREDIT') {
            const nominalPerPoint = product.credit_nominal_per_point || 100;
            totalPoints += Math.floor((acq.nominal || 0) / 1000000 / nominalPerPoint);
          } else if (product.is_tiered && product.tier_config) {
            const tier = product.tier_config.find((t: { limit: number; points: number }) => acq.quantity <= t.limit) || product.tier_config[product.tier_config.length - 1];
            totalPoints += acq.quantity * tier.points;
          } else {
            totalPoints += acq.quantity * (product.flat_points || 0);
          }
        }
      }

      return {
        date,
        day: parseInt(date.split('-')[2]),
        count: totalCount,
        totalPoints
      };
    });

    return NextResponse.json({
      teamPerformance: dailyTeamPerformance,
      productPerformance: dailyProductPerformance,
      dailyActivity
    });
  } catch (error) {
    console.error('[Daily Analytics API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily analytics' }, { status: 500 });
  }
}
