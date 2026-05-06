'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Package,
  TrendingUp,
  Target,
  Award,
  GripVertical,
  ArrowUpDown,
  Tag,
  FileText,
  Clock,
  LayoutList,
} from 'lucide-react';
import GridLoader from '@/components/GridLoader';
import Skeleton from '@/components/Skeleton';
import { formatNumber, parseNumber, formatCompact } from '@/lib/formatters';

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
  credit_nominal_per_point?: number;  // For CREDIT: how many millions for 1 point
  is_active: boolean;
  sort_order?: number;
}

type SortMode = 'manual' | 'category' | 'name' | 'recent';

interface ProductManagerProps {
  products: Product[];
  onSaveProducts: (products: Product[]) => void;
  isLoading?: boolean;
}

const CATEGORY_COLORS = {
  FUNDING: 'bg-blue-100 text-blue-700 border-blue-200',
  TRANSACTION: 'bg-green-100 text-green-700 border-green-200',
  CREDIT: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function ProductManager({ products, onSaveProducts, isLoading = false }: ProductManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [isUpdatingSort, setIsUpdatingSort] = useState(false);

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const emptyProduct: Product = {
    product_key: '',
    product_name: '',
    category: 'FUNDING',
    unit: '',
    weekly_target: 0,
    is_tiered: false,
    flat_points: 0,
    credit_nominal_per_point: 100,
    is_active: true,
  };

  // Sort products based on current sort mode
  const getSortedProducts = () => {
    const sorted = [...products];
    switch (sortMode) {
      case 'category':
        return sorted.sort((a, b) => {
          const catOrder = { FUNDING: 0, TRANSACTION: 1, CREDIT: 2 };
          if (catOrder[a.category] !== catOrder[b.category]) return catOrder[a.category] - catOrder[b.category];
          return a.product_name.localeCompare(b.product_name);
        });
      case 'name':
        return sorted.sort((a, b) => a.product_name.localeCompare(b.product_name));
      case 'recent':
        return sorted.sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0));
      case 'manual':
      default:
        return sorted.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, productId: string) => {
    setDraggedId(productId);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay so the dragged element looks normal
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.4';
    }, 0);
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedId(null);
    setDragOverId(null);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, productId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(productId);
  };

  // Handle drop and update order
  const handleDrop = async (e: React.DragEvent, targetProductId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetProductId) return;

    const sortedProducts = getSortedProducts();
    const draggedIndex = sortedProducts.findIndex(p => p.id === draggedId);
    const targetIndex = sortedProducts.findIndex(p => p.id === targetProductId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder the array
    const reordered = [...sortedProducts];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    // Get product IDs in new order
    const productIds = reordered.map(p => p.id!).filter(Boolean);

    setIsUpdatingSort(true);
    try {
      const response = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Update sort_order in local state
      const updated = reordered.map((p, i) => ({ ...p, sort_order: i + 1 }));
      onSaveProducts(updated);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    } finally {
      setIsUpdatingSort(false);
      setDraggedId(null);
    }
  };

  const handleAddNew = () => {
    setEditingProduct({ ...emptyProduct });
    setIsEditing(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditing(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Hapus "${product.product_name}" secara permanen?`)) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      // If product has acquisitions, ask for confirmation
      if (response.status === 409 && result.acquisitionCount) {
        const forceDelete = confirm(
          `Produk "${product.product_name}" memiliki ${result.acquisitionCount} data akuisisi.\n\n` +
          `Hard delete akan menghapus produk TAPI data akuisisi tetap tersimpan.\n\n` +
          `Lanjutkan hapus?`
        );
        if (forceDelete) {
          // Retry with force flag
          const forceResponse = await fetch(`/api/products?id=${product.id}&force=true`, {
            method: 'DELETE',
          });
          const forceResult = await forceResponse.json();
          if (forceResult.error) throw new Error(forceResult.error);
          
          // Remove from local state
          const updated = products.filter((p) => p.id !== product.id);
          onSaveProducts(updated);
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      } else if (result.error) {
        throw new Error(result.error);
      } else {
        // Remove from local state
        const updated = products.filter((p) => p.id !== product.id);
        onSaveProducts(updated);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    // Validation
    if (!editingProduct.product_key.trim()) {
      setError('Product key is required');
      return;
    }
    if (!editingProduct.product_name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!editingProduct.unit.trim()) {
      setError('Unit is required');
      return;
    }
    if (editingProduct.is_tiered && (!editingProduct.tier_config || editingProduct.tier_config.length === 0)) {
      setError('Tiered products must have at least one tier');
      return;
    }
    if (!editingProduct.is_tiered && (editingProduct.flat_points === undefined || editingProduct.flat_points < 0)) {
      setError('Flat points must be a non-negative number');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Update local state
      const newProduct = result.data;
      let updated: Product[];
      if (editingProduct.id) {
        updated = products.map((p) => (p.id === editingProduct.id ? newProduct : p));
      } else {
        updated = [...products, newProduct];
      }
      onSaveProducts(updated);

      setIsEditing(false);
      setEditingProduct(null);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingProduct(null);
    setError(null);
  };

  const addTier = () => {
    if (!editingProduct) return;
    const tiers = editingProduct.tier_config || [];
    setEditingProduct({
      ...editingProduct,
      tier_config: [...tiers, { limit: 0, points: 0 }],
    });
  };

  const updateTier = (index: number, field: 'limit' | 'points', value: number) => {
    if (!editingProduct || !editingProduct.tier_config) return;
    const tiers = [...editingProduct.tier_config];
    tiers[index] = { ...tiers[index], [field]: value };
    setEditingProduct({ ...editingProduct, tier_config: tiers });
  };

  const removeTier = (index: number) => {
    if (!editingProduct || !editingProduct.tier_config) return;
    const tiers = editingProduct.tier_config.filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, tier_config: tiers });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Product Acquisition Config</h2>
          <p className="text-sm text-slate-500">Manage product categories, targets, and points</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
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
          <span className="text-sm font-bold">Product saved successfully!</span>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-500 uppercase">Sort:</span>
        <div className="flex gap-1">
          {([
            { key: 'manual', label: 'Manual', icon: LayoutList },
            { key: 'category', label: 'Category', icon: Tag },
            { key: 'name', label: 'Name', icon: FileText },
            { key: 'recent', label: 'Recent', icon: Clock },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSortMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortMode === key
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        {sortMode !== 'manual' && (
          <p className="text-[10px] text-slate-400 ml-1">
            Switch to Manual to enable drag & drop
          </p>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-2 py-3 w-12 text-xs font-black text-slate-600 uppercase tracking-wide">
                  {sortMode === 'manual' ? '⠿' : '#'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Unit</th>
                <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Target/Week</th>
                <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Points</th>
                <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      <td className="px-2 py-3">
                        <Skeleton variant="circular" width="16px" height="16px" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <Skeleton variant="text" width="180px" height="16px" />
                          <Skeleton variant="text" width="80px" height="12px" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton variant="rectangular" width="80px" height="24px" className="rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton variant="text" width="60px" height="14px" />
                      </td>
                      <td className="text-center px-4 py-3">
                        <Skeleton variant="text" width="50px" height="16px" />
                      </td>
                      <td className="text-center px-4 py-3">
                        <Skeleton variant="text" width="60px" height="14px" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Skeleton variant="circular" width="32px" height="32px" />
                          <Skeleton variant="circular" width="32px" height="32px" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
                ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No products configured. Click "Add Product" to create one.
                  </td>
                </tr>
              ) : (
                getSortedProducts().map((product) => {
                  const isDragged = draggedId === product.id;
                  const isDragOver = dragOverId === product.id;
                  return (
                  <tr
                    key={product.id}
                    draggable={sortMode === 'manual' && !isLoading}
                    onDragStart={(e) => handleDragStart(e, product.id!)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, product.id!)}
                    onDrop={(e) => handleDrop(e, product.id!)}
                    className={`hover:bg-slate-50 transition-all ${
                      sortMode === 'manual' ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${isDragged ? 'opacity-40 bg-blue-50' : ''} ${isDragOver ? 'border-t-2 border-blue-400 bg-blue-50' : ''} ${isUpdatingSort ? 'pointer-events-none' : ''}`}
                  >
                    <td className="px-2 py-3">
                      {sortMode === 'manual' ? (
                        <div className="flex items-center justify-center">
                          <GripVertical className="w-4 h-4 text-slate-400" />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          {getSortedProducts().findIndex(p => p.id === product.id) + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{product.product_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{product.product_key}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-black border ${
                          CATEGORY_COLORS[product.category]
                        }`}
                      >
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{product.unit}</td>
                    <td className="text-center px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
                        <Target className="w-4 h-4 text-slate-400" />
                        {formatCompact(product.weekly_target)}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      {product.is_tiered ? (
                        <div className="text-xs text-slate-500">
                          Tiered ({product.tier_config?.length} tiers)
                        </div>
                      ) : product.category === 'CREDIT' ? (
                        <div className="text-xs font-bold text-slate-700">
                          1 pt per {product.credit_nominal_per_point || 100}jt
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
                          <Award className="w-4 h-4 text-slate-400" />
                          {product.flat_points} pts
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={isSaving}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isEditing && editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Product Key */}
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                  Product Key (Code)
                </label>
                <input
                  type="text"
                  value={editingProduct.product_key}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, product_key: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., MTB, GIRO, KPR"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={editingProduct.product_name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, product_name: e.target.value })
                  }
                  placeholder="e.g., Mandiri Tabungan Bisnis"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                  Category
                </label>
                <div className="flex gap-2">
                  {(['FUNDING', 'TRANSACTION', 'CREDIT'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setEditingProduct({ ...editingProduct, category: cat })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                        editingProduct.category === cat
                          ? CATEGORY_COLORS[cat]
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={editingProduct.unit}
                  onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                  placeholder="e.g., Rekening, Aplikasi, Juta"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Weekly Target */}
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                  Weekly Target
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(editingProduct.weekly_target)}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, weekly_target: parseNumber(e.target.value) })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* CREDIT: Only show Nominal per Point */}
              {editingProduct.category === 'CREDIT' ? (
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                    Nominal per Point (Juta)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumber(editingProduct.credit_nominal_per_point || 0)}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, credit_nominal_per_point: parseNumber(e.target.value) })
                    }
                    placeholder="100"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Contoh: 100 = 1 poin per 100 juta, 50 = 1 poin per 50 juta
                  </p>
                </div>
              ) : (
                <>
                  {/* Points Configuration for FUNDING/TRANSACTION */}
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                      Points per Acquisition
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumber(editingProduct.flat_points || 0)}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, flat_points: parseNumber(e.target.value) })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                      Points Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setEditingProduct({ ...editingProduct, is_tiered: false, tier_config: undefined })
                        }
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                          !editingProduct.is_tiered
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        Flat Points
                      </button>
                      <button
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            is_tiered: true,
                            tier_config: editingProduct.tier_config || [{ limit: 0, points: 0 }],
                          })
                        }
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                          editingProduct.is_tiered
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        Tiered Points
                      </button>
                    </div>
                  </div>

                  {/* Tier Configuration */}
                  {editingProduct.is_tiered ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-black text-slate-600 uppercase">
                          Tier Configuration
                        </label>
                        <button
                          onClick={addTier}
                          className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Tier
                        </button>
                      </div>
                      <div className="space-y-2">
                        {editingProduct.tier_config?.map((tier, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 w-6">#{index + 1}</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumber(tier.limit)}
                              onChange={(e) => updateTier(index, 'limit', parseNumber(e.target.value))}
                              placeholder="Limit"
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                            />
                            <span className="text-xs text-slate-400">→</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumber(tier.points)}
                              onChange={(e) => updateTier(index, 'points', parseNumber(e.target.value))}
                              placeholder="Points"
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                            />
                            <button
                              onClick={() => removeTier(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-black hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <GridLoader pattern="edge-cw" size="sm" color="#FDB813" mode="stagger" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
