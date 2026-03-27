'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, FileText, XCircle, Save, Trash2 } from 'lucide-react';
import GridLoader from './GridLoader';

interface Attendance {
  id?: string;
  member_id: string;
  date: string;
  status: 'present' | 'late' | 'leave' | 'alpha';
  leave_reason?: string;
  late_minutes?: number;
  notes?: string;
}

interface AttendanceAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  member: { id: string; name: string; position: string } | null;
  existingAttendance: Attendance | null;
  onSave: (attendance: Omit<Attendance, 'id'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusOptions = [
  { value: 'present', label: 'Hadir', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { value: 'late', label: 'Terlambat', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { value: 'leave', label: 'Izin', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'alpha', label: 'Alpha', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
];

const leaveReasons = [
  { value: 'sick', label: 'Sakit' },
  { value: 'family_affairs', label: 'Urusan Keluarga' },
  { value: 'annual_leave', label: 'Cuti Tahunan' },
  { value: 'others', label: 'Lainnya' },
];

export default function AttendanceAssignModal({
  isOpen,
  onClose,
  date,
  member,
  existingAttendance,
  onSave,
  onDelete,
}: AttendanceAssignModalProps) {
  const [status, setStatus] = useState<'present' | 'late' | 'leave' | 'alpha'>('present');
  const [lateMinutes, setLateMinutes] = useState<number>(0);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingAttendance) {
      setStatus(existingAttendance.status);
      setLateMinutes(existingAttendance.late_minutes || 0);
      setLeaveReason(existingAttendance.leave_reason || '');
      setNotes(existingAttendance.notes || '');
    } else {
      setStatus('present');
      setLateMinutes(0);
      setLeaveReason('');
      setNotes('');
    }
  }, [existingAttendance, isOpen]);

  const handleSave = async () => {
    if (!member || !date) return;

    setIsSaving(true);
    try {
      const attendanceData: Omit<Attendance, 'id'> = {
        member_id: member.id,
        date,
        status,
        ...(status === 'late' && { late_minutes: lateMinutes }),
        ...(status === 'leave' && { leave_reason: leaveReason }),
        notes: notes || undefined,
      };

      await onSave(attendanceData);
      handleClose();
    } catch (error) {
      console.error('Failed to save attendance:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingAttendance?.id) return;

    if (!window.confirm('Hapus absensi untuk tanggal ini?')) return;

    setIsSaving(true);
    try {
      await onDelete(existingAttendance.id);
      handleClose();
    } catch (error) {
      console.error('Failed to delete attendance:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!isOpen || !date || !member) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose}></div>
      
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-xl">Assign Absensi</h3>
              <p className="text-xs font-bold text-blue-100 mt-1">{formatDate(date)}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-2xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Member Info */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black">
                {member.name.charAt(0)}
              </div>
              <div>
                <div className="font-black text-slate-800 text-sm">{member.name}</div>
                <div className="text-xs font-bold text-slate-500">{member.position}</div>
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-3">
              Status Kehadiran
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = status === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setStatus(option.value as any)}
                    className={`
                      p-3 rounded-xl border-2 transition-all flex items-center gap-2
                      ${isSelected 
                        ? `${option.bg} ${option.border} ${option.color}` 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? '' : 'text-slate-400'}`} />
                    <span className="text-xs font-black">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Fields */}
          {status === 'late' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                Menit Terlambat
              </label>
              <input
                type="number"
                min="0"
                value={lateMinutes}
                onChange={(e) => setLateMinutes(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-yellow-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-yellow-200"
                placeholder="0"
              />
            </div>
          )}

          {status === 'leave' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                Alasan Izin
              </label>
              <select
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full bg-white border border-blue-300 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">-- Pilih Alasan --</option>
                {leaveReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
              Catatan (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              rows={3}
              placeholder="Tambahkan catatan..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            {existingAttendance && (
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="flex-1 py-4 bg-red-100 text-red-700 rounded-2xl font-black text-sm hover:bg-red-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`
                flex-1 py-4 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2
                ${isSaving 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                }
              `}
            >
              {isSaving ? (
                <>
                  <GridLoader pattern="edge-cw" size="sm" color="#fff" mode="stagger" />
                  MENYIMPAN...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {existingAttendance ? 'UPDATE' : 'SIMPAN'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
