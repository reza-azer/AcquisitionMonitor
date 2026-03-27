'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, FileText, XCircle } from 'lucide-react';

interface Attendance {
  id?: string;
  member_id: string;
  date: string;
  status: 'present' | 'late' | 'leave' | 'alpha';
  leave_reason?: string;
  late_minutes?: number;
  notes?: string;
}

interface AttendanceCalendarProps {
  member: { id: string; name: string; position: string } | null;
  attendances: Attendance[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateClick: (date: string, attendance: Attendance | null) => void;
}

const statusConfig = {
  present: {
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: CheckCircle,
    label: 'Hadir',
  },
  late: {
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: Clock,
    label: 'Terlambat',
  },
  leave: {
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: FileText,
    label: 'Izin',
  },
  alpha: {
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'Alpha',
  },
};

export default function AttendanceCalendar({
  member,
  attendances,
  currentMonth,
  onMonthChange,
  onDateClick,
}: AttendanceCalendarProps) {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    return { daysInMonth, startingDay, year, month };
  };

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentMonth);
  
  const getAttendanceForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendances.find(a => a.date === dateStr) || null;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isFuture = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(year, month, day);
    return date > today;
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    if (isFuture(day)) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const attendance = getAttendanceForDate(day);
    onDateClick(dateStr, attendance);
  };

  // Generate calendar days
  const calendarDays = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-24 sm:h-32"></div>);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const attendance = getAttendanceForDate(day);
    const today = isToday(day);
    const future = isFuture(day);
    const status = attendance ? statusConfig[attendance.status] : null;

    calendarDays.push(
      <div
        key={day}
        onClick={() => handleDateClick(day)}
        className={`
          h-24 sm:h-32 border border-slate-200 rounded-xl p-2 transition-all
          ${!future ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'cursor-default opacity-50'}
          ${today ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          ${status ? status.lightColor : 'bg-white'}
          ${status ? status.borderColor : ''}
        `}
      >
        <div className="flex items-start justify-between mb-1">
          <span className={`
            text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
            ${today ? 'bg-blue-600 text-white' : 'text-slate-700'}
          `}>
            {day}
          </span>
          {status && (
            <status.icon className={`w-4 h-4 ${status.textColor}`} />
          )}
        </div>
        
        {status && attendance && (
          <div className="space-y-1">
            <div className={`text-[9px] sm:text-[10px] font-black ${status.textColor} uppercase`}>
              {status.label}
            </div>
            {attendance.status === 'late' && attendance.late_minutes && (
              <div className="text-[8px] sm:text-[9px] font-bold text-yellow-600">
                {attendance.late_minutes} menit
              </div>
            )}
            {attendance.status === 'leave' && attendance.leave_reason && (
              <div className="text-[8px] sm:text-[9px] font-bold text-blue-600 truncate">
                {attendance.leave_reason === 'sick' && 'Sakit'}
                {attendance.leave_reason === 'family_affairs' && 'Keluarga'}
                {attendance.leave_reason === 'annual_leave' && 'Cuti'}
                {attendance.leave_reason === 'others' && 'Lainnya'}
              </div>
            )}
            {attendance.notes && (
              <div className="text-[7px] sm:text-[8px] font-bold text-slate-500 truncate">
                {attendance.notes}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-black">
              {monthNames[month]} {year}
            </h2>
            {member && (
              <p className="text-xs sm:text-sm font-bold text-blue-100 mt-1">
                {member.name} - {member.position}
              </p>
            )}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5 sm:gap-2">
              <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${config.color}`}></div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-600">{config.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-200"></div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-600">Belum Ada</span>
          </div>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {dayNames.map((day, index) => (
          <div
            key={day}
            className={`
              py-2 sm:py-3 text-center text-[9px] sm:text-[10px] font-black text-slate-500 uppercase
              ${index === 0 || index === 6 ? 'text-red-500' : ''}
            `}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 p-2 sm:p-3">
        {calendarDays}
      </div>

      {!member && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold text-sm">Pilih member untuk melihat kalender</p>
          </div>
        </div>
      )}
    </div>
  );
}
