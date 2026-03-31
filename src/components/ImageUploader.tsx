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

  // Determine mode based on label
  const isUploadMode = label.toLowerCase().includes('upload');

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
      {isUploadMode ? (
        /* Upload Mode */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
            isUploading || isCompressing
              ? 'border-blue-300 bg-blue-50'
              : previewUrl
              ? 'border-green-300 bg-green-50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          {previewUrl ? (
            // Preview
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
            // Upload Zone
            <div className="py-6">
              {isCompressing || isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  <div className="text-xs font-bold text-slate-600">
                    {isCompressing ? 'Compressing...' : 'Uploading...'}
                  </div>
                </div>
              ) : (
                <>
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-xs font-black text-slate-600">
                        Upload
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
        // URL Mode
        <div className="space-y-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
          <button
            type="button"
            onClick={() => {
              if (urlInput.trim()) {
                onChange(urlInput.trim());
                setError(null);
              }
            }}
            disabled={!urlInput.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Set URL
          </button>

          {previewUrl && (
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
