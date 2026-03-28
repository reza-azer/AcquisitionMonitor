'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, Clock, FileText, XCircle, Save, Users, Calendar, Package } from 'lucide-react';
import GridLoader from './GridLoader';

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

interface Product {
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

interface Attendance {
  id?: string;
  member_id: string;
  date: string;
  status: 'present' | 'late' | 'leave' | 'alpha';
  leave_reason?: string;
  late_minutes?: number;
  notes?: string;
}

interface Acquisition {
  member_id: string;
  date: string;
  product_key: string;
  quantity: number;
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  teams: Team[];
  products?: Product[];
  mode?: 'attendance' | 'acquisition';
  onSave: (records: any[]) => Promise<void>;
  onDelete: (records: any[]) => Promise<void>;
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

export default function BulkEditModal({
  isOpen,
  onClose,
  members,
  teams,
  products = [],
  mode = 'attendance',
  onSave,
  onDelete,
}: BulkEditModalProps) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Attendance fields
  const [status, setStatus] = useState<'present' | 'late' | 'leave' | 'alpha'>('present');
  const [lateMinutes, setLateMinutes] = useState<number>(0);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Acquisition fields
  const [selectedProductKey, setSelectedProductKey] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState<'create' | 'delete'>('create');

  // Initialize dates to current month
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMemberIds([]);
      setStatus('present');
      setLateMinutes(0);
      setLeaveReason('');
      setNotes('');
      setSearchTerm('');
      setEditMode('create');
      setSelectedProductKey('');
      setQuantity(0);
    }
  }, [isOpen]);

  // Filter members by search
  const filteredMembers = useMemo(() => {
    return members.filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    );
  }, [members, searchTerm]);

  // Calculate affected records
  const affectedRecordsCount = useMemo(() => {
    if (!startDate || !endDate || selectedMemberIds.length === 0) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return daysDiff * selectedMemberIds.length;
  }, [startDate, endDate, selectedMemberIds.length]);

  // Generate date range
  const getDateRange = (): string[] => {
    if (!startDate || !endDate) return [];
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Handle select all members
  const handleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map(m => m.id));
    }
  };

  // Handle toggle member
  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Handle save
  const handleSave = async () => {
    if (selectedMemberIds.length === 0 || !startDate || !endDate) {
      alert('Pilih member dan rentang tanggal terlebih dahulu');
      return;
    }

    if (mode === 'acquisition' && editMode === 'create' && !selectedProductKey) {
      alert('Pilih produk terlebih dahulu');
      return;
    }

    setIsSaving(true);
    try {
      const dates = getDateRange();

      if (editMode === 'delete') {
        // Bulk delete
        const records: Pick<Attendance, 'member_id' | 'date'>[] = [];
        dates.forEach(date => {
          selectedMemberIds.forEach(memberId => {
            records.push({ member_id: memberId, date });
          });
        });
        await onDelete(records);
      } else {
        // Bulk create/update
        if (mode === 'acquisition') {
          // Acquisition mode
          const records: Omit<Acquisition, 'id'>[] = [];
          dates.forEach(date => {
            selectedMemberIds.forEach(memberId => {
              records.push({
                member_id: memberId,
                date,
                product_key: selectedProductKey,
                quantity,
              });
            });
          });
          await onSave(records);
        } else {
          // Attendance mode
          const records: Omit<Attendance, 'id'>[] = [];
          dates.forEach(date => {
            selectedMemberIds.forEach(memberId => {
              records.push({
                member_id: memberId,
                date,
                status,
                ...(status === 'late' && { late_minutes: lateMinutes }),
                ...(status === 'leave' && { leave_reason: leaveReason }),
                notes: notes || undefined,
              });
            });
          });
          await onSave(records);
        }
      }

      handleClose();
    } catch (error) {
      console.error('Failed to save bulk data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose}></div>

      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-xl">Bulk Edit {mode === 'acquisition' ? 'Akuisisi' : 'Absensi'}</h3>
              <p className="text-xs font-bold text-purple-100 mt-1">Edit {mode === 'acquisition' ? 'akuisisi' : 'absensi'} multiple member sekaligus</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-2xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setEditMode('create')}
              className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${
                editMode === 'create'
                  ? 'bg-white text-purple-700'
                  : 'bg-purple-800/50 text-purple-200 hover:bg-purple-800'
              }`}
            >
              ✏️ Create/Edit
            </button>
            <button
              onClick={() => setEditMode('delete')}
              className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${
                editMode === 'delete'
                  ? 'bg-white text-red-700'
                  : 'bg-purple-800/50 text-purple-200 hover:bg-purple-800'
              }`}
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Step 1: Select Members */}
          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-purple-600" />
              <label className="text-sm font-black text-purple-800">
                1. Pilih Member ({selectedMemberIds.length} dipilih)
              </label>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari member..."
              className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-200 mb-3"
            />

            {/* Select All */}
            <button
              onClick={handleSelectAll}
              className="text-xs font-black text-purple-600 hover:text-purple-800 mb-2"
            >
              {selectedMemberIds.length === filteredMembers.length ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>

            {/* Member List */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredMembers.map(member => {
                const isSelected = selectedMemberIds.includes(member.id);
                const team = teams.find(t => t.id === member.team_id);
                return (
                  <label
                    key={member.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                      ${isSelected
                        ? 'bg-purple-100 border-purple-300'
                        : 'bg-white border-slate-200 hover:border-purple-200'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleMember(member.id)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-black text-sm shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate">{member.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {member.position} • {team?.name || 'Unknown Team'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Step 2: Date Range */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <label className="text-sm font-black text-blue-800">
                2. Rentang Tanggal
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-blue-600 block mb-1">Dari</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-black text-blue-600 block mb-1">Sampai</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {startDate && endDate && (
              <div className="mt-3 text-xs font-black text-blue-700">
                {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)} 
                ({Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} hari)
              </div>
            )}
          </div>

          {/* Step 3: Mode-specific fields */}
          {mode === 'acquisition' ? (
            <>
              {/* Product Selection */}
              <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-purple-600" />
                  <label className="text-sm font-black text-purple-800">
                    3. Pilih Produk
                  </label>
                </div>

                <select
                  value={selectedProductKey}
                  onChange={(e) => setSelectedProductKey(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.filter(p => p.is_active).map(product => (
                    <option key={product.product_key} value={product.product_key}>
                      {product.product_name} ({product.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                  4. Jumlah
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="0"
                />
              </div>
            </>
          ) : (
            <>
              {/* Status Selection (Attendance mode) */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-3">
                  3. Status Kehadiran
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
                  rows={2}
                  placeholder="Tambahkan catatan..."
                />
              </div>
            </>
          )}

          {/* Summary */}
          {affectedRecordsCount > 0 && (
            <div className={`rounded-2xl p-4 border ${
              editMode === 'delete'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`font-black text-sm ${
                  editMode === 'delete' ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {editMode === 'delete' 
                    ? `⚠️ Akan menghapus ${affectedRecordsCount} record ${mode === 'acquisition' ? 'akuisisi' : 'absensi'}`
                    : `⚠️ Akan mempengaruhi ${affectedRecordsCount} record ${mode === 'acquisition' ? 'akuisisi' : 'absensi'}`
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 py-4 bg-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-300 transition-all disabled:opacity-50"
            >
              BATAL
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || selectedMemberIds.length === 0 || !startDate || !endDate}
              className={`
                flex-1 py-4 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2
                ${isSaving
                  ? 'bg-slate-400 cursor-not-allowed'
                  : editMode === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
                }
              `}
            >
              {isSaving ? (
                <>
                  <GridLoader pattern="edge-cw" size="sm" color="#fff" mode="stagger" />
                  {editMode === 'delete' ? 'MENGHAPUS...' : 'MENYIMPAN...'}
                </>
              ) : (
                <>
                  {editMode === 'delete' ? <X className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {editMode === 'delete' ? 'HAPUS' : 'SIMPAN'} ({affectedRecordsCount})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
