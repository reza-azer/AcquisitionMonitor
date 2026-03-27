'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Search, Calendar as CalendarIcon } from 'lucide-react';
import GridLoader from '@/components/GridLoader';
import AttendanceCalendar from './AttendanceCalendar';
import AttendanceAssignModal from './AttendanceAssignModal';

interface Member {
  id: string;
  team_id: string;
  name: string;
  position: string;
  avatar_url: string | null;
  team_name?: string;
}

interface Team {
  id: string;
  name: string;
  image_url: string | null;
  accent_color: string;
}

interface Attendance {
  id?: string;
  member_id: string;
  date: string;
  status: 'present' | 'late' | 'leave' | 'alpha';
  leave_reason?: string;
  late_minutes?: number;
  notes?: string;
}

interface AttendanceManagerProps {
  members: Member[];
  teams: Team[];
}

export default function AttendanceManager({ members, teams }: AttendanceManagerProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [existingAttendance, setExistingAttendance] = useState<Attendance | null>(null);

  const selectedMember = members.find(m => m.id === selectedMemberId) || null;

  // Filter members by search term
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  // Fetch attendances for the selected member and month
  const fetchAttendances = useCallback(async () => {
    if (!selectedMemberId) {
      setAttendances([]);
      return;
    }

    setIsLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const response = await fetch(
        `/api/attendances?member_id=${selectedMemberId}&startDate=${startDate}&endDate=${endDate}`
      );
      const result = await response.json();

      if (result.error) throw new Error(result.error);
      setAttendances(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch attendances:', err);
      setAttendances([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMemberId, currentMonth]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  // Handle date click from calendar
  const handleDateClick = (date: string, attendance: Attendance | null) => {
    setSelectedDate(date);
    setExistingAttendance(attendance);
    setIsModalOpen(true);
  };

  // Handle month change
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  // Save attendance
  const handleSaveAttendance = async (attendanceData: Omit<Attendance, 'id'>) => {
    try {
      const response = await fetch('/api/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData),
      });

      if (!response.ok) throw new Error('Failed to save attendance');
      
      // Refresh attendances
      await fetchAttendances();
    } catch (error) {
      console.error('Failed to save attendance:', error);
      throw error;
    }
  };

  // Delete attendance
  const handleDeleteAttendance = async (id: string) => {
    try {
      const response = await fetch(`/api/attendances?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete attendance');
      
      // Refresh attendances
      await fetchAttendances();
    } catch (error) {
      console.error('Failed to delete attendance:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Kelola Absensi</h2>
          <p className="text-sm font-bold text-slate-500">Input absensi dengan kalender interaktif</p>
        </div>
      </div>

      {/* Member Selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Member Search */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase mb-2">
              <Search className="w-4 h-4" />
              Cari Member
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau posisi..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Member Dropdown */}
          <div>
            <label className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase mb-2">
              <User className="w-4 h-4" />
              Pilih Member
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                setCurrentMonth(new Date()); // Reset to current month when changing member
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            >
              <option value="">-- Pilih Member --</option>
              {filteredMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.position} ({teams.find(t => t.id === member.team_id)?.name || 'Unknown Team'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Member Info */}
        {selectedMember && (
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-black">
              {selectedMember.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-800">{selectedMember.name}</div>
              <div className="text-xs text-slate-500">
                {selectedMember.position} • {teams.find(t => t.id === selectedMember.team_id)?.name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="relative">
        {isLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <GridLoader pattern="edge-cw" size="lg" color="#FDB813" mode="stagger" />
          </div>
        )}
        <AttendanceCalendar
          member={selectedMember}
          attendances={attendances}
          currentMonth={currentMonth}
          onMonthChange={handleMonthChange}
          onDateClick={handleDateClick}
        />
      </div>

      {/* Instructions */}
      {!selectedMember && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
          <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-black text-slate-700 mb-2">Pilih Member untuk Mulai</h3>
          <p className="text-sm font-bold text-slate-500">
            Pilih member dari dropdown di atas untuk melihat dan mengelola absensi mereka
          </p>
        </div>
      )}

      {/* Assign Modal */}
      <AttendanceAssignModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDate(null);
          setExistingAttendance(null);
        }}
        date={selectedDate}
        member={selectedMember}
        existingAttendance={existingAttendance}
        onSave={handleSaveAttendance}
        onDelete={handleDeleteAttendance}
      />
    </div>
  );
}
