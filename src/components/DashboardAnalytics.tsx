'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Trophy, Users, Target, Medal, Star,
  CheckCircle2, BarChart3, PieChart as PieChartIcon,
  Activity, Crown, Clock, FileSpreadsheet, Download,
  Calendar, FileText, XCircle, AlertCircle
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter } from 'recharts';
import GridLoader from './GridLoader';

interface WeeklyTrend {
  week: number;
  totalPoints: number;
  totalQuantity: number;
}

interface TeamWeeklyTrend {
  teamId: string;
  teamName: string;
  accentColor: string;
  weeklyData: { week: number; [teamName: string]: number }[];
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
  presentDays: number;
  lateDays: number;
  leaveDays: number;
  alphaDays: number;
  totalDays: number;
  targetAchievement: number;
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
  presentDays: number;
  totalDays: number;
  targetAchievements: Array<{ productKey: string; productName: string; quantity: number; target: number; achievement: number }>;
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

interface AttendanceCorrelation {
  memberId: string;
  memberName: string;
  attendanceRate: number;
  totalPoints: number;
  totalQuantity: number;
}

interface Insights {
  bestPerformer: MemberRanking | null;
  topTeam: TeamPerformance | null;
  highestAttendance: MemberRanking | null;
  mostImproved: MemberRanking[];
  consistencyLeader: MemberRanking | null;
}

interface Summary {
  totalMembers: number;
  totalTeams: number;
  totalPoints: number;
  totalQuantity: number;
  avgAttendanceRate: number;
  totalPresentDays: number;
  totalLateDays: number;
  totalLeaveDays: number;
  totalAlphaDays: number;
}

interface AnalyticsData {
  weeklyTrends: WeeklyTrend[];
  teamWeeklyTrends: TeamWeeklyTrend[];
  teamPerformance: TeamPerformance[];
  memberRankings: MemberRanking[];
  categoryPerformance: CategoryPerformance[];
  insights: Insights;
  summary: Summary;
  attendanceCorrelation: AttendanceCorrelation[];
  reportType: string;
  startDate: string | null;
  endDate: string | null;
  generatedAt: string;
}

export default function DashboardAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [reportType, startDate, endDate, selectedMonth, selectedYear]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (reportType === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      if (reportType !== 'custom') {
        params.append('month', selectedMonth);
        params.append('year', selectedYear);
      }
      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      
      // Check if there's no data
      if (result.summary.totalMembers === 0 || result.memberRankings.length === 0) {
        setData(null); // Set to null to show "no data" message
      } else {
        setData(result);
      }
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!(window as typeof window & { XLSX?: any }).XLSX) {
      alert('Excel library not loaded yet');
      return;
    }
    setIsExporting(true);
    try {
      const workbook = (window as any).XLSX.utils.book_new();
      if (data) {
        // Summary Sheet
        const summaryData = [
          ['Analytics Report Summary'],
          ['Report Type', data.reportType],
          ['Generated At', new Date(data.generatedAt).toLocaleString()],
          [],
          ['Total Members', data.summary.totalMembers],
          ['Total Teams', data.summary.totalTeams],
          ['Total Points', data.summary.totalPoints],
          ['Total Acquisitions', data.summary.totalQuantity],
          ['Avg Attendance Rate', `${data.summary.avgAttendanceRate}%`],
          [],
          ['Attendance Breakdown'],
          ['Present Days', data.summary.totalPresentDays],
          ['Late Days', data.summary.totalLateDays],
          ['Leave Days', data.summary.totalLeaveDays],
          ['Alpha Days', data.summary.totalAlphaDays],
        ];
        const summarySheet = (window as any).XLSX.utils.aoa_to_sheet(summaryData);
        (window as any).XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Team Performance Sheet
        const teamData = data.teamPerformance.map(t => ({
          'Team Name': t.teamName,
          'Members': t.memberCount,
          'Total Points': t.totalPoints,
          'Total Acquisitions': t.totalQuantity,
          'Attendance Rate': `${t.attendanceRate}%`,
          'Target Achievement': `${t.targetAchievement}%`,
          'Present Days': t.presentDays,
          'Late Days': t.lateDays,
          'Leave Days': t.leaveDays,
          'Alpha Days': t.alphaDays,
        }));
        const teamSheet = (window as any).XLSX.utils.json_to_sheet(teamData);
        (window as any).XLSX.utils.book_append_sheet(workbook, teamSheet, 'Team Performance');

        // Member Performance Sheet
        const memberData = data.memberRankings.map(m => ({
          'Name': m.memberName,
          'Position': m.position,
          'Team': m.teamName,
          'Total Points': m.totalPoints,
          'Total Acquisitions': m.totalQuantity,
          'Attendance Rate': `${m.attendanceRate}%`,
          'Days Present': m.presentDays,
          'Total Days': m.totalDays,
        }));
        const memberSheet = (window as any).XLSX.utils.json_to_sheet(memberData);
        (window as any).XLSX.utils.book_append_sheet(workbook, memberSheet, 'Member Performance');

        // Product Breakdown Sheet
        const productData = data.categoryPerformance.map(p => ({
          'Product Key': p.productKey,
          'Product Name': p.productName,
          'Category': p.category,
          'Unit': p.unit,
          'Total Quantity': p.totalQuantity,
          'Weekly Target': p.weeklyTarget,
          'Achievement Rate': `${p.achievementRate}%`,
          'Total Points': p.totalPoints,
        }));
        const productSheet = (window as any).XLSX.utils.json_to_sheet(productData);
        (window as any).XLSX.utils.book_append_sheet(workbook, productSheet, 'Product Breakdown');

        // Top Performers Sheet
        const topPerformersData = data.memberRankings.slice(0, 10).map((m, i) => ({
          'Rank': i + 1,
          'Name': m.memberName,
          'Team': m.teamName,
          'Position': m.position,
          'Total Points': m.totalPoints,
          'Total Acquisitions': m.totalQuantity,
          'Attendance Rate': `${m.attendanceRate}%`,
        }));
        const topPerformersSheet = (window as any).XLSX.utils.json_to_sheet(topPerformersData);
        (window as any).XLSX.utils.book_append_sheet(workbook, topPerformersSheet, 'Top Performers');

        const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        const fileName = `Analytics_Report_${data.reportType}_${monthName.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        (window as any).XLSX.writeFile(workbook, fileName);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report');
    } finally {
      setIsExporting(false);
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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2">Belum Ada Data</h3>
        <p className="text-slate-500 font-bold text-center max-w-md">
          Tidak ada data akuisisi untuk periode {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    );
  }

  const { weeklyTrends, teamWeeklyTrends, teamPerformance, memberRankings, categoryPerformance, insights, summary, attendanceCorrelation } = data;
  const COLORS = ['#003d79', '#FDB813', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

  // Helper function to merge team weekly data into a single array for the chart
  const mergeTeamWeeklyData = (teamWeeklyTrends: TeamWeeklyTrend[]) => {
    const merged: { week: number; [teamName: string]: number }[] = [];
    for (let w = 1; w <= 4; w++) {
      const weekData: { week: number; [teamName: string]: number } = { week: w };
      teamWeeklyTrends.forEach(team => {
        const dataPoint = team.weeklyData.find(d => d.week === w);
        if (dataPoint) {
          weekData[team.teamName] = dataPoint[team.teamName] || 0;
        }
      });
      merged.push(weekData);
    }
    return merged;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Activity className="w-7 h-7 text-blue-600" />
            Dashboard Analytics
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">
            {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {reportType !== 'custom' && (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
              >
                {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </>
          )}
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom Range</option>
          </select>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black shadow-lg transition-all ${
              isExporting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'
            }`}
          >
            {isExporting ? <GridLoader pattern="edge-cw" size="sm" color="#fff" mode="stagger" /> : <Download className="w-4 h-4" />}
            EXPORT
          </button>
        </div>
      </div>

      {/* Custom Date Range Filter */}
      {reportType === 'custom' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAnalytics}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-[42px] rounded-xl font-black text-sm transition-all"
              >
                APPLY FILTER
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Attendance Summary */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Attendance Summary</h3>
            <p className="text-xs font-bold text-slate-400">Breakdown by status</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-xs font-black text-green-700 uppercase">Present</span>
            </div>
            <div className="text-3xl font-black text-green-800">{summary.totalPresentDays}</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-black text-amber-700 uppercase">Late</span>
            </div>
            <div className="text-3xl font-black text-amber-800">{summary.totalLateDays}</div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-black text-blue-700 uppercase">Leave</span>
            </div>
            <div className="text-3xl font-black text-blue-800">{summary.totalLeaveDays}</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-xs font-black text-red-700 uppercase">Alpha</span>
            </div>
            <div className="text-3xl font-black text-red-800">{summary.totalAlphaDays}</div>
          </div>
        </div>
      </div>

      {/* Top Performers Cards */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Top Performers</h3>
            <p className="text-xs font-bold text-slate-400">Highest scoring members</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {memberRankings.slice(0, 3).map((member, index) => (
            <div
              key={member.memberId}
              className={`rounded-2xl p-5 border-2 ${
                index === 0
                  ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-400'
                  : index === 1
                  ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300'
                  : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index === 0
                      ? 'bg-yellow-400 text-white'
                      : index === 1
                      ? 'bg-slate-300 text-white'
                      : 'bg-orange-400 text-white'
                  }`}
                >
                  {index === 0 ? <Trophy className="w-5 h-5" /> : index === 1 ? <Medal className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-800 truncate">{member.memberName}</div>
                  <div className="text-xs font-bold text-slate-500 truncate">{member.teamName}</div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <div className="text-xs font-bold text-slate-500">Points</div>
                  <div className="font-black text-blue-600">{member.totalPoints}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-500">Attendance</div>
                  <div className="font-black text-green-600">{member.attendanceRate}%</div>
                </div>
              </div>
            </div>
          ))}
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
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(v) => `Week ${v}`} />
              <Legend />
              <Line type="monotone" dataKey="totalPoints" name="Total Points" stroke="#003d79" strokeWidth={3} dot={{ fill: '#003d79', strokeWidth: 2, r: 6 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="totalQuantity" name="Total Quantity" stroke="#FDB813" strokeWidth={3} dot={{ fill: '#FDB813', strokeWidth: 2, r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Weekly Trends Chart */}
      {data.teamWeeklyTrends && data.teamWeeklyTrends.length > 0 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">Tren Performa Tim</h3>
              <p className="text-xs font-bold text-slate-400">Perkembangan poin per tim setiap minggu</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergeTeamWeeklyData(data.teamWeeklyTrends)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tickFormatter={(v) => `W${v}`} stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(v) => `Week ${v}`} />
                <Legend />
                {data.teamWeeklyTrends.map((team, index) => (
                  <Line
                    key={team.teamId}
                    type="monotone"
                    dataKey={team.teamName}
                    name={team.teamName}
                    stroke={team.accentColor || COLORS[index % COLORS.length]}
                    strokeWidth={3}
                    dot={{ fill: 'white', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Team Performance Table */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Team Performance Comparison</h3>
            <p className="text-xs font-bold text-slate-400">Detailed comparison by team</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-black text-slate-500 uppercase">Team</th>
                <th className="text-center py-3 px-4 text-xs font-black text-slate-500 uppercase">Members</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-500 uppercase">Points</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-500 uppercase">Acquisitions</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-500 uppercase">Attendance</th>
                <th className="text-right py-3 px-4 text-xs font-black text-slate-500 uppercase">Target</th>
              </tr>
            </thead>
            <tbody>
              {teamPerformance.map((team) => (
                <tr key={team.teamId} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
                        style={{ backgroundColor: team.accentColor + '20', color: team.accentColor }}
                      >
                        {team.teamName[0]}
                      </div>
                      <div className="font-bold text-slate-800">{team.teamName}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="text-sm font-bold text-slate-600">{team.memberCount}</div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="font-black text-blue-600">{team.totalPoints.toLocaleString()}</div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm font-bold text-slate-600">{team.totalQuantity.toLocaleString()}</div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black ${
                        team.attendanceRate >= 90
                          ? 'bg-green-100 text-green-700'
                          : team.attendanceRate >= 70
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {team.attendanceRate}%
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black ${
                        team.targetAchievement >= 100
                          ? 'bg-green-100 text-green-700'
                          : team.targetAchievement >= 50
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {team.targetAchievement}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <div
                  className={`px-2 py-1 rounded-lg text-xs font-black ${
                    product.achievementRate >= 100
                      ? 'bg-green-100 text-green-700'
                      : product.achievementRate >= 50
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
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
                    style={{ width: `${Math.min(product.achievementRate, 100)}%`, backgroundColor: COLORS[index % COLORS.length] }}
                  />
                </div>
              </div>
              <div className="text-xs font-bold text-slate-400">{product.totalPoints} points earned</div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Performance Bar Chart */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
            <PieChartIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Product Performance</h3>
            <p className="text-xs font-bold text-slate-400">Achievement by product</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="productKey" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend />
              <Bar dataKey="totalQuantity" name="Actual" fill="#003d79" radius={[8, 8, 0, 0]} />
              <Bar dataKey="weeklyTarget" name="Target" fill="#FDB813" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance vs Performance Correlation */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Attendance vs Performance</h3>
            <p className="text-xs font-bold text-slate-400">Correlation analysis</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceCorrelation.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="attendanceRate"
                label={{ value: 'Attendance Rate (%)', position: 'insideBottom', offset: -5 }}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis label={{ value: 'Points', angle: -90, position: 'insideLeft' }} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend />
              <Line type="monotone" dataKey="totalPoints" name="Points" fill="#003d79" stroke="#003d79" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-blue-800 text-sm mb-1">Insight</div>
              <p className="text-xs text-blue-700 font-bold">
                This chart shows the relationship between attendance and performance. Members with higher attendance rates tend to have better performance scores.
              </p>
            </div>
          </div>
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
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black ${
                        member.attendanceRate >= 90
                          ? 'bg-green-100 text-green-700'
                          : member.attendanceRate >= 70
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
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
