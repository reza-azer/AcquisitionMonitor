'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Trophy, 
  Users, 
  Target, 
  Medal, 
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Crown,
  Clock
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import GridLoader from './GridLoader';

interface WeeklyTrend {
  week: number;
  totalPoints: number;
  totalQuantity: number;
}

interface TeamPerformance {
  teamId: string;
  teamName: string;
  accentColor: string;
  totalPoints: number;
  totalQuantity: number;
  attendanceRate: number;
  productBreakdown: Record<string, number>;
  memberCount: number;
}

interface MemberRanking {
  memberId: string;
  memberName: string;
  position: string;
  teamId: string;
  teamName: string;
  totalPoints: number;
  totalQuantity: number;
  attendanceRate: number;
  productBreakdown: Record<string, number>;
}

interface CategoryPerformance {
  productKey: string;
  productName: string;
  category: string;
  unit: string;
  totalQuantity: number;
  totalPoints: number;
  weeklyTarget: number;
  achievementRate: number;
}

interface Insights {
  bestPerformer: MemberRanking | null;
  topTeam: TeamPerformance | null;
  highestAttendance: MemberRanking | null;
  mostImproved: MemberRanking[];
  consistencyLeader: MemberRanking | null;
}

interface AnalyticsData {
  weeklyTrends: WeeklyTrend[];
  teamPerformance: TeamPerformance[];
  memberRankings: MemberRanking[];
  categoryPerformance: CategoryPerformance[];
  insights: Insights;
  summary: {
    totalMembers: number;
    totalTeams: number;
    totalPoints: number;
    totalQuantity: number;
    avgAttendanceRate: number;
  };
}

