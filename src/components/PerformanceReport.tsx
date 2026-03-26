'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Trophy,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
  Medal,
  Star,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import GridLoader from './GridLoader';

interface TeamPerformance {
  teamId: string;
  teamName: string;
  accentColor: string;
  memberCount: number;
  totalPoints: number;
  totalQuantity: number;
  productBreakdown: Record<string, number>;
  attendanceRate: number;
  presentDays: number;
  lateDays: number;
  leaveDays: number;
  alphaDays: number;
  totalDays: number;
  targetAchievement: number;
}

interface MemberPerformance {
  memberId: string;
  memberName: string;
  position: string;
  teamId: string;
  teamName: string;
  totalPoints: number;
  totalQuantity: number;
  productBreakdown: Record<string, number>;
  attendanceRate: number;
  presentDays: number;
  totalDays: number;
  targetAchievements: Array<{
    productKey: string;
    productName: string;
    quantity: number;
    target: number;
    achievement: number;
  }>;
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

interface ProductBreakdown {
  productKey: string;
  productName: string;
  category: string;
  totalQuantity: number;
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

interface ReportData {
  reportType: string;
  startDate: string | null;
  endDate: string | null;
  teamPerformance: TeamPerformance[];
  memberPerformance: MemberPerformance[];
  summary: Summary;
  topPerformers: MemberPerformance[];
  bottomPerformers: MemberPerformance[];
  productBreakdown: ProductBreakdown[];
  attendanceCorrelation: AttendanceCorrelation[];
  generatedAt: string;
}

export default function PerformanceReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/reports/performance?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch report');

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
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

      // Summary Sheet
      if (data) {
        const summaryData = [
          ['Performance Report Summary'],
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
        const memberData = data.memberPerformance.map(m => ({
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
        const productData = data.productBreakdown.map(p => ({
          'Product Key': p.productKey,
          'Product Name': p.productName,
          'Category': p.category,
          'Total Quantity': p.totalQuantity,
          'Weekly Target': p.weeklyTarget,
          'Achievement Rate': `${p.achievementRate}%`,
        }));

        const productSheet = (window as any).XLSX.utils.json_to_sheet(productData);
        (window as any).XLSX.utils.book_append_sheet(workbook, productSheet, 'Product Breakdown');

        // Top Performers Sheet
        const topPerformersData = data.topPerformers.map((m, i) => ({
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

        const fileName = `Performance_Report_${data.reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  if (!data) return null;

  const COLORS = ['#003d79', '#FDB813', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-green-600" />
            Performance Report
          </h2>
          <p className="text-sm font-bold text-slate-500 mt-1">Comprehensive performance analytics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="custom">Custom Range</option>
          </select>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black shadow-lg transition-all ${
              isExporting 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'
            }`}
          >
            {isExporting ? (
              <GridLoader pattern="edge-cw" size="xs" color="#fff" mode="stagger" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            EXPORT
          </button>
        </div>
      </div>

      {/* Date Range Selector for Custom */}
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
                onClick={fetchReport}
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
          <div className="text-4xl font-black">{data.summary.totalMembers}</div>
          <div className="text-xs text-blue-200 mt-2">{data.summary.totalTeams} Teams</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-green-200" />
            <span className="text-xs font-bold text-green-100 uppercase">Total Points</span>
          </div>
          <div className="text-4xl font-black">{data.summary.totalPoints.toLocaleString()}</div>
          <div className="text-xs text-green-200 mt-2">{data.summary.totalQuantity.toLocaleString()} Acquisitions</div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-amber-200" />
            <span className="text-xs font-bold text-amber-100 uppercase">Avg Attendance</span>
          </div>
          <div className="text-4xl font-black">{data.summary.avgAttendanceRate}%</div>
          <div className="text-xs text-amber-200 mt-2">{data.summary.totalPresentDays} Days Present</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-purple-200" />
            <span className="text-xs font-bold text-purple-100 uppercase">Products</span>
          </div>
          <div className="text-4xl font-black">{data.productBreakdown.length}</div>
          <div className="text-xs text-purple-200 mt-2">Active Products</div>
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
            <div className="text-3xl font-black text-green-800">{data.summary.totalPresentDays}</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-black text-amber-700 uppercase">Late</span>
            </div>
            <div className="text-3xl font-black text-amber-800">{data.summary.totalLateDays}</div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-black text-blue-700 uppercase">Leave</span>
            </div>
            <div className="text-3xl font-black text-blue-800">{data.summary.totalLeaveDays}</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-xs font-black text-red-700 uppercase">Alpha</span>
            </div>
            <div className="text-3xl font-black text-red-800">{data.summary.totalAlphaDays}</div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
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
          {data.topPerformers.slice(0, 3).map((member, index) => (
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index === 0
                    ? 'bg-yellow-400 text-white'
                    : index === 1
                    ? 'bg-slate-300 text-white'
                    : 'bg-orange-400 text-white'
                }`}>
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

      {/* Team Performance Table */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Team Performance</h3>
            <p className="text-xs font-bold text-slate-400">Comparison by team</p>
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
              {data.teamPerformance.map((team) => (
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
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black ${
                      team.attendanceRate >= 90
                        ? 'bg-green-100 text-green-700'
                        : team.attendanceRate >= 70
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {team.attendanceRate}%
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black ${
                      team.targetAchievement >= 100
                        ? 'bg-green-100 text-green-700'
                        : team.targetAchievement >= 50
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {team.targetAchievement}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Performance Chart */}
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
            <BarChart data={data.productBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="productKey" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
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
            <LineChart data={data.attendanceCorrelation.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="attendanceRate" label={{ value: 'Attendance Rate (%)', position: 'insideBottom', offset: -5 }} stroke="#64748b" fontSize={12} />
              <YAxis label={{ value: 'Points', angle: -90, position: 'insideLeft' }} stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Line type="scatter" dataKey="totalPoints" name="Points" fill="#003d79" stroke="#003d79" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
