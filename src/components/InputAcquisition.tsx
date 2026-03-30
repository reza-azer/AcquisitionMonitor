'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Save,
  AlertCircle,
  CheckCircle2,
  User,
  Package,
  TrendingUp,
  Search,
  Edit2,
  History,
  Trash2,
  FileText,
  Users,
} from 'lucide-react';
import GridLoader from '@/components/GridLoader';
import Skeleton, { SkeletonCard, SkeletonTable } from '@/components/Skeleton';
import AcquisitionCalendar from './AcquisitionCalendar';
import AcquisitionAssignModal from './AcquisitionAssignModal';
import AttendanceCalendar from './AttendanceCalendar';
import AttendanceAssignModal from './AttendanceAssignModal';
import BulkEditModal from './BulkEditModal';
import { formatNumber, parseNumber } from '@/lib/formatters';

interface Product {
  id?: string;
  product_key: string;
  product_name: string;
  category: 'FUNDING' | 'TRANSACTION' | 'CREDIT';
  unit: string;
  weekly_target: number;
  is_tiered: boolean;
  tier_config?: { limit: number; points: number }[];
  flat_points?: number;
  is_active: boolean;
}

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

interface Acquisition {
  id?: string;
  member_id: string;
  member_name?: string;
  date: string;
  week?: number;
  product_key: string;
  quantity: number;
  nominal?: number;  // For CREDIT products: nominal in Rupiah
  updated_at?: string;
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

interface InputAcquisitionProps {
  products: Product[];
  teams: Team[];
  members: Member[];
}

type CalendarMode = 'attendance' | 'acquisition';

export default function InputAcquisition({ products, teams, members }: InputAcquisitionProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [inputData, setInputData] = useState<Record<string, number | { quantity: number; nominal: number }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recentInputs, setRecentInputs] = useState<Acquisition[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('acquisition');
  const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] = useState(false);
  const [existingAcquisitions, setExistingAcquisitions] = useState<Acquisition[]>([]);
  const [allMonthAcquisitions, setAllMonthAcquisitions] = useState<Acquisition[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  
  // Attendance state
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);

  // Load audit logs and recent inputs from database on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingHistory(true);
      try {
        // Fetch audit logs from database
        const auditRes = await fetch('/api/audit-log?limit=50');
        if (auditRes.ok) {
          const dbLogs = await auditRes.json();
          if (dbLogs.length > 0) {
            console.log('[InputAcquisition] Loaded', dbLogs.length, 'audit logs from DB');
            setAuditLogs(dbLogs);
            localStorage.setItem('auditLogs', JSON.stringify(dbLogs));
          }
        }

        // Fetch recent inputs from acquisitions table (last 20 with quantity > 0)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const inputRes = await fetch(`/api/acquisitions?startDate=${thirtyDaysAgo}`);
        if (inputRes.ok) {
          const allInputs = await inputRes.json();
          // Filter only quantity > 0 and get latest 20
          const recentOnly = allInputs
            .filter((item: Acquisition) => item.quantity > 0)
            .sort((a: Acquisition, b: Acquisition) =>
              new Date(b.updated_at || b.date).getTime() - new Date(a.updated_at || a.date).getTime()
            )
            .slice(0, 20)
            .map((item: Acquisition) => ({
              ...item,
              member_name: members.find(m => m.id === item.member_id)?.name || 'Unknown'
            }));

          if (recentOnly.length > 0) {
            console.log('[InputAcquisition] Loaded', recentOnly.length, 'recent inputs from DB');
            setRecentInputs(recentOnly);
            localStorage.setItem('recentInputs', JSON.stringify(recentOnly));
          }
        }
      } catch (error) {
        console.error('[InputAcquisition] Error loading data:', error);

        // Fallback to localStorage
        const savedRecent = localStorage.getItem('recentInputs');
        const savedAudit = localStorage.getItem('auditLogs');
        if (savedRecent) {
          try {
            setRecentInputs(JSON.parse(savedRecent));
          } catch (e) {
            console.error('Failed to load recent inputs:', e);
          }
        }
        if (savedAudit) {
          try {
            setAuditLogs(JSON.parse(savedAudit));
          } catch (e) {
            console.error('Failed to load audit logs:', e);
          }
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadData();
  }, []);