export default function DashboardAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedWeek, selectedCategory]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedWeek !== 'all') params.append('week', selectedWeek.toString());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <GridLoader pattern="edge-cw" size="lg" color="#FDB813" mode="stagger" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <p className="text-red-600 font-bold">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { weeklyTrends, teamPerformance, memberRankings, categoryPerformance, insights, summary } = data;

  const COLORS = ['#003d79', '#FDB813', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Activity className="w-7 h-7 text-blue-600" />
            Dashboard Analytics
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">Comprehensive performance insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All Weeks</option>
            <option value="1">Week 1</option>
            <option value="2">Week 2</option>
            <option value="3">Week 3</option>
            <option value="4">Week 4</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All Categories</option>
            <option value="FUNDING">Funding</option>
            <option value="TRANSACTION">Transaction</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-200" />
            <span className="text-xs font-bold text-blue-100 uppercase">Total Members</span>
          </div>
          <div className="text-4xl font-black">{summary.totalMembers}</div>
          <div className="text-xs text-blue-200 mt-2">{summary.totalTeams} Teams</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-green-200" />
            <span className="text-xs font-bold text-green-100 uppercase">Total Points</span>
          </div>
          <div className="text-4xl font-black">{summary.totalPoints.toLocaleString()}</div>
          <div className="text-xs text-green-200 mt-2">{summary.totalQuantity.toLocaleString()} Acquisitions</div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-amber-200" />
            <span className="text-xs font-bold text-amber-100 uppercase">Avg Achievement</span>
          </div>
          <div className="text-4xl font-black">{summary.avgAttendanceRate}%</div>
          <div className="text-xs text-amber-200 mt-2">Attendance Rate</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-200" />
            <span className="text-xs font-bold text-purple-100 uppercase">Products</span>
          </div>
          <div className="text-4xl font-black">{categoryPerformance.length}</div>
          <div className="text-xs text-purple-200 mt-2">Active Products</div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Best Performer */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">Best Performer</h3>
              <p className="text-xs font-bold text-slate-400">Top scorer this period</p>
            </div>
          </div>
          {insights.bestPerformer ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                {insights.bestPerformer.memberName[0]}
              </div>
              <div className="flex-1">
                <div className="font-black text-slate-800">{insights.bestPerformer.memberName}</div>
                <div className="text-xs font-bold text-slate-500">{insights.bestPerformer.teamName}</div>
                <div className="text-sm font-black text-yellow-600">{insights.bestPerformer.totalPoints} pts</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 font-bold">No data available</p>
          )}
        </div>

        {/* Top Team */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">Top Team</h3>
              <p className="text-xs font-bold text-slate-400">Highest performing team</p>
            </div>
          </div>
          {insights.topTeam ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-lg shadow-lg" style={{ backgroundColor: insights.topTeam.accentColor + '20', color: insights.topTeam.accentColor }}>
                {insights.topTeam.teamName[0]}
              </div>
              <div className="flex-1">
                <div className="font-black text-slate-800">{insights.topTeam.teamName}</div>
                <div className="text-xs font-bold text-slate-500">{insights.topTeam.memberCount} Members</div>
                <div className="text-sm font-black text-blue-600">{insights.topTeam.totalPoints} pts</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 font-bold">No data available</p>
          )}
        </div>

        {/* Attendance Leader */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">Attendance Leader</h3>
              <p className="text-xs font-bold text-slate-400">Best attendance rate</p>
            </div>
          </div>
          {insights.highestAttendance ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                {insights.highestAttendance.memberName[0]}
              </div>
              <div className="flex-1">
                <div className="font-black text-slate-800">{insights.highestAttendance.memberName}</div>
                <div className="text-xs font-bold text-slate-500">{insights.highestAttendance.teamName}</div>
                <div className="text-sm font-black text-green-600">{insights.highestAttendance.attendanceRate}%</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 font-bold">No data available</p>
          )}
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Weekly Performance Trend</h3>
            <p className="text-xs font-bold text-slate-400">Points progression across weeks</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tickFormatter={(v) => `W${v}`} stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(v) => `Week ${v}`}
              />
              <Legend />
              <Line type="monotone" dataKey="totalPoints" name="Total Points" stroke="#003d79" strokeWidth={3} dot={{ fill: '#003d79', strokeWidth: 2, r: 6 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="totalQuantity" name="Total Quantity" stroke="#FDB813" strokeWidth={3} dot={{ fill: '#FDB813', strokeWidth: 2, r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Performance Bar Chart */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Team Performance Comparison</h3>
            <p className="text-xs font-bold text-slate-400">Points by team</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="teamName" stroke="#64748b" fontSize={12} angle={-15} textAnchor="end" height={60} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="totalPoints" name="Total Points" fill="#003d79" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Performance with Targets */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Product Target Achievement</h3>
            <p className="text-xs font-bold text-slate-400">Progress toward weekly goals</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryPerformance.map((product, index) => (
            <div key={product.productKey} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider">{product.category}</div>
                  <div className="font-black text-slate-800">{product.productName}</div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-black ${
                  product.achievementRate >= 100 
                    ? 'bg-green-100 text-green-700' 
                    : product.achievementRate >= 50 
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {product.achievementRate}%
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>{product.totalQuantity} / {product.weeklyTarget} {product.unit}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all" 
                    style={{ 
                      width: `${Math.min(product.achievementRate, 100)}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
              <div className="text-xs font-bold text-slate-400">{product.totalPoints} points earned</div>
            </div>
          ))}
        </div>
      </div>

      {/* Member Leaderboard */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center">
            <Medal className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Member Leaderboard</h3>
            <p className="text-xs font-bold text-slate-400">Top performers ranking</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-black text-slate-500 uppercase">Rank</th>
                <th className="text-left py-3 px-4 text-xs font-black text-slate-500 uppercase">Member</th>
                <th className="text-left py-3 px-4 text-xs font-black text-slate-500 uppercase">Team</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-500 uppercase">Points</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-500 uppercase">Acquisitions</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-500 uppercase">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {memberRankings.slice(0, 10).map((member, index) => (
                <tr key={member.memberId} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-4 px-4">
                    {index === 0 ? (
                      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                      </div>
                    ) : index === 1 ? (
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <Medal className="w-4 h-4 text-slate-600" />
                      </div>
                    ) : index === 2 ? (
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Star className="w-4 h-4 text-orange-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black text-slate-600">
                        {index + 1}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-800">{member.memberName}</div>
                    <div className="text-xs text-slate-500">{member.position}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm font-bold text-slate-600">{member.teamName}</div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="font-black text-blue-600">{member.totalPoints}</div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm font-bold text-slate-600">{member.totalQuantity}</div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black ${
                      member.attendanceRate >= 90 
                        ? 'bg-green-100 text-green-700' 
                        : member.attendanceRate >= 70 
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {member.attendanceRate}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
