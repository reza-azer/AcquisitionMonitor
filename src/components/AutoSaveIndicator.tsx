'use client';

import React from 'react';
import { CheckCircle2, Clock, Save, AlertCircle } from 'lucide-react';
import GridLoader from './GridLoader';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  error?: string | null;
}

export default function AutoSaveIndicator({
  isSaving,
  isDirty,
  lastSaved,
  error,
}: AutoSaveIndicatorProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-bold">Save failed</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
        <GridLoader pattern="edge-cw" size="xs" color="#2563EB" mode="stagger" />
        <span className="text-xs font-bold">Saving...</span>
      </div>
    );
  }

  if (isDirty) {
    return (
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-bold">Unsaved changes</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-bold">
          Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
      <Save className="w-4 h-4 flex-shrink-0" />
      <span className="text-xs font-bold">Ready to save</span>
    </div>
  );
}
