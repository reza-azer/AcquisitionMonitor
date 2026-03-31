'use client';

import React from 'react';
import UniversalCalendar from './UniversalCalendar';

interface Acquisition {
  id?: string;
  member_id: string;
  date: string;
  product_key: string;
  quantity: number;
}

interface Product {
  product_key: string;
  product_name: string;
  unit: string;
}

interface AcquisitionCalendarProps {
  member: { id: string; name: string; position: string } | null;
  acquisitions: Acquisition[];
  products: Product[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateClick: (date: string, acquisitions: Acquisition[]) => void;
}

export default function AcquisitionCalendar({
  member,
  acquisitions,
  products,
  currentMonth,
  onMonthChange,
  onDateClick,
}: AcquisitionCalendarProps) {
  return (
    <UniversalCalendar
      mode="acquisition"
      member={member}
      currentMonth={currentMonth}
      onMonthChange={onMonthChange}
      onDateClick={onDateClick}
      acquisitions={acquisitions}
      products={products}
    />
  );
}
