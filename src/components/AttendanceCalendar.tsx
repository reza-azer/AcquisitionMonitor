'use client';

import React from 'react';
import UniversalCalendar from './UniversalCalendar';

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

export default function AttendanceCalendar({
  member,
  attendances,
  currentMonth,
  onMonthChange,
  onDateClick,
}: AttendanceCalendarProps) {
  return (
    <UniversalCalendar
      mode="attendance"
      member={member}
      currentMonth={currentMonth}
      onMonthChange={onMonthChange}
      onDateClick={onDateClick}
      attendances={attendances}
    />
  );
}
