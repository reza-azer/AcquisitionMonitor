import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface ChartDataRequest {
  metric: 'points' | 'quantity' | 'attendance_rate' | 'nominal';
  dimension: 'team' | 'member' | 'product' | 'category' | 'week' | 'date';
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'combo' | 'horizontal_bar';
  filters?: {
    teams?: string[];
    members?: string[];
    products?: string[];
    categories?: string[];
    weeks?: number[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
  groupBy?: string;
  sortBy?: 'asc' | 'desc';
  limit?: number;
  showTarget?: boolean;
  showComparison?: boolean;
}

interface ProductWithConfig {
  id: string;
  product_key: string;
  product_name: string;
  category: 'FUNDING' | 'TRANSACTION' | 'CREDIT';
  unit: string;
  weekly_target: number;
  is_tiered: boolean;
  tier_config?: { limit: number; points: number }[];
  flat_points?: number;
  credit_nominal_per_point?: number;
  is_active: boolean;
}

interface MemberWithTeam {
  id: string;
  name: string;
  position: string;
  team_id: string;
  team_name?: string;
}

interface TeamData {
  id: string;
  name: string;
  accent_color: string;
}

/**
 * Calculate points from acquisition based on product configuration
 */
function calculatePoints(acquisition: any, product: ProductWithConfig): number {
  if (product.category === 'CREDIT') {
    const nominalPerPoint = product.credit_nominal_per_point || 100;
    return Math.floor(((acquisition.nominal || 0) / 1000000) / nominalPerPoint);
  } else if (product.is_tiered && product.tier_config) {
    const tier = product.tier_config.find(t => acquisition.quantity <= t.limit) 
      || product.tier_config[product.tier_config.length - 1];
    return acquisition.quantity * tier.points;
  } else {
    return acquisition.quantity * (product.flat_points || 0);
  }
}

/**
 * Get quantity from acquisition (handles CREDIT vs non-CREDIT)
 */
function getQuantity(acquisition: any, product: ProductWithConfig): number {
  return product.category === 'CREDIT' ? 1 : acquisition.quantity;
}

/**
 * Get nominal value from acquisition
 */
function getNominal(acquisition: any): number {
  return acquisition.nominal || 0;
}

export async function POST(request: Request) {
  try {
    const body: ChartDataRequest = await request.json();
    const { metric, dimension, chartType, filters = {}, groupBy, sortBy = 'desc', limit, showTarget = false } = body;

    // Fetch base data
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, accent_color');
    if (teamsError) throw teamsError;

    const { data: membersRaw, error: membersError } = await supabase
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
    if (membersError) throw membersError;

    const members: MemberWithTeam[] = membersRaw.map((m: any) => ({
      id: m.id,
      name: m.name,
      position: m.position,
      team_id: m.team_id,
      team_name: m.team?.name || '',
    }));

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);
    if (productsError) throw productsError;

    // Build date filter
    let dateFilterStart: string | undefined;
    let dateFilterEnd: string | undefined;

    if (filters.dateRange?.start && filters.dateRange?.end) {
      dateFilterStart = filters.dateRange.start;
      dateFilterEnd = filters.dateRange.end;
    } else if (filters.weeks && filters.weeks.length > 0) {
      // Convert weeks to approximate date range (assuming current month)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      
      const minWeek = Math.min(...filters.weeks);
      const maxWeek = Math.max(...filters.weeks);
      
      dateFilterStart = `${year}-${String(month).padStart(2, '0')}-${String((minWeek - 1) * 7 + 1).padStart(2, '0')}`;
      dateFilterEnd = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(maxWeek * 7, lastDay)).padStart(2, '0')}`;
    } else {
      // Default to current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      dateFilterStart = `${year}-${String(month).padStart(2, '0')}-01`;
      dateFilterEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // Fetch acquisitions with date filter
    let acquisitionsQuery = supabase
      .from('acquisitions')
      .select('*')
      .gte('date', dateFilterStart || '2020-01-01')
      .lte('date', dateFilterEnd || '2099-12-31');
    
    const { data: acquisitions, error: acquisitionsError } = await acquisitionsQuery;
    if (acquisitionsError) throw acquisitionsError;

    // Fetch attendances
    const { data: attendances, error: attendancesError } = await supabase
      .from('attendances')
      .select('member_id, date, status')
      .gte('date', dateFilterStart || '2020-01-01')
      .lte('date', dateFilterEnd || '2099-12-31');
    if (attendancesError) throw attendancesError;

    // Apply filters
    let filteredAcquisitions = acquisitions;
    let filteredMembers = members;
    let filteredTeams = teams;

    if (filters.teams && filters.teams.length > 0) {
      filteredTeams = teams.filter(t => filters.teams!.includes(t.id));
      filteredMembers = members.filter(m => filters.teams!.includes(m.team_id));
      const memberIds = filteredMembers.map(m => m.id);
      filteredAcquisitions = acquisitions.filter(a => memberIds.includes(a.member_id));
    }

    if (filters.members && filters.members.length > 0) {
      filteredMembers = members.filter(m => filters.members!.includes(m.id));
      const memberIds = filteredMembers.map(m => m.id);
      filteredAcquisitions = acquisitions.filter(a => memberIds.includes(a.member_id));
    }

    if (filters.products && filters.products.length > 0) {
      filteredAcquisitions = filteredAcquisitions.filter(a => 
        filters.products!.includes(a.product_key)
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      const productKeys = products
        .filter(p => filters.categories!.includes(p.category))
        .map(p => p.product_key);
      filteredAcquisitions = filteredAcquisitions.filter(a => 
        productKeys.includes(a.product_key)
      );
    }

    // Prepare chart data based on dimension
    let chartData: any[] = [];
    let targetData: any[] = [];
    let comparisonData: any[] = [];

    switch (dimension) {
      case 'team': {
        const teamData = filteredTeams.map(team => {
          const teamMembers = filteredMembers.filter(m => m.team_id === team.id);
          const memberIds = teamMembers.map(m => m.id);
          const teamAcquisitions = filteredAcquisitions.filter(a => memberIds.includes(a.member_id));
          const teamAttendances = attendances.filter(a => memberIds.includes(a.member_id));

          let totalMetric = 0;
          const productBreakdown: Record<string, number> = {};

          teamAcquisitions.forEach(a => {
            const product = products.find((p: ProductWithConfig) => p.product_key === a.product_key);
            if (!product) return;

            productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + 
              (metric === 'points' ? calculatePoints(a, product) : 
               metric === 'quantity' ? getQuantity(a, product) : 
               metric === 'nominal' ? getNominal(a) : 0);

            if (metric === 'points') {
              totalMetric += calculatePoints(a, product);
            } else if (metric === 'quantity') {
              totalMetric += getQuantity(a, product);
            } else if (metric === 'nominal') {
              totalMetric += getNominal(a);
            }
          });

          // Calculate attendance rate if needed
          let attendanceRate = 0;
          if (metric === 'attendance_rate') {
            const totalDays = teamAttendances.length;
            const presentDays = teamAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
            attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
            totalMetric = attendanceRate;
          }

          // Calculate target
          let target = 0;
          if (showTarget) {
            const teamProducts = filters.products?.length 
              ? products.filter((p: ProductWithConfig) => filters.products!.includes(p.product_key))
              : products;
            target = teamProducts.reduce((sum: number, p: ProductWithConfig) => sum + p.weekly_target, 0);
            if (metric === 'points' || metric === 'quantity') {
              target = teamProducts.reduce((sum: number, p: ProductWithConfig) => {
                if (p.category === 'CREDIT') {
                  return sum + p.weekly_target;
                } else if (p.is_tiered && p.tier_config) {
                  return sum + p.weekly_target * p.tier_config[0].points;
                } else {
                  return sum + p.weekly_target * (p.flat_points || 0);
                }
              }, 0);
            }
          }

          return {
            id: team.id,
            name: team.name,
            value: totalMetric,
            accent_color: team.accent_color,
            target,
            productBreakdown,
            attendanceRate,
          };
        });

        chartData = teamData.sort((a, b) => 
          sortBy === 'desc' ? b.value - a.value : a.value - b.value
        );
        if (limit) chartData = chartData.slice(0, limit);
        break;
      }

      case 'member': {
        const memberData = filteredMembers.map(member => {
          const memberAcquisitions = filteredAcquisitions.filter(a => a.member_id === member.id);
          const memberAttendances = attendances.filter(a => a.member_id === member.id);

          let totalMetric = 0;
          const productBreakdown: Record<string, number> = {};

          memberAcquisitions.forEach(a => {
            const product = products.find((p: ProductWithConfig) => p.product_key === a.product_key);
            if (!product) return;

            productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + 
              (metric === 'points' ? calculatePoints(a, product) : 
               metric === 'quantity' ? getQuantity(a, product) : 
               metric === 'nominal' ? getNominal(a) : 0);

            if (metric === 'points') {
              totalMetric += calculatePoints(a, product);
            } else if (metric === 'quantity') {
              totalMetric += getQuantity(a, product);
            } else if (metric === 'nominal') {
              totalMetric += getNominal(a);
            }
          });

          let attendanceRate = 0;
          if (metric === 'attendance_rate') {
            const totalDays = memberAttendances.length;
            const presentDays = memberAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
            attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
            totalMetric = attendanceRate;
          }

          let target = 0;
          if (showTarget) {
            const memberProducts = filters.products?.length 
              ? products.filter((p: ProductWithConfig) => filters.products!.includes(p.product_key))
              : products;
            target = memberProducts.reduce((sum: number, p: ProductWithConfig) => sum + p.weekly_target, 0);
          }

          return {
            id: member.id,
            name: member.name,
            position: member.position,
            team_id: member.team_id,
            team_name: member.team_name,
            value: totalMetric,
            target,
            productBreakdown,
            attendanceRate,
          };
        });

        chartData = memberData.sort((a, b) => 
          sortBy === 'desc' ? b.value - a.value : a.value - b.value
        );
        if (limit) chartData = chartData.slice(0, limit);
        break;
      }

      case 'product': {
        const productData = products
          .filter((p: ProductWithConfig) => {
            if (filters.products && filters.products.length > 0) {
              return filters.products.includes(p.product_key);
            }
            if (filters.categories && filters.categories.length > 0) {
              return filters.categories.includes(p.category);
            }
            return true;
          })
          .map((product: ProductWithConfig) => {
            const productAcquisitions = filteredAcquisitions.filter(a => a.product_key === product.product_key);

            let totalMetric = 0;
            let totalNominal = 0;

            productAcquisitions.forEach(a => {
              if (metric === 'points') {
                totalMetric += calculatePoints(a, product);
              } else if (metric === 'quantity') {
                totalMetric += getQuantity(a, product);
              } else if (metric === 'nominal') {
                totalMetric += getNominal(a);
                totalNominal += getNominal(a);
              }
            });

            let target = 0;
            if (showTarget) {
              target = product.weekly_target;
              if (metric === 'points' && product.is_tiered && product.tier_config) {
                target = product.weekly_target * product.tier_config[0].points;
              }
            }

            return {
              id: product.id,
              product_key: product.product_key,
              name: product.product_name,
              category: product.category,
              unit: product.unit,
              value: totalMetric,
              totalNominal: product.category === 'CREDIT' ? totalNominal : undefined,
              target,
            };
          });

        chartData = productData.sort((a, b) => 
          sortBy === 'desc' ? b.value - a.value : a.value - b.value
        );
        if (limit) chartData = chartData.slice(0, limit);
        break;
      }

      case 'category': {
        const categories = ['FUNDING', 'TRANSACTION', 'CREDIT'];
        const categoryData = categories
          .filter(cat => {
            if (filters.categories && filters.categories.length > 0) {
              return filters.categories.includes(cat);
            }
            return true;
          })
          .map(category => {
            const categoryProducts = products.filter((p: ProductWithConfig) => p.category === category);
            const categoryProductKeys = categoryProducts.map(p => p.product_key);
            const categoryAcquisitions = filteredAcquisitions.filter(a => 
              categoryProductKeys.includes(a.product_key)
            );

            let totalMetric = 0;
            const productBreakdown: Record<string, number> = {};

            categoryAcquisitions.forEach(a => {
              const product = products.find((p: ProductWithConfig) => p.product_key === a.product_key);
              if (!product) return;

              productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + 
                (metric === 'points' ? calculatePoints(a, product) : 
                 metric === 'quantity' ? getQuantity(a, product) : 
                 metric === 'nominal' ? getNominal(a) : 0);

              if (metric === 'points') {
                totalMetric += calculatePoints(a, product);
              } else if (metric === 'quantity') {
                totalMetric += getQuantity(a, product);
              } else if (metric === 'nominal') {
                totalMetric += getNominal(a);
              }
            });

            let target = 0;
            if (showTarget) {
              target = categoryProducts.reduce((sum, p) => sum + p.weekly_target, 0);
            }

            return {
              name: category,
              value: totalMetric,
              productCount: categoryProducts.length,
              productBreakdown,
              target,
            };
          });

        chartData = categoryData;
        break;
      }

      case 'week': {
        const weeks = filters.weeks?.length ? filters.weeks : [1, 2, 3, 4];
        const weekData = weeks.map(week => {
          const weekAcquisitions = filteredAcquisitions.filter(a => {
            const acquisitionWeek = a.week ?? Math.ceil(new Date(a.date).getDate() / 7);
            return acquisitionWeek === week;
          });

          let totalMetric = 0;
          const productBreakdown: Record<string, number> = {};

          weekAcquisitions.forEach(a => {
            const product = products.find((p: ProductWithConfig) => p.product_key === a.product_key);
            if (!product) return;

            productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + 
              (metric === 'points' ? calculatePoints(a, product) : 
               metric === 'quantity' ? getQuantity(a, product) : 
               metric === 'nominal' ? getNominal(a) : 0);

            if (metric === 'points') {
              totalMetric += calculatePoints(a, product);
            } else if (metric === 'quantity') {
              totalMetric += getQuantity(a, product);
            } else if (metric === 'nominal') {
              totalMetric += getNominal(a);
            }
          });

          let target = 0;
          if (showTarget) {
            target = products.reduce((sum: number, p: ProductWithConfig) => sum + p.weekly_target, 0);
          }

          return {
            name: `Week ${week}`,
            week,
            value: totalMetric,
            productBreakdown,
            target,
          };
        });

        chartData = weekData;
        break;
      }

      case 'date': {
        // Group by date
        const dateGroups: Record<string, any[]> = {};
        filteredAcquisitions.forEach(a => {
          if (!dateGroups[a.date]) {
            dateGroups[a.date] = [];
          }
          dateGroups[a.date].push(a);
        });

        const dateData = Object.entries(dateGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, acquisitions]) => {
            let totalMetric = 0;
            const productBreakdown: Record<string, number> = {};

            acquisitions.forEach(a => {
              const product = products.find((p: ProductWithConfig) => p.product_key === a.product_key);
              if (!product) return;

              productBreakdown[a.product_key] = (productBreakdown[a.product_key] || 0) + 
                (metric === 'points' ? calculatePoints(a, product) : 
                 metric === 'quantity' ? getQuantity(a, product) : 
                 metric === 'nominal' ? getNominal(a) : 0);

              if (metric === 'points') {
                totalMetric += calculatePoints(a, product);
              } else if (metric === 'quantity') {
                totalMetric += getQuantity(a, product);
              } else if (metric === 'nominal') {
                totalMetric += getNominal(a);
              }
            });

            return {
              date,
              name: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
              value: totalMetric,
              productBreakdown,
            };
          });

        chartData = dateData;
        break;
      }
    }

    // Build groupBy data if specified
    let groupedData: any[] = [];
    if (groupBy) {
      switch (groupBy) {
        case 'week': {
          const weeks = filters.weeks?.length ? filters.weeks : [1, 2, 3, 4];
          groupedData = weeks.map(week => {
            const weekAcquisitions = filteredAcquisitions.filter(a => {
              const acquisitionWeek = a.week ?? Math.ceil(new Date(a.date).getDate() / 7);
              return acquisitionWeek === week;
            });

            const groupValue: Record<string, number> = {};

            if (dimension === 'team') {
              filteredTeams.forEach(team => {
                const teamMembers = filteredMembers.filter(m => m.team_id === team.id);
                const memberIds = teamMembers.map(m => m.id);
                const teamAcquisitions = weekAcquisitions.filter(a => memberIds.includes(a.member_id));
                
                let teamValue = 0;
                teamAcquisitions.forEach(a => {
                  const product = products.find((p: ProductWithConfig) => p.product_key === a.product_key);
                  if (!product) return;

                  if (metric === 'points') {
                    teamValue += calculatePoints(a, product);
                  } else if (metric === 'quantity') {
                    teamValue += getQuantity(a, product);
                  } else if (metric === 'nominal') {
                    teamValue += getNominal(a);
                  }
                });

                groupValue[team.name] = teamValue;
              });
            }

            return {
              name: `Week ${week}`,
              week,
              ...groupValue,
            };
          });
          break;
        }
      }
    }

    return NextResponse.json({
      chartData,
      groupedData,
      targetData,
      comparisonData,
      metadata: {
        metric,
        dimension,
        chartType,
        filters,
        totalRecords: chartData.length,
        dateRange: { start: dateFilterStart, end: dateFilterEnd },
      },
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
}