  // Save recent inputs to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('recentInputs', JSON.stringify(recentInputs));
  }, [recentInputs]);

  // Save audit logs to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Filter members by search term
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  // Get member details
  const selectedMember = members.find(m => m.id === selectedMemberId);

  // Load existing acquisitions for selected date and member
  const loadExistingAcquisitions = useCallback(async () => {
    if (!selectedMemberId || !selectedDate) return;

    setIsLoadingExistingData(true);
    try {
      const res = await fetch(
        `/api/acquisitions?member_id=${selectedMemberId}&date=${selectedDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setExistingAcquisitions(data);
        const existingData: Record<string, number | { quantity: number; nominal: number }> = {};
        data.forEach((item: Acquisition) => {
          const product = products.find(p => p.product_key === item.product_key);
          if (product?.category === 'CREDIT') {
            // For CREDIT: store both quantity and nominal
            existingData[item.product_key] = { quantity: item.quantity, nominal: item.nominal || 0 };
          } else {
            // For FUNDING/TRANSACTION: store just quantity
            existingData[item.product_key] = item.quantity;
          }
        });
        setInputData(existingData);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    } finally {
      setIsLoadingExistingData(false);
    }
  }, [selectedMemberId, selectedDate, products]);

  useEffect(() => {
    loadExistingAcquisitions();
  }, [loadExistingAcquisitions]);

  // Load all acquisitions for the entire month (for calendar display)
  const loadMonthAcquisitions = useCallback(async () => {
    if (!selectedMemberId) {
      setAllMonthAcquisitions([]);
      return;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      const res = await fetch(
        `/api/acquisitions?member_id=${selectedMemberId}&startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setAllMonthAcquisitions(data);
      }
    } catch (error) {
      console.error('Error loading month acquisitions:', error);
    }
  }, [selectedMemberId, currentMonth]);

  useEffect(() => {
    loadMonthAcquisitions();
  }, [loadMonthAcquisitions]);

  // Load attendances for attendance mode
  const loadAttendances = useCallback(async () => {
    if (!selectedMemberId) {
      setAttendances([]);
      return;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      const response = await fetch(
        `/api/attendances?memberId=${selectedMemberId}&startDate=${startDate}&endDate=${endDate}`
      );
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setAttendances(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch attendances:', err);
      setAttendances([]);
    }
  }, [selectedMemberId, currentMonth]);

  useEffect(() => {
    if (calendarMode === 'attendance') {
      loadAttendances();
    }
  }, [calendarMode, loadAttendances]);

  const handleInputChange = (productKey: string, value: string, field: 'quantity' | 'nominal' = 'quantity') => {
    const val = parseInt(value) || 0;
    setInputData(prev => {
      const currentValue = prev[productKey];
      const product = products.find(p => p.product_key === productKey);
      
      if (product?.category === 'CREDIT') {
        // For CREDIT: maintain both quantity and nominal
        const currentObj = typeof currentValue === 'object' ? currentValue : { quantity: 0, nominal: 0 };
        return {
          ...prev,
          [productKey]: {
            ...currentObj,
            [field]: val
          }
        };
      } else {
        // For FUNDING/TRANSACTION: just quantity
        return {
          ...prev,
          [productKey]: val
        };
      }
    });
    setSaveStatus('idle');
    setError(null);
  };

  // Handle date click from calendar
  const handleDateClick = (date: string, data: any) => {
    setSelectedDate(date);
    if (calendarMode === 'acquisition') {
      setExistingAcquisitions(data || []);
      setIsAcquisitionModalOpen(true);
    } else {
      setSelectedAttendance(data);
      setIsAttendanceModalOpen(true);
    }
  };

  // Handle month change
  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  // Handle member change
  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
    setInputData({});
    setCurrentMonth(new Date()); // Reset to current month
  };

  // Save acquisitions (bulk)
  const handleSaveAcquisitions = async (acquisitions: Omit<Acquisition, 'id'>[]) => {
    try {
      // Check if any acquisitions are CREDIT products
      const hasCredit = acquisitions.some(acq => {
        const product = products.find(p => p.product_key === acq.product_key);
        return product?.category === 'CREDIT';
      });

      console.log('[InputAcquisition] Save acquisitions:', acquisitions);
      console.log('[InputAcquisition] Has credit:', hasCredit);

      if (hasCredit) {
        // For CREDIT: send as bulk request to handle multiple entries properly
        const records = acquisitions.map(acq => {
          const product = products.find(p => p.product_key === acq.product_key);
          return {
            member_id: acq.member_id,
            date: acq.date,
            week: acq.week,
            product_key: acq.product_key,
            quantity: acq.quantity,
            nominal: acq.nominal || 0,
            is_credit_entry: product?.category === 'CREDIT'
          };
        });

        console.log('[InputAcquisition] Sending bulk records:', records);

        const response = await fetch('/api/acquisitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bulk: true,
            records
          }),
        });

        if (!response.ok) throw new Error('Failed to save');
      } else {
        // For FUNDING/TRANSACTION: send individual requests (existing behavior)
        const savePromises = acquisitions.map(acq =>
          fetch('/api/acquisitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(acq),
          })
        );

        const results = await Promise.all(savePromises);
        const failed = results.some(r => !r.ok);

        if (failed) throw new Error('Some requests failed');
      }

      // Create audit logs for changed values
      const timestamp = new Date().toISOString();
      const memberName = selectedMember?.name || 'Unknown';

      const changedLogs = acquisitions
        .map(acq => {
          const existing = existingAcquisitions.find(e => e.product_key === acq.product_key);
          const oldQty = existing?.quantity || 0;
          const newQty = acq.quantity;
          return { oldQty, newQty, acq };
        })
        .filter(({ oldQty, newQty }) => oldQty !== newQty)
        .map(({ oldQty, newQty, acq }, idx) => {
          const product = products.find(p => p.product_key === acq.product_key);
          return {
            id: `audit-${Date.now()}-${acq.product_key}-${idx}-${acq.nominal || acq.quantity}`,
            member_id: acq.member_id,
            member_name: memberName,
            date: acq.date,
            product_key: acq.product_key,
            product_name: product?.product_name || acq.product_key,
            old_quantity: oldQty,
            new_quantity: newQty,
            changed_at: timestamp,
            unit: product?.unit || ''
          };
        });

      // Save audit logs to database
      if (changedLogs.length > 0) {
        try {
          await fetch('/api/audit-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs: changedLogs })
          });
          setAuditLogs(prev => [...changedLogs, ...prev].slice(0, 50));
        } catch (auditError) {
          console.error('[InputAcquisition] Audit log API error:', auditError);
        }
      }

      // Refresh recent inputs
      await refreshRecentInputs();

      // Refresh existing acquisitions (for the selected date)
      await loadExistingAcquisitions();

      // Refresh all month acquisitions (for calendar display)
      await loadMonthAcquisitions();

      setSaveStatus('success');
    } catch (err: any) {
      console.error('Failed to save acquisitions:', err);
      throw err;
    }
  };

  // Delete single acquisition
  const handleDeleteAcquisition = async (id: string) => {
    try {
      const response = await fetch(`/api/acquisitions?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete acquisition');

      // Refresh recent inputs
      await refreshRecentInputs();

      // Refresh existing acquisitions (for the selected date)
      await loadExistingAcquisitions();

      // Refresh all month acquisitions (for calendar display)
      await loadMonthAcquisitions();
    } catch (error) {
      console.error('Failed to delete acquisition:', error);
      throw error;
    }
  };

  // Refresh recent inputs
  const refreshRecentInputs = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const inputRes = await fetch(`/api/acquisitions?startDate=${thirtyDaysAgo}`);
    if (inputRes.ok) {
      const allInputs = await inputRes.json();
      const recentOnly = allInputs
        .filter((item: Acquisition) => item.quantity > 0)
        .sort((a: Acquisition, b: Acquisition) =>
          new Date(b.updated_at || a.date).getTime() - new Date(a.updated_at || a.date).getTime()
        )
        .slice(0, 20)
        .map((item: Acquisition) => ({
          ...item,
          member_name: members.find(m => m.id === item.member_id)?.name || 'Unknown'
        }));

      setRecentInputs(recentOnly);
      localStorage.setItem('recentInputs', JSON.stringify(recentOnly));
    }
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
      await loadAttendances();
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
      await loadAttendances();
    } catch (error) {
      console.error('Failed to delete attendance:', error);
      throw error;
    }
  };

  // Bulk save for bulk edit modal (acquisitions)
  const handleBulkSaveAcquisitions = async (records: any[]) => {
    try {
      const response = await fetch('/api/acquisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, records }),
      });

      if (!response.ok) throw new Error('Failed to save bulk acquisitions');

      await refreshRecentInputs();
      if (selectedMemberId && records.some((r: any) => r.member_id === selectedMemberId)) {
        await loadExistingAcquisitions();
        await loadMonthAcquisitions();
      }

      return response.json();
    } catch (error) {
      console.error('Failed to save bulk acquisitions:', error);
      throw error;
    }
  };

  // Bulk delete for bulk edit modal (acquisitions)
  const handleBulkDeleteAcquisitions = async (records: Pick<Acquisition, 'member_id' | 'date'>[]) => {
    try {
      const response = await fetch('/api/acquisitions?bulk=true', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) throw new Error('Failed to delete bulk acquisitions');

      await refreshRecentInputs();
      if (selectedMemberId && records.some((r: any) => r.member_id === selectedMemberId)) {
        await loadExistingAcquisitions();
        await loadMonthAcquisitions();
      }
    } catch (error) {
      console.error('Failed to delete bulk acquisitions:', error);
      throw error;
    }
  };

  // Bulk save for attendance
  const handleBulkSaveAttendance = async (records: Omit<Attendance, 'id'>[]) => {
    try {
      const response = await fetch('/api/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, records }),
      });

      if (!response.ok) throw new Error('Failed to save bulk attendance');

      await loadAttendances();
      
      return response.json();
    } catch (error) {
      console.error('Failed to save bulk attendance:', error);
      throw error;
    }
  };

  // Bulk delete for attendance
  const handleBulkDeleteAttendance = async (records: Pick<Attendance, 'member_id' | 'date'>[]) => {
    try {
      const response = await fetch('/api/attendances?bulk=true', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) throw new Error('Failed to delete bulk attendance');

      await loadAttendances();
    } catch (error) {
      console.error('Failed to delete bulk attendance:', error);
      throw error;
    }
  };

  const hasChanges = Object.values(inputData).some(qty => {
    const existing = existingAcquisitions.find(a => a.product_key === Object.keys(inputData)[0]);
    return qty !== (existing?.quantity || 0);
  });

  const clearHistory = () => {
    if (window.confirm('Hapus semua riwayat input dan koreksi?')) {
      setRecentInputs([]);
      setAuditLogs([]);
      localStorage.removeItem('recentInputs');
      localStorage.removeItem('auditLogs');
    }
  };

  const handleEdit = (item: Acquisition) => {
    setEditingId(item.id || null);
    setEditQuantity(item.quantity);
  };

  const handleUpdate = async (id: string, productKey: string) => {
    const item = recentInputs.find(i => i.id === id);
    if (!item) return;

    const product = products.find(p => p.product_key === productKey);
    const memberName = members.find(m => m.id === item.member_id)?.name || 'Unknown';

    setIsSaving(true);
    try {
      const res = await fetch('/api/acquisitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          member_id: item.member_id,
          date: item.date,
          product_key: productKey,
          quantity: editQuantity,
          member_name: memberName
        })
      });

      if (res.ok) {
        await refreshRecentInputs();
        await loadMonthAcquisitions();
        setEditingId(null);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setError('Gagal mengupdate akuisisi');
      }
    } catch (error) {
      console.error('Error updating acquisition:', error);
      setError('Gagal mengupdate akuisisi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditQuantity(0);
  };

  const handleDelete = async (id: string, productKey: string) => {
    const product = products.find(p => p.product_key === productKey);
    const productName = product?.product_name || productKey;

    if (!window.confirm(`Hapus akuisisi ${productName}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/acquisitions?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setRecentInputs(prev => prev.filter(item => item.id !== id));
        await refreshRecentInputs();
        await loadMonthAcquisitions();
      } else {
        setError('Gagal menghapus akuisisi');
      }
    } catch (error) {
      console.error('Error deleting acquisition:', error);
      setError('Gagal menghapus akuisisi');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      FUNDING: 'bg-blue-100 text-blue-700 border-blue-200',
      TRANSACTION: 'bg-green-100 text-green-700 border-green-200',
      CREDIT: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[category as keyof typeof colors] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">Input Akuisisi</h2>
          <p className="text-sm font-bold text-slate-500">Input data dengan kalender interaktif</p>
        </div>
        <button
          onClick={() => setIsBulkEditModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2.5 rounded-2xl font-black text-sm shadow-lg shadow-purple-200 transition-all"
        >
          <Users className="w-4 h-4" />
          Bulk Edit
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}
      {saveStatus === 'success' && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl border border-green-100">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-bold">Data berhasil disimpan!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Calendar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mode Toggle & Member Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setCalendarMode('acquisition')}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                  calendarMode === 'acquisition'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Package className="w-4 h-4" />
                Mode Akuisisi
              </button>
              <button
                onClick={() => setCalendarMode('attendance')}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                  calendarMode === 'attendance'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Mode Absensi
              </button>
            </div>

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
                  onChange={(e) => handleMemberChange(e.target.value)}
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
            {isLoadingExistingData && calendarMode === 'acquisition' ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton variant="circular" width="40px" height="40px" />
                  <Skeleton variant="text" width="120px" height="20px" />
                  <Skeleton variant="circular" width="40px" height="40px" />
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <Skeleton key={i} variant="text" width="30px" height="14px" />
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" width="100%" height="60px" />
                  ))}
                </div>
              </div>
            ) : calendarMode === 'acquisition' ? (
              <AcquisitionCalendar
                key={selectedMemberId}
                member={selectedMember || null}
                acquisitions={allMonthAcquisitions}
                products={products.filter(p => p.is_active)}
                currentMonth={currentMonth}
                onMonthChange={handleMonthChange}
                onDateClick={handleDateClick}
              />
            ) : (
              <AttendanceCalendar
                key={selectedMemberId}
                member={selectedMember || null}
                attendances={attendances}
                currentMonth={currentMonth}
                onMonthChange={handleMonthChange}
                onDateClick={handleDateClick}
              />
            )}
          </div>
        </div>

        {/* Right Column - History Panels */}
        <div className="space-y-6">
          {/* Input Terakhir Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                <h3 className="text-md font-bold text-slate-800">Input Terakhir</h3>
              </div>
            </div>

            {recentInputs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Belum ada input
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recentInputs.map((input, idx) => {
                  const product = products.find(p => p.product_key === input.product_key);
                  const isEditing = editingId === input.id;

                  return (
                    <div
                      key={input.id || idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 text-sm">
                            {product?.product_name || input.product_key}
                          </div>
                          <div className="text-xs text-slate-500">
                            {input.member_name || members.find(m => m.id === input.member_id)?.name || 'Unknown'}
                          </div>
                        </div>
                        <div className="text-right">
                          {isEditing ? (
                            <div className="flex items-center gap-2 justify-end">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumber(editQuantity)}
                                onChange={(e) => setEditQuantity(parseNumber(e.target.value))}
                                className="w-20 bg-white border border-blue-300 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-200"
                              />
                              <span className="text-xs text-slate-500">{product?.unit}</span>
                            </div>
                          ) : (
                            <div className="font-bold text-blue-600 text-sm">
                              {input.quantity} {product?.unit}
                            </div>
                          )}
                          {input.updated_at && !isEditing && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 justify-end mt-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(input.updated_at)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(input.date)}
                        </span>
                        {input.week && (
                          <span className="px-2 py-0.5 bg-slate-200 rounded-full">
                            Week {input.week}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleUpdate(input.id!, input.product_key)}
                                disabled={isSaving}
                                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                title="Simpan"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 text-slate-600 hover:bg-slate-200 rounded transition-colors"
                                title="Batal"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(input)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(input.id!, input.product_key)}
                                disabled={isDeleting}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Riwayat Koreksi Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-slate-600" />
                <h3 className="text-md font-bold text-slate-800">Riwayat Koreksi</h3>
              </div>
              {auditLogs.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>

            {isLoadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton variant="text" width="120px" height="14px" />
                        <Skeleton variant="text" width="80px" height="12px" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton variant="text" width="80px" height="14px" />
                        <Skeleton variant="text" width="60px" height="12px" />
                      </div>
                    </div>
                    <Skeleton variant="text" width="100px" height="12px" />
                  </div>
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Belum ada koreksi
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {auditLogs.map((log, idx) => {
                  const isIncrease = log.new_quantity > log.old_quantity;
                  const isDecrease = log.new_quantity < log.old_quantity;
                  const colorClass = isIncrease ? 'text-green-600' : isDecrease ? 'text-red-600' : 'text-slate-600';
                  const arrowColor = isIncrease ? 'text-green-500' : isDecrease ? 'text-red-500' : 'text-slate-400';

                  return (
                    <div
                      key={log.id || idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 text-sm">
                            {log.product_name || log.product_key}
                          </div>
                          <div className="text-xs text-slate-500">
                            {log.member_name || 'Unknown'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-sm ${colorClass}`}>
                            {log.old_quantity} → {log.new_quantity} {log.unit}
                          </div>
                          <div className={`text-xs flex items-center gap-1 justify-end mt-1 ${colorClass}`}>
                            <span className="text-xs">
                              {isIncrease ? '↑' : isDecrease ? '↓' : '•'}
                            </span>
                            {log.changed_at && formatTime(log.changed_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDate(log.date)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acquisition Assign Modal */}
      <AcquisitionAssignModal
        isOpen={isAcquisitionModalOpen}
        onClose={() => {
          setIsAcquisitionModalOpen(false);
          setExistingAcquisitions([]);
        }}
        date={selectedDate}
        member={selectedMember || null}
        existingAcquisitions={existingAcquisitions}
        products={products.filter(p => p.is_active)}
        onSave={handleSaveAcquisitions}
        onDelete={handleDeleteAcquisition}
      />

      {/* Attendance Assign Modal */}
      <AttendanceAssignModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          setSelectedAttendance(null);
        }}
        date={selectedDate}
        member={selectedMember || null}
        existingAttendance={selectedAttendance}
        onSave={handleSaveAttendance}
        onDelete={handleDeleteAttendance}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        members={members}
        teams={teams}
        products={products}
        mode={calendarMode}
        onSave={calendarMode === 'acquisition' ? handleBulkSaveAcquisitions : handleBulkSaveAttendance}
        onDelete={calendarMode === 'acquisition' ? handleBulkDeleteAcquisitions : handleBulkDeleteAttendance}
      />
    </div>
  );
}
