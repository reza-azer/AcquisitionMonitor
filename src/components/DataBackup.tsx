'use client';

import React, { useState, useEffect } from 'react';
import {
  Database, Download, Upload, Save, RotateCcw, AlertCircle, CheckCircle2, XCircle,
  FileJson, Clock, HardDrive, Trash2, Eye,
} from 'lucide-react';
import GridLoader from './GridLoader';

interface BackupStats {
  totalRecords: number;
  tablesCount: number;
  tablesBreakdown: Record<string, number>;
}

interface BackupData {
  version: string;
  exportedAt: string;
  tables: Record<string, any[]>;
  stats: BackupStats;
}

interface ImportResult {
  table: string;
  imported: number;
  skipped: number;
  errors: number;
}

export default function DataBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [importResult, setImportResult] = useState<Record<string, ImportResult> | null>(null);
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'overwrite' | 'merge'>('skip');
  const [selectedTables, setSelectedTables] = useState<string[]>(['teams', 'members', 'acquisitions', 'attendances', 'products']);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BackupData | null>(null);

  const TABLES = [
    { id: 'teams', name: 'Teams', icon: Database },
    { id: 'members', name: 'Members', icon: Database },
    { id: 'acquisitions', name: 'Acquisitions', icon: Database },
    { id: 'attendances', name: 'Attendances', icon: Database },
    { id: 'products', name: 'Products', icon: Database },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const params = new URLSearchParams({ tables: selectedTables.join(',') });
      const response = await fetch(`/api/backup/export?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();
      setBackupData(data);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage(`Successfully exported ${data.stats.totalRecords} records from ${data.stats.tablesCount} tables`);
    } catch (err: any) { setError(err.message); }
    finally { setIsExporting(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewData(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.version || !data.tables) throw new Error('Invalid backup file format');
        setPreviewData(data);
      } catch (err: any) { setError(`Invalid backup file: ${err.message}`); }
    };
    reader.onerror = () => { setError('Failed to read file'); };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!previewData) return;
    setIsImporting(true);
    setError(null);
    setSuccessMessage(null);
    setImportResult(null);
    try {
      const response = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: previewData, conflictResolution }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }
      const result = await response.json();
      setImportResult(result.results);
      setSuccessMessage(`Imported ${result.summary.totalImported} records (${result.summary.totalSkipped} skipped, ${result.summary.totalErrors} errors)`);
      setPreviewFile(null);
      setPreviewData(null);
      const fileInput = document.getElementById('backupFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) { setError(err.message); }
    finally { setIsImporting(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Database className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Data Backup & Restore</h2>
          <p className="text-sm font-bold text-slate-500">Export and import your database</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl border border-green-100">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-bold">{successMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
            <Download className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Export Data</h3>
            <p className="text-xs font-bold text-slate-400">Download a backup of your data</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-3">Select Tables</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TABLES.map((table) => {
              const Icon = table.icon;
              const isSelected = selectedTables.includes(table.id);
              return (
                <button key={table.id} onClick={() => {
                  setSelectedTables(prev => prev.includes(table.id) ? prev.filter(t => t !== table.id) : [...prev, table.id]);
                }} className={`p-4 rounded-xl border-2 transition-all ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <Icon className={`w-5 h-5 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className={`text-xs font-black ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>{table.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={handleExport} disabled={isExporting || selectedTables.length === 0}
          className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm shadow-lg transition-all ${isExporting || selectedTables.length === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 hover:scale-105'}`}>
          {isExporting ? <GridLoader pattern="edge-cw" size="sm" color="#fff" mode="stagger" /> : <Download className="w-5 h-5" />}
          {isExporting ? 'EXPORTING...' : 'EXPORT BACKUP'}
        </button>

        {backupData && (
          <div className="mt-6 bg-green-50 rounded-2xl p-6 border border-green-100">
            <div className="flex items-start gap-4">
              <FileJson className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-black text-green-800 mb-2">Last Export Summary</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><div className="text-green-600 font-bold">Exported At</div><div className="text-green-800 font-black">{new Date(backupData.exportedAt).toLocaleString()}</div></div>
                  <div><div className="text-green-600 font-bold">Total Records</div><div className="text-green-800 font-black">{backupData.stats.totalRecords}</div></div>
                  <div><div className="text-green-600 font-bold">Tables</div><div className="text-green-800 font-black">{backupData.stats.tablesCount}</div></div>
                  <div><div className="text-green-600 font-bold">Version</div><div className="text-green-800 font-black">{backupData.version}</div></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(backupData.stats.tablesBreakdown).map(([table, count]) => (
                    <span key={table} className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-green-700 border border-green-200">{table}: {count}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Upload className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Import Data</h3>
            <p className="text-xs font-bold text-slate-400">Restore from a backup file</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-3">Select Backup File</label>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-amber-400 transition-colors">
            <input id="backupFile" type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
            <label htmlFor="backupFile" className="cursor-pointer">
              <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <div className="text-sm font-bold text-slate-600 mb-1">Click to upload or drag and drop</div>
              <div className="text-xs text-slate-400">JSON backup files only</div>
            </label>
          </div>
        </div>

        {previewData && (
          <div className="mb-6 bg-amber-50 rounded-2xl p-6 border border-amber-100">
            <div className="flex items-start gap-4 mb-4">
              <FileJson className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-black text-amber-800 mb-2">File Preview</div>
                <div className="text-sm text-amber-700 mb-2"><span className="font-bold">File:</span> {previewFile?.name}</div>
                <div className="text-sm text-amber-700 mb-2"><span className="font-bold">Exported:</span> {new Date(previewData.exportedAt).toLocaleString()}</div>
                <div className="text-sm text-amber-700"><span className="font-bold">Records:</span> {previewData.stats.totalRecords} across {previewData.stats.tablesCount} tables</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(previewData.stats.tablesBreakdown).map(([table, count]) => (
                <span key={table} className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-amber-700 border border-amber-200">{table}: {count}</span>
              ))}
            </div>
          </div>
        )}

        {previewData && (
          <div className="mb-6">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-3">Conflict Resolution</label>
            <div className="space-y-3">
              <button onClick={() => setConflictResolution('skip')} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${conflictResolution === 'skip' ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${conflictResolution === 'skip' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                    {conflictResolution === 'skip' && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className="font-black text-slate-800 text-sm">Skip Existing Records</div>
                    <div className="text-xs text-slate-500">Keep existing data, only import new records</div>
                  </div>
                </div>
              </button>
              <button onClick={() => setConflictResolution('overwrite')} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${conflictResolution === 'overwrite' ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${conflictResolution === 'overwrite' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                    {conflictResolution === 'overwrite' && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className="font-black text-slate-800 text-sm">Overwrite Existing</div>
                    <div className="text-xs text-slate-500">Replace existing records with backup data</div>
                  </div>
                </div>
              </button>
              <button onClick={() => setConflictResolution('merge')} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${conflictResolution === 'merge' ? 'bg-green-50 border-green-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${conflictResolution === 'merge' ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                    {conflictResolution === 'merge' && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className="font-black text-slate-800 text-sm">Smart Merge</div>
                    <div className="text-xs text-slate-500">Update existing, insert new (recommended)</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {previewData && (
          <button onClick={handleImport} disabled={isImporting}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm shadow-lg transition-all ${isImporting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 hover:scale-105'}`}>
            {isImporting ? <GridLoader pattern="edge-cw" size="sm" color="#fff" mode="stagger" /> : <RotateCcw className="w-5 h-5" />}
            {isImporting ? 'IMPORTING...' : 'IMPORT BACKUP'}
          </button>
        )}

        {importResult && (
          <div className="mt-6 bg-green-50 rounded-2xl p-6 border border-green-100">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div className="font-black text-green-800">Import Results</div>
            </div>
            <div className="space-y-2">
              {Object.entries(importResult).map(([table, result]) => (
                <div key={table} className="flex justify-between items-center bg-white rounded-lg px-4 py-2">
                  <div className="text-sm font-bold text-slate-700 capitalize">{table}</div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-600 font-black">+{result.imported} imported</span>
                    {result.skipped > 0 && <span className="text-amber-600 font-black">~{result.skipped} skipped</span>}
                    {result.errors > 0 && <span className="text-red-600 font-black">!{result.errors} errors</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-black text-red-800 mb-2">Important Notes</div>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Always create a backup before importing data</li>
              <li>• Import operations cannot be undone</li>
              <li>• Ensure backup file is from a compatible version</li>
              <li>• Large imports may take several minutes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
