'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Clock, FileText, XCircle, Loader2, AlertCircle, TrendingUp } from 'lucide-react';

interface MemberSummary {
  member_id: string;
  member_name: string;
  member_position: string;
  team_id: string;
  team_name: string;
  present: number;
  late: number;
  leave: number;
  alpha: number;
  total_days: number;
  total_late_minutes: number;
  leave_reasons: Record<string, number>;
}

interface AttendanceSummaryProps {
  members: any[];
}

export default function AttendanceSummary({ members }: AttendanceSummaryProps) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [summary, setSummary] = useState<MemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/attendances/summary?startDate=${startDate}&endDate=${endDate}`
      );
      const result = await response.json();

      if (result.error) throw new Error(result.error);
      setSummary(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals
  const totals = summary.reduce(
    (acc, s) => ({
      present: acc.present + s.present,
      late: acc.late + s.late,
      leave: acc.leave + s.leave,
      alpha: acc.alpha + s.alpha,
      late_minutes: acc.late_minutes + s.total_late_minutes,
    }),
    { present: 0, late: 0, leave: 0, alpha: 0, late_minutes: 0 }
  );

  // Aggregate leave reasons
  const leaveReasonsTotal = summary.reduce((acc, s) => {
    Object.entries(s.leave_reasons).forEach(([reason, count]) => {
      acc[reason] = (acc[reason] || 0) + count;
    });
    return acc;
  }, {} as Record<string, number>);

  const getLeaveReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      sakit: 'Sakit',
      family_affairs: 'Urusan Keluarga',
      annual_leave: 'Cuti Tahunan',
      others: 'Lainnya',
    };
    return labels[reason] || reason;
  };

  const getAttendanceRate = (s: MemberSummary) => {
    const totalPossible = s.present + s.late + s.leave + s.alpha;
    if (totalPossible === 0) return 0;
    return Math.round(((s.present + s.late) / totalPossible) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">Rekap Absensi</h2>
        <p className="text-sm text-slate-500">Total keterlambatan dan izin per member</p>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Period:</span>
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        />
        <span className="text-slate-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-700 uppercase">Present</span>
          </div>
          <div className="text-2xl font-black text-green-800">{totals.present}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase">Late</span>
          </div>
          <div className="text-2xl font-black text-amber-800">{totals.late}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase">Izin</span>
          </div>
          <div className="text-2xl font-black text-blue-800">{totals.leave}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-bold text-red-700 uppercase">Alpha</span>
          </div>
          <div className="text-2xl font-black text-red-800">{totals.alpha}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-700 uppercase">Late Min</span>
          </div>
          <div className="text-2xl font-black text-purple-800">{totals.late_minutes}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-700 uppercase">Total Days</span>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {totals.present + totals.late + totals.leave + totals.alpha}
          </div>
        </div>
      </div>

      {/* Leave Reasons Breakdown */}
      {Object.keys(leaveReasonsTotal).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Izin Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(leaveReasonsTotal).map(([reason, count]) => (
              <div
                key={reason}
                className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700">
                  {getLeaveReasonLabel(reason)}: {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Summary Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Member</th>
                  <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Present</th>
                  <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Late</th>
                  <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Late (min)</th>
                  <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Izin</th>
                  <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Alpha</th>
                  <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Total Days</th>
                  <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      No attendance data for this period
                    </td>
                  </tr>
                ) : (
                  summary.map((s) => {
                    const rate = getAttendanceRate(s);
                    return (
                      <tr key={s.member_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{s.member_name}</div>
                          <div className="text-xs text-slate-500">{s.team_name} • {s.member_position}</div>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-black text-sm">
                            {s.present}
                          </span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-black text-sm">
                            {s.late}
                          </span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="text-sm font-bold text-slate-700">{s.total_late_minutes}</span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black text-sm">
                            {s.leave}
                          </span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-700 font-black text-sm">
                            {s.alpha}
                          </span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="text-sm font-bold text-slate-700">{s.total_days}</span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  rate >= 90 ? 'bg-green-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-sm font-black text-slate-700 w-10">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
