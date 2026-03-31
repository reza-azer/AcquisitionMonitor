'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy, Users, Target, Medal, Star,
  CheckCircle2, BarChart3, PieChart as PieChartIcon,
  Activity, Crown, Clock,
  Calendar, FileText, XCircle, AlertCircle, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import GridLoader from './GridLoader';
import Skeleton, { SkeletonStatsCard, SkeletonCard } from './Skeleton';
import { CountUp } from './animations';
import { motion } from 'motion/react';

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
  totalNominal?: number;  // For CREDIT products
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
  teamPerformance: TeamPerformance[];
  memberRankings: MemberRanking[];
  categoryPerformance: CategoryPerformance[];
  insights: Insights;
  summary: Summary;
  attendanceCorrelation: AttendanceCorrelation[];
  attendanceDetails: AttendanceDetail[];
  reportType: string;
  startDate: string | null;
  endDate: string | null;
  generatedAt: string;
}

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

export default function DashboardAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  // Attendance summary filter states
  const [attendanceMonth, setAttendanceMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [attendanceYear, setAttendanceYear] = useState<string>(String(new Date().getFullYear()));
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'late' | 'leave' | 'alpha'>('all');

  // Format nominal to compact display (e.g., 36.000.000 → 36jt)
  const formatToJuta = (value: number): string => {
    const juta = value / 1000000;
    if (juta >= 1000) {
      return `${(juta / 1000).toFixed(1)}M`;
    }
    return `${juta}jt`;
  };

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
      // Add attendance-specific filters
      params.append('attendanceMonth', attendanceMonth);
      params.append('attendanceYear', attendanceYear);
      
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

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <Skeleton variant="text" width="200px" height="28px" />
            <Skeleton variant="text" width="120px" height="16px" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton variant="rectangular" width="120px" height="42px" className="rounded-xl" />
            <Skeleton variant="rectangular" width="120px" height="42px" className="rounded-xl" />
            <Skeleton variant="rectangular" width="140px" height="42px" className="rounded-xl" />
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>

        {/* Attendance Summary Skeleton */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton variant="circular" width="40px" height="40px" />
            <div className="space-y-2">
              <Skeleton variant="text" width="140px" height="18px" />
              <Skeleton variant="text" width="100px" height="12px" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton variant="circular" width="20px" height="20px" />
                  <Skeleton variant="text" width="60px" height="12px" />
                </div>
                <Skeleton variant="text" width="50px" height="28px" />
              </div>
            ))}
          </div>
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" width="32px" height="32px" />
                <Skeleton variant="text" width="140px" height="18px" />
              </div>
              <Skeleton variant="rectangular" width="100%" height="250px" className="rounded-xl" />
            </div>
          ))}
        </div>

        {/* Tables Skeleton */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" width="32px" height="32px" />
            <Skeleton variant="text" width="140px" height="18px" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(j => (
              <div key={j} className="flex items-center gap-4">
                <Skeleton variant="text" width="24px" height="14px" />
                <Skeleton variant="circular" width="32px" height="32px" />
                <div className="flex-1">
                  <Skeleton variant="text" width="140px" height="16px" className="mb-1" />
                  <Skeleton variant="text" width="80px" height="12px" />
                </div>
                <Skeleton variant="text" width="60px" height="20px" />
              </div>
            ))}
          </div>
        </div>
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

  const { teamPerformance, memberRankings, categoryPerformance, insights, summary, attendanceCorrelation } = data;
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
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl p-6 shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-200" />
            <span className="text-xs font-bold text-blue-100 uppercase">Total Members</span>
          </div>
          <div className="text-4xl font-black">
            <CountUp value={summary.totalMembers} duration={1.5} />
          </div>
          <div className="text-xs text-blue-200 mt-2">{summary.totalTeams} Teams</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-3xl p-6 shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-green-200" />
            <span className="text-xs font-bold text-green-100 uppercase">Total Points</span>
          </div>
          <div className="text-4xl font-black">
            <CountUp value={summary.totalPoints} duration={1.5} formatWithCommas />
          </div>
          <div className="text-xs text-green-200 mt-2">
            <CountUp value={summary.totalQuantity} duration={1.5} /> Acquisitions
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-3xl p-6 shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-amber-200" />
            <span className="text-xs font-bold text-amber-100 uppercase">Avg Achievement</span>
          </div>
          <div className="text-4xl font-black">
            <CountUp value={summary.avgAttendanceRate} duration={1.5} suffix="%" />
          </div>
          <div className="text-xs text-amber-200 mt-2">Attendance Rate</div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-3xl p-6 shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-200" />
            <span className="text-xs font-bold text-purple-100 uppercase">Products</span>
          </div>
          <div className="text-4xl font-black">
            <CountUp value={categoryPerformance.length} duration={1} />
          </div>
          <div className="text-xs text-purple-200 mt-2">Active Products</div>
        </motion.div>
      </motion.div>

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

        {/* Attendance Detail Table */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h4 className="font-black text-slate-800 mb-1">Detail Kehadiran</h4>
              <p className="text-xs font-bold text-slate-400">Daftar member dengan izin, terlambat, dan alpha</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
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
                  value={attendanceYear}
                  onChange={(e) => setAttendanceYear(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={fetchAnalytics}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-black transition-all"
              >
                FILTER
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setAttendanceStatusFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                attendanceStatusFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({data?.attendanceDetails.length || 0})
            </button>
            <button
              onClick={() => setAttendanceStatusFilter('leave')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                attendanceStatusFilter === 'leave'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              Izin ({data?.attendanceDetails.filter(d => d.status === 'leave').length || 0})
            </button>
            <button
              onClick={() => setAttendanceStatusFilter('late')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                attendanceStatusFilter === 'late'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              }`}
            >
              Terlambat ({data?.attendanceDetails.filter(d => d.status === 'late').length || 0})
            </button>
            <button
              onClick={() => setAttendanceStatusFilter('alpha')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                attendanceStatusFilter === 'alpha'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              Alpha ({data?.attendanceDetails.filter(d => d.status === 'alpha').length || 0})
            </button>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">No</th>
                    <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Nama</th>
                    <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Tanggal</th>
                    <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Jenis Kehadiran</th>
                    <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Keterangan</th>
                    <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Terlambat (menit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filteredDetails = data?.attendanceDetails.filter(d => {
                      if (attendanceStatusFilter === 'all') return true;
                      return d.status === attendanceStatusFilter;
                    }) || [];

                    if (filteredDetails.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            Tidak ada data kehadiran untuk filter ini
                          </td>
                        </tr>
                      );
                    }

                    return filteredDetails.map((detail, index) => {
                      const getStatusBadge = () => {
                        if (detail.status === 'late') {
                          return (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-black">
                              <Clock className="w-3 h-3" /> Terlambat
                            </span>
                          );
                        }
                        if (detail.status === 'leave') {
                          return (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black">
                              <FileText className="w-3 h-3" /> Izin
                            </span>
                          );
                        }
                        if (detail.status === 'alpha') {
                          return (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black">
                              <XCircle className="w-3 h-3" /> Alpha
                            </span>
                          );
                        }
                        return null;
                      };

                      const getKeterangan = () => {
                        if (detail.status === 'late') {
                          return detail.notes || '-';
                        }
                        if (detail.status === 'leave') {
                          const reasonLabels: Record<string, string> = {
                            sakit: 'Sakit',
                            family_affairs: 'Urusan Keluarga',
                            annual_leave: 'Cuti Tahunan',
                            others: 'Lainnya',
                          };
                          return detail.leave_reason ? reasonLabels[detail.leave_reason] || detail.leave_reason : '-';
                        }
                        return detail.notes || '-';
                      };

                      return (
                        <tr key={detail.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-slate-700">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{detail.member_name}</div>
                            <div className="text-xs text-slate-500">{detail.team_name} • {detail.member_position}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-bold text-slate-700">
                              {new Date(detail.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{getStatusBadge()}</td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-700">{getKeterangan()}</td>
                          <td className="px-4 py-3 text-center">
                            {detail.status === 'late' ? (
                              <span className="text-sm font-black text-amber-600">{detail.late_minutes} min</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
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

      {/* Category Performance with Targets - Non-CREDIT */}
      {categoryPerformance.filter(p => p.category !== 'CREDIT').length > 0 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">Product Target Achievement - Non-CREDIT</h3>
              <p className="text-xs font-bold text-slate-400">FUNDING & TRANSACTION - Progress toward weekly goals</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryPerformance.filter(p => p.category !== 'CREDIT').map((product, index) => (
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
      )}

      {/* Category Performance with Targets - CREDIT */}
      {categoryPerformance.filter(p => p.category === 'CREDIT').length > 0 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">Product Target Achievement - CREDIT</h3>
              <p className="text-xs font-bold text-slate-400">CREDIT products - Progress toward weekly nominal goals</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryPerformance.filter(p => p.category === 'CREDIT').map((product, index) => (
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
                    <span>
                      {formatToJuta(product.totalNominal || 0)} / {formatToJuta(product.weeklyTarget)} {product.unit}
                    </span>
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
      )}

      {/* Product Performance Bar Chart - Non-CREDIT */}
      {categoryPerformance.filter(p => p.category !== 'CREDIT').length > 0 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <PieChartIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">Product Performance - Non-CREDIT</h3>
              <p className="text-xs font-bold text-slate-400">FUNDING & TRANSACTION - Achievement by product</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance.filter(p => p.category !== 'CREDIT')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="productKey" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ padding: '12px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{data.productName}</p>
                          <p style={{ margin: '4px 0', fontSize: '12px' }}>
                            Actual: {data.totalQuantity}
                          </p>
                          <p style={{ margin: '4px 0', fontSize: '12px' }}>
                            Target: {data.weeklyTarget}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="totalQuantity" name="Actual" fill="#003d79" radius={[8, 8, 0, 0]} />
                <Bar dataKey="weeklyTarget" name="Target" fill="#FDB813" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Product Performance Bar Chart - CREDIT */}
      {categoryPerformance.filter(p => p.category === 'CREDIT').length > 0 && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
              <PieChartIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800">Product Performance - CREDIT</h3>
              <p className="text-xs font-bold text-slate-400">CREDIT products - Achievement by nominal</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance.filter(p => p.category === 'CREDIT')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="productKey" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ padding: '12px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{data.productName}</p>
                          <p style={{ margin: '4px 0', fontSize: '12px' }}>
                            Actual: {formatToJuta(data.totalNominal || 0)}
                          </p>
                          <p style={{ margin: '4px 0', fontSize: '12px' }}>
                            Target: {formatToJuta(data.weeklyTarget)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="totalNominal" name="Actual (Nominal)" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                <Bar dataKey="weeklyTarget" name="Target" fill="#FDB813" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
