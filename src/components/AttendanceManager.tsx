'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Clock, FileText, XCircle, Save, AlertCircle } from 'lucide-react';
import GridLoader from '@/components/GridLoader';

interface Member {
  id: string;
  name: string;
  position: string;
  team_id: string;
  team?: {
    id: string;
    name: string;
  };
}

interface Attendance {
  id: string;
  member_id: string;
  date: string;
  status: 'present' | 'late' | 'leave' | 'alpha';
  leave_reason?: string | null;
  late_minutes?: number;
  notes?: string | null;
}

interface AttendanceManagerProps {
  members: Member[];
}

type LeaveReason = 'sakit' | 'family_affairs' | 'annual_leave' | 'others';

const LEAVE_REASONS: { value: LeaveReason; label: string }[] = [
  { value: 'sakit', label: 'Sakit' },
  { value: 'family_affairs', label: 'Urusan Keluarga' },
  { value: 'annual_leave', label: 'Cuti Tahunan' },
  { value: 'others', label: 'Lainnya' },
];

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'bg-green-500', icon: CheckCircle2 },
  late: { label: 'Late', color: 'bg-amber-500', icon: Clock },
  leave: { label: 'Izin', color: 'bg-blue-500', icon: FileText },
  alpha: { label: 'Alpha', color: 'bg-red-500', icon: XCircle },
};

export default function AttendanceManager({ members }: AttendanceManagerProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Fetch attendances for selected date
  useEffect(() => {
    fetchAttendances(selectedDate);
  }, [selectedDate]);

  const fetchAttendances = async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/attendances?date=${date}`);
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);

      const attendanceMap: Record<string, Attendance> = {};
      result.data?.forEach((a: Attendance) => {
        attendanceMap[a.member_id] = a;
      });
      setAttendances(attendanceMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAttendance = (memberId: string, updates: Partial<Attendance>) => {
    setAttendances(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        member_id: memberId,
        date: selectedDate,
        ...updates,
      },
    }));
  };

  const handleSave = async (memberId: string) => {
    const attendance = attendances[memberId];
    if (!attendance?.status) return;

    setIsSaving(true);
    setSaveStatus('idle');
    setError(null);

    try {
      const response = await fetch('/api/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          date: selectedDate,
          status: attendance.status,
          leave_reason: attendance.status === 'leave' ? attendance.leave_reason : null,
          late_minutes: attendance.status === 'late' ? attendance.late_minutes || 0 : 0,
          notes: attendance.notes || null,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    setError(null);

    try {
      const promises = Object.entries(attendances)
        .filter(([_, att]) => att.status)
        .map(([memberId, att]) =>
          fetch('/api/attendances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              member_id: memberId,
              date: selectedDate,
              status: att.status,
              leave_reason: att.status === 'leave' ? att.leave_reason : null,
              late_minutes: att.status === 'late' ? att.late_minutes || 0 : 0,
              notes: att.notes || null,
            }),
          })
        );

      const results = await Promise.all(promises);
      
      for (const result of results) {
        const json = await result.json();
        if (json.error) throw new Error(json.error);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate summary for selected date
  const summary = Object.values(attendances).reduce(
    (acc, att) => {
      if (att.status === 'present') acc.present++;
      else if (att.status === 'late') acc.late++;
      else if (att.status === 'leave') acc.leave++;
      else if (att.status === 'alpha') acc.alpha++;
      return acc;
    },
    { present: 0, late: 0, leave: 0, alpha: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header with Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Input Absensi Harian</h2>
          <p className="text-sm text-slate-500">Assign status kehadiran untuk setiap member</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
          </div>
          <button
            onClick={handleSaveAll}
            disabled={isSaving || Object.keys(attendances).length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <GridLoader pattern="breathing" size="sm" color="white" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save All
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-700 uppercase">Present</span>
          </div>
          <div className="text-2xl font-black text-green-800">{summary.present}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase">Late</span>
          </div>
          <div className="text-2xl font-black text-amber-800">{summary.late}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase">Izin</span>
          </div>
          <div className="text-2xl font-black text-blue-800">{summary.leave}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-bold text-red-700 uppercase">Alpha</span>
          </div>
          <div className="text-2xl font-black text-red-800">{summary.alpha}</div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Success Message */}
      {saveStatus === 'success' && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl border border-green-100">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-bold">Attendance saved successfully!</span>
        </div>
      )}

      {/* Attendance Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <GridLoader pattern="wave-tb" size="lg" color="blue" mode="stagger" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Member</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Position</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Leave Reason</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Late (min)</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Notes</th>
                  <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => {
                  const attendance = attendances[member.id];
                  const status = attendance?.status || '';
                  const isLeave = status === 'leave';
                  const isLate = status === 'late';

                  return (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{member.name}</div>
                        <div className="text-xs text-slate-500">{member.team?.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{member.position}</td>
                      <td className="px-4 py-3">
                        <select
                          value={status}
                          onChange={(e) => updateAttendance(member.id, { status: e.target.value as any })}
                          className="text-sm font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        >
                          <option value="">Select...</option>
                          <option value="present">Present</option>
                          <option value="late">Late</option>
                          <option value="leave">Izin</option>
                          <option value="alpha">Alpha</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {isLeave ? (
                          <select
                            value={attendance?.leave_reason || ''}
                            onChange={(e) => updateAttendance(member.id, { leave_reason: e.target.value })}
                            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          >
                            <option value="">Select...</option>
                            {LEAVE_REASONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isLate ? (
                          <input
                            type="number"
                            min="0"
                            value={attendance?.late_minutes || ''}
                            onChange={(e) => updateAttendance(member.id, { late_minutes: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-20 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          />
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={attendance?.notes || ''}
                          onChange={(e) => updateAttendance(member.id, { notes: e.target.value })}
                          placeholder="Optional notes..."
                          className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleSave(member.id)}
                          disabled={!status || isSaving}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
