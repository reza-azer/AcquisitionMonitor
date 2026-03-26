'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Link as LinkIcon, X, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { compressImage, isValidImageFile, formatFileSize, revokeObjectUrl } from '@/lib/image-utils';
import { uploadImage, deleteImage } from '@/lib/storage';

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  aspectRatio?: string;
  placeholder?: React.ReactNode;
  entityId?: string;
  folder: 'teams' | 'members';
  maxFileSizeKB?: number;
}

export default function ImageUploader({
  value,
  onChange,
  label,
  aspectRatio = '16/10',
  placeholder,
  entityId,
  folder,
  maxFileSizeKB = 300,
}: ImageUploaderProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);

  // Track previous URL to enable cleanup when changed
  useEffect(() => {
    if (value !== previousUrl) {
      // URL changed - delete old file if it was from our storage
      if (previousUrl && previousUrl.includes('supabase.co/storage')) {
        deleteImage(previousUrl).catch(console.error);
      }
      setPreviousUrl(value || null);
    }
  }, [value, previousUrl]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        revokeObjectUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  // Set preview when value changes
  useEffect(() => {
    if (value) {
      setPreviewUrl(value);
      setUrlInput(value);
    } else {
      setPreviewUrl(null);
      setUrlInput('');
    }
  }, [value]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!isValidImageFile(file)) {
      setError('Please select a valid image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setIsCompressing(true);
    setCompressionInfo(null);

    try {
      // Compress image
      const compressed = await compressImage(file, maxFileSizeKB);
      
      setCompressionInfo({
        originalSize: file.size,
        compressedSize: compressed.size,
      });

      // Create preview
      setPreviewUrl(compressed.url);

      // Upload to storage
      setIsUploading(true);
      const result = await uploadImage(compressed.blob, folder, entityId);

      if (result.success && result.url) {
        onChange(result.url);
        setError(null);
      } else {
        setError(result.error || 'Upload failed');
        revokeObjectUrl(compressed.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsCompressing(false);
      setIsUploading(false);
    }
  }, [folder, entityId, onChange, maxFileSizeKB]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setError(null);
    }
  };

  const handleRemove = () => {
    if (previewUrl?.startsWith('blob:')) {
      revokeObjectUrl(previewUrl);
    }
    // Delete from storage if it's a Supabase URL
    if (value && value.includes('supabase.co/storage')) {
      deleteImage(value).catch(console.error);
    }
    setPreviewUrl(null);
    setUrlInput('');
    onChange(null);
    setError(null);
    setCompressionInfo(null);
    setPreviousUrl(null);
  };

  const defaultPlaceholder = (
    <div className="flex flex-col items-center justify-center text-slate-400">
      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
      <span className="text-xs font-bold">No image</span>
    </div>
  );

  return (
    <div className="w-full">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
            mode === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
            mode === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" /> Paste URL
        </button>
      </div>

      {mode === 'upload' ? (
        /* Upload Mode */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
            isUploading || isCompressing
              ? 'border-blue-300 bg-blue-50'
              : previewUrl
              ? 'border-green-300 bg-green-50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          {previewUrl ? (
            /* Preview */
            <div className="relative">
              <div 
                className="relative rounded-xl overflow-hidden bg-slate-100"
                style={{ aspectRatio }}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Compression Info */}
              {compressionInfo && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-bold text-slate-600">
                    Compressed: {formatFileSize(compressionInfo.compressedSize)}
                    <span className="text-slate-400 ml-1">
                      (was {formatFileSize(compressionInfo.originalSize)})
                    </span>
                  </span>
                </div>
              )}

              {/* Remove Button */}
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Upload Zone */
            <div className="py-8">
              {isCompressing || isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <div className="text-sm font-bold text-slate-600">
                    {isCompressing ? 'Compressing image...' : 'Uploading...'}
                  </div>
                  {compressionInfo && (
                    <div className="text-xs text-slate-500">
                      {formatFileSize(compressionInfo.compressedSize)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-700">
                          Drop image here or click to upload
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          JPEG, PNG, WebP (max 5MB, auto-compress to 300KB)
                        </div>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                      disabled={isUploading || isCompressing}
                    />
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* URL Mode */
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Set
            </button>
          </div>
          
          {previewUrl && mode === 'url' && (
            <div className="relative">
              <div 
                className="relative rounded-xl overflow-hidden bg-slate-100"
                style={{ aspectRatio }}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-bold">{error}</span>
        </div>
      )}
    </div>
  );
}
