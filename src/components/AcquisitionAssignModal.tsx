'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, Save, Trash2, AlertCircle } from 'lucide-react';
import GridLoader from './GridLoader';

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

interface Acquisition {
  id?: string;
  member_id: string;
  date: string;
  week?: number;
  product_key: string;
  quantity: number;
}

interface AcquisitionAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  member: { id: string; name: string; position: string } | null;
  existingAcquisitions: Acquisition[];
  products: Product[];
  onSave: (acquisitions: Omit<Acquisition, 'id'>[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function AcquisitionAssignModal({
  isOpen,
  onClose,
  date,
  member,
  existingAcquisitions,
  products,
  onSave,
  onDelete,
}: AcquisitionAssignModalProps) {
  const [inputData, setInputData] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Initialize input data from existing acquisitions
  useEffect(() => {
    if (existingAcquisitions.length > 0) {
      const data: Record<string, number> = {};
      existingAcquisitions.forEach(acq => {
        data[acq.product_key] = acq.quantity;
      });
      setInputData(data);
    } else {
      setInputData({});
    }
    setSaveStatus('idle');
    setError(null);
  }, [existingAcquisitions, isOpen]);

  const handleInputChange = (productKey: string, value: string) => {
    const qty = parseInt(value) || 0;
    setInputData(prev => ({
      ...prev,
      [productKey]: qty
    }));
    setSaveStatus('idle');
    setError(null);
  };

  const hasChanges = Object.values(inputData).some(qty => {
    const existing = existingAcquisitions.find(a => a.product_key === Object.keys(inputData)[0]);
    return qty !== (existing?.quantity || 0);
  });

  const handleSave = async () => {
    if (!member || !date) return;

    setIsSaving(true);
    setError(null);
    try {
      // Calculate week from date
      const dateObj = new Date(date);
      const day = dateObj.getDate();
      const firstDayOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      const firstDayWeekday = firstDayOfMonth.getDay();
      const weekNum = Math.min(Math.ceil((day + firstDayWeekday) / 7), 4);

      const acquisitions: Omit<Acquisition, 'id'>[] = products
        .filter(p => p.is_active)
        .map(product => ({
          member_id: member.id,
          date,
          week: weekNum,
          product_key: product.product_key,
          quantity: inputData[product.product_key] || 0
        }));

      await onSave(acquisitions);
      setSaveStatus('success');
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (err: any) {
      console.error('Failed to save acquisitions:', err);
      setError(err.message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSingle = async (productKey: string) => {
    const existing = existingAcquisitions.find(a => a.product_key === productKey);
    if (!existing?.id) return;

    const product = products.find(p => p.product_key === productKey);
    if (!window.confirm(`Hapus ${product?.product_name || productKey}?`)) return;

    setDeletingId(existing.id);
    try {
      await onDelete(existing.id);
      // Remove from input data
      setInputData(prev => {
        const newData = { ...prev };
        delete newData[productKey];
        return newData;
      });
    } catch (err: any) {
      console.error('Failed to delete acquisition:', err);
      setError(err.message);
    } finally {
      setDeletingId(null);
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

  const getCategoryColor = (category: string) => {
    const colors = {
      FUNDING: 'bg-blue-100 text-blue-700 border-blue-200',
      TRANSACTION: 'bg-green-100 text-green-700 border-green-200',
      CREDIT: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[category as keyof typeof colors] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (!isOpen || !date || !member) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose}></div>

      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-xl">Input Akuisisi</h3>
              <p className="text-xs font-bold text-purple-100 mt-1">{formatDate(date)}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-2xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}
        {saveStatus === 'success' && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl border border-green-100">
            <Save className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-bold">Data berhasil disimpan!</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Member Info */}
          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-black">
                {member.name.charAt(0)}
              </div>
              <div>
                <div className="font-black text-slate-800 text-sm">{member.name}</div>
                <div className="text-xs font-bold text-slate-500">{member.position}</div>
              </div>
            </div>
          </div>

          {/* Product Input Form */}
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-3">
              Input Produk
            </label>
            <div className="space-y-3">
              {products.filter(p => p.is_active).map(product => {
                const existingQty = inputData[product.product_key] || 0;
                const hasExistingData = existingAcquisitions.some(a => a.product_key === product.product_key);
                
                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      hasExistingData && existingQty > 0
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-slate-50 border-slate-100'
                    }`}
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
                        className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-center outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                      />
                      <span className="text-xs text-slate-500 w-16">{product.unit}</span>
                      
                      {hasExistingData && existingQty > 0 && (
                        <button
                          onClick={() => handleDeleteSingle(product.product_key)}
                          disabled={deletingId === existingAcquisitions.find(a => a.product_key === product.product_key)?.id}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {deletingId ? (
                            <GridLoader pattern="edge-cw" size="sm" color="#dc2626" mode="stagger" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
              disabled={isSaving}
              className={`
                flex-1 py-4 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2
                ${isSaving
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
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
                  SIMPAN
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
