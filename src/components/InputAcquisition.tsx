'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
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
} from 'lucide-react';
import GridLoader from '@/components/GridLoader';

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
  date: string;
  week?: number;
  product_key: string;
  quantity: number;
  updated_at?: string;
}

interface InputAcquisitionProps {
  products: Product[];
  teams: Team[];
  members: Member[];
}

export default function InputAcquisition({ products, teams, members }: InputAcquisitionProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [inputData, setInputData] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [recentInputs, setRecentInputs] = useState<Acquisition[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Filter members by search term
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  // Get member details
  const selectedMember = members.find(m => m.id === selectedMemberId);

  // Load existing data for selected date and member
  const loadExistingData = useCallback(async () => {
    if (!selectedMemberId || !selectedDate) return;

    setIsLoadingRecent(true);
    try {
      const res = await fetch(
        `/api/acquisitions?member_id=${selectedMemberId}&date=${selectedDate}`
      );
      if (res.ok) {
        const data = await res.json();
        const existingData: Record<string, number> = {};
        data.forEach((item: Acquisition) => {
          existingData[item.product_key] = item.quantity;
        });
        setInputData(existingData);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [selectedMemberId, selectedDate]);

  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // Load recent inputs for overview
  const loadRecentInputs = useCallback(async () => {
    setIsLoadingRecent(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await fetch(`/api/acquisitions?startDate=${thirtyDaysAgo}&endDate=${today}`);
      if (res.ok) {
        const data = await res.json();
        setRecentInputs(data.slice(0, 20)); // Last 20 entries
      }
    } catch (error) {
      console.error('Error loading recent inputs:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    loadRecentInputs();
  }, [loadRecentInputs]);

  const handleInputChange = (productKey: string, value: string) => {
    const qty = parseInt(value) || 0;
    setInputData(prev => ({
      ...prev,
      [productKey]: qty
    }));
    setSaveStatus('idle');
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedMemberId) {
      setError('Please select a member');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savePromises = products
        .filter(p => p.is_active)
        .map(product => {
          const quantity = inputData[product.product_key] || 0;
          return fetch('/api/acquisitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              member_id: selectedMemberId,
              date: selectedDate,
              product_key: product.product_key,
              quantity
            })
          });
        });

      const results = await Promise.all(savePromises);
      const failed = results.some(r => !r.ok);

      if (failed) throw new Error('Some requests failed');

      setSaveStatus('success');
      setInputData({});
      loadRecentInputs();
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.values(inputData).some(qty => qty !== 0);

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
          <h2 className="text-lg font-bold text-slate-800">Input Akuisisi</h2>
          <p className="text-sm text-slate-500">Input data akuisisi berdasarkan tanggal</p>
        </div>
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
        {/* Left Column - Input Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date and Member Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Date Picker */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase mb-2">
                  <Calendar className="w-4 h-4" />
                  Tanggal Input
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setInputData({});
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Member Search */}
              <div>
                <label className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase mb-2">
                  <User className="w-4 h-4" />
                  Pilih Member
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama atau posisi..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* Member Dropdown */}
            <div className="mb-4">
              <select
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                  setInputData({});
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

          {/* Product Input Form */}
          {selectedMember && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Input Produk
                </h3>
                {isLoadingRecent && (
                  <GridLoader pattern="edge-cw" size="sm" color="#64748b" mode="stagger" />
                )}
              </div>

              <div className="space-y-3">
                {products.filter(p => p.is_active).map(product => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800">{product.product_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${getCategoryColor(product.category)}`}>
                          {product.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Target: {product.weekly_target} {product.unit} • 
                        {product.is_tiered ? ' Tiered' : ` ${product.flat_points} pts/${product.unit}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        value={inputData[product.product_key] || 0}
                        onChange={(e) => handleInputChange(product.product_key, e.target.value)}
                        placeholder="0"
                        className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                      />
                      <span className="text-xs text-slate-500 w-16">{product.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  {hasChanges ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Ada perubahan yang belum disimpan
                    </span>
                  ) : (
                    <span>Tidak ada perubahan</span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? (
                    <GridLoader pattern="edge-cw" size="sm" color="#FDB813" mode="stagger" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Recent Inputs */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-slate-600" />
              <h3 className="text-md font-bold text-slate-800">Input Terakhir</h3>
            </div>

            {isLoadingRecent ? (
              <div className="flex justify-center py-8">
                <GridLoader pattern="edge-cw" size="md" color="#64748b" mode="stagger" />
              </div>
            ) : recentInputs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Belum ada input
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recentInputs.map((input, idx) => (
                  <div
                    key={input.id || idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 text-sm">
                          {products.find(p => p.product_key === input.product_key)?.product_name || input.product_key}
                        </div>
                        <div className="text-xs text-slate-500">
                          {members.find(m => m.id === input.member_id)?.name || 'Unknown'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600 text-sm">
                          {input.quantity} {products.find(p => p.product_key === input.product_key)?.unit}
                        </div>
                        {input.updated_at && (
                          <div className="text-xs text-slate-400 flex items-center gap-1 justify-end mt-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(input.updated_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(input.date)}
                      </span>
                      {input.week && (
                        <span className="px-2 py-0.5 bg-slate-200 rounded-full">
                          Week {input.week}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
