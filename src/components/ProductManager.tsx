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

interface ProductManagerProps {
  products: Product[];
  onSaveProducts: (products: Product[]) => void;
}

const CATEGORY_COLORS = {
  FUNDING: 'bg-blue-100 text-blue-700 border-blue-200',
  TRANSACTION: 'bg-green-100 text-green-700 border-green-200',
  CREDIT: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function ProductManager({ products, onSaveProducts }: ProductManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const emptyProduct: Product = {
    product_key: '',
    product_name: '',
    category: 'FUNDING',
    unit: '',
    weekly_target: 0,
    is_tiered: false,
    flat_points: 0,
    is_active: true,
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
    if (!confirm(`Deactivate product "${product.product_name}"?`)) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Remove from local state
      const updated = products.filter((p) => p.id !== product.id);
      onSaveProducts(updated);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
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

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Unit</th>
                <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Target/Week</th>
                <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Points</th>
                <th className="text-center px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No products configured. Click "Add Product" to create one.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
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
                        {product.weekly_target}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      {product.is_tiered ? (
                        <div className="text-xs text-slate-500">
                          Tiered ({product.tier_config?.length} tiers)
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
                ))
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
                  type="number"
                  value={editingProduct.weekly_target}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, weekly_target: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                />
              </div>

              {/* Product Type */}
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

              {/* Points Configuration */}
              {!editingProduct.is_tiered ? (
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase mb-2">
                    Points per Acquisition
                  </label>
                  <input
                    type="number"
                    value={editingProduct.flat_points || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, flat_points: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                </div>
              ) : (
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
                          type="number"
                          value={tier.limit}
                          onChange={(e) => updateTier(index, 'limit', parseInt(e.target.value) || 0)}
                          placeholder="Limit"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                        <span className="text-xs text-slate-400">→</span>
                        <input
                          type="number"
                          value={tier.points}
                          onChange={(e) => updateTier(index, 'points', parseInt(e.target.value) || 0)}
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
