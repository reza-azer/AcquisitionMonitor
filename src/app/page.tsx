'use client'
import {
  BarChart3,
  Check,
  Download,
  Edit2,
  FileSpreadsheet,
  ImageIcon,
  LineChart as LineChartIcon,
  Loader2,
  Medal,
  Plus,
  Save,
  Settings,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  UserPlus, X
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer as RechartsContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ImageUploader from '@/components/ImageUploader';
import { deleteImage } from '@/lib/storage';

// --- KONFIGURASI POIN & TARGET ---
type TieredProduct = { name: string; unit: string; type: 'tiered'; tiers: {limit: number; p: number}[] };
type SimpleProduct = { name: string; unit: string; p: number };
type ProductConfig = TieredProduct | SimpleProduct;

const PRODUCT_POINTS: Record<string, ProductConfig> = {
  MTB: { name: 'Mandiri Tabungan Bisnis', unit: 'Rekening', type: 'tiered' as const, tiers: [{limit: 10, p: 3}, {limit: 30, p: 6}, {limit: 999, p: 9}] },
  GIRO: { name: 'Tabungan Giro', unit: 'Rekening', type: 'tiered' as const, tiers: [{limit: 5, p: 3}, {limit: 999, p: 6}] },
  EDC: { name: 'EDC', unit: 'Aplikasi', p: 3 },
  KOPRA: { name: 'Kopra', unit: 'Aplikasi', p: 2 },
  MTR: { name: 'Mandiri Tabungan Rencana', unit: 'Rekening', p: 2 },
  CC: { name: 'Credit Card', unit: 'Aplikasi', p: 2 },
  KPR: { name: 'KPR', unit: 'Juta', p: 4 },
  KSM: { name: 'KSM', unit: 'Juta', p: 4 },
  KUM: { name: 'KUM', unit: 'Juta', p: 2 },
  KUR: { name: 'KUR', unit: 'Juta', p: 2 },
  LVMUREG: { name: 'LVM Ureg', unit: 'Aplikasi', p: 1 },
  LVMUSAC: { name: 'LVM Usac', unit: 'Aplikasi', p: 1 },
  GMM: { name: 'GMM', unit: 'Rekening', p: 1 },
};

const WEEKLY_TARGETS: Record<string, number> = {
  MTB: 4, GIRO: 2, MTR: 28, KOPRA: 1, EDC: 2, GMM: 84, CC: 2, KUM: 130, KUR: 174, KSM: 36, KPR: 80, LVMUREG: 17, LVMUSAC: 45
};

const MandiriLogo = () => (
  <img
    src="Bank_Mandiri_logo.png"
    alt="mandiri"
    className="h-7 w-auto object-contain"
  />
);

interface Team {
  id: string;
  name: string;
  image_url: string | null;
  accent_color: string;
  members?: Member[];
}

interface Member {
  id: string;
  team_id: string;
  name: string;
  position: string;
  avatar_url: string | null;
  weeklyAcquisitions?: Record<number, Record<string, number>>;
}

interface Acquisition {
  id: string;
  member_id: string;
  week: number;
  product_key: string;
  quantity: number;
}

export default function App() {
  const [viewMode, setViewMode] = useState('dashboard');
  const [activeWeek, setActiveWeek] = useState(1);
  const [isExcelReady, setIsExcelReady] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState([1]);
  const [isLoading, setIsLoading] = useState(true);

  // Data state
  const [teams, setTeams] = useState<Team[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);

  // Form states
  const [newTeam, setNewTeam] = useState({ name: '', image_url: '' });
  const [tempMember, setTempMember] = useState({ name: '', position: '', avatar_url: '' });
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMember, setEditingMember] = useState<{teamId: string, memberId: string, name: string, position: string, avatar_url: string | null} | null>(null);

  // Pending acquisitions state (local cache before save)
  const [pendingAcquisitions, setPendingAcquisitions] = useState<Record<string, Record<string, number>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Chart customization state
  const [showChartControls, setShowChartControls] = useState(false);
  const [chartFilters, setChartFilters] = useState({
    filterByTeam: 'all' as string,
    filterByMember: 'all' as string,
    metric: 'score' as 'score' | 'quantity',
    selectedProducts: Object.keys(PRODUCT_POINTS) as string[]
  });
  const [teamColors, setTeamColors] = useState<Record<string, string>>({});

  // Member detail modal state
  const [selectedMember, setSelectedMember] = useState<{member: Member, team: Team} | null>(null);

  // Migration modal state
  const [migratingMember, setMigratingMember] = useState<{member: Member, team: Team} | null>(null);
  const [migrationTargetTeam, setMigrationTargetTeam] = useState<string>('');
  const [migrateWithData, setMigrateWithData] = useState<boolean | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem('chartTeamColors');
    const savedFilters = localStorage.getItem('chartFilters');
    if (savedColors) {
      try {
        setTeamColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('Failed to load team colors:', e);
      }
    }
    if (savedFilters) {
      try {
        setChartFilters(JSON.parse(savedFilters));
      } catch (e) {
        console.error('Failed to load chart filters:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('chartTeamColors', JSON.stringify(teamColors));
  }, [teamColors]);

  useEffect(() => {
    localStorage.setItem('chartFilters', JSON.stringify(chartFilters));
  }, [chartFilters]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedMember) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedMember]);

  // Load SheetJS for XLSX support
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setIsExcelReady(true);
    document.body.appendChild(script);
  }, []);

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [teamsRes, acquisitionsRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/acquisitions')
      ]);

      if (!teamsRes.ok || !acquisitionsRes.ok) throw new Error('Failed to fetch data');

      const teamsData = await teamsRes.json();
      const acquisitionsData = await acquisitionsRes.json();

      // Fetch members for each team
      const membersRes = await fetch('/api/members');
      if (!membersRes.ok) throw new Error('Failed to fetch members');
      const membersData = await membersRes.json();

      // Structure data with acquisitions
      const teamsWithMembers = teamsData.map((team: Team) => ({
        ...team,
        members: membersData
          .filter((m: Member) => m.team_id === team.id)
          .map((member: Member) => ({
            ...member,
            weeklyAcquisitions: acquisitionsData
              .filter((a: Acquisition) => a.member_id === member.id)
              .reduce((acc: Record<number, Record<string, number>>, a: Acquisition) => {
                if (!acc[a.week]) acc[a.week] = {};
                acc[a.week][a.product_key] = a.quantity;
                return acc;
              }, {})
          }))
      }));

      setTeams(teamsWithMembers);
      setAcquisitions(acquisitionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getMemberPoints = (acquisitions: Record<string, number> | undefined) => {
    let total = 0;
    if (!acquisitions) return 0;
    Object.keys(acquisitions).forEach(key => {
      const qty = acquisitions[key];
      const product = PRODUCT_POINTS[key];
      if (!product) return;
      if ('type' in product && product.type === 'tiered') {
        const tier = product.tiers.find(t => qty <= t.limit) || product.tiers[product.tiers.length - 1];
        total += qty * tier.p;
      } else {
        total += qty * (product as SimpleProduct).p;
      }
    });
    return total;
  };

  const teamStats = useMemo(() => {
    return teams.map(team => {
      const combined: Record<string, number> = {};
      (team.members || []).forEach(m => {
        const currentAqc = (m.weeklyAcquisitions || {})[activeWeek] || {};
        Object.keys(currentAqc).forEach(p => combined[p] = (combined[p] || 0) + currentAqc[p]);
      });
      return { ...team, stats: combined, totalPoints: getMemberPoints(combined) };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [teams, activeWeek]);

  const chartData = useMemo(() => {
    const weeks = [1, 2, 3, 4];
    return weeks.map(w => {
      const dataPoint: Record<string, string | number> = { name: `Week ${w}` };

      teams.forEach(t => {
        // Filter by team
        if (chartFilters.filterByTeam !== 'all' && t.id !== chartFilters.filterByTeam) {
          return;
        }

        let metricValue = 0;

        (t.members || []).forEach(m => {
          // Filter by member
          if (chartFilters.filterByMember !== 'all' && m.id !== chartFilters.filterByMember) {
            return;
          }

          const memberAcq = (m.weeklyAcquisitions || {})[w] || {};

          if (chartFilters.metric === 'score') {
            // Calculate score based on filtered products
            Object.keys(memberAcq).forEach(productKey => {
              if (!chartFilters.selectedProducts.includes(productKey)) return;
              const qty = memberAcq[productKey];
              const product = PRODUCT_POINTS[productKey];
              if (!product) return;
              if ('type' in product && product.type === 'tiered') {
                const tier = product.tiers.find(tier => qty <= tier.limit) || product.tiers[product.tiers.length - 1];
                metricValue += qty * tier.p;
              } else {
                metricValue += qty * (product as SimpleProduct).p;
              }
            });
          } else {
            // Calculate quantity based on filtered products
            Object.keys(memberAcq).forEach(productKey => {
              if (!chartFilters.selectedProducts.includes(productKey)) return;
              metricValue += memberAcq[productKey];
            });
          }
        });

        dataPoint[t.name] = metricValue;
      });

      return dataPoint;
    });
  }, [teams, chartFilters]);

  const globalMemberRankings = useMemo(() => {
    const allMembers: (Member & { teamName: string, totalPoints: number, acquisitions: Record<string, number> })[] = [];
    teams.forEach(t => {
      (t.members || []).forEach(m => {
        const currentAqc = (m.weeklyAcquisitions || {})[activeWeek] || {};
        allMembers.push({ ...m, teamName: t.name, totalPoints: getMemberPoints(currentAqc), acquisitions: currentAqc });
      });
    });
    return allMembers.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [teams, activeWeek]);

  // --- API CALLS ---
  const addTeam = async () => {
    if (!newTeam.name) return;
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeam.name, image_url: newTeam.image_url || null })
      });
      if (res.ok) {
        setNewTeam({ name: '', image_url: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const deleteTeam = async (id: string) => {
    if (window.confirm("Hapus tim ini beserta seluruh anggotanya?")) {
      try {
        // Get team data to find image URL
        const team = teams.find(t => t.id === id);
        if (team?.image_url && team.image_url.includes('supabase.co/storage')) {
          await deleteImage(team.image_url);
        }
        
        const res = await fetch(`/api/teams?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
      } catch (error) {
        console.error('Error deleting team:', error);
      }
    }
  };

  const updateTeam = async () => {
    if (!editingTeam) return;
    try {
      const res = await fetch(`/api/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTeam.id, name: editingTeam.name, image_url: editingTeam.image_url })
      });
      if (res.ok) {
        setEditingTeam(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const addMemberToTeam = async (teamId: string) => {
    if (!tempMember.name || !tempMember.position) return;
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          team_id: teamId, 
          name: tempMember.name, 
          position: tempMember.position, 
          avatar_url: tempMember.avatar_url || null 
        })
      });
      if (res.ok) {
        setTempMember({ name: '', position: '', avatar_url: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating member:', error);
    }
  };

  const deleteMember = async (teamId: string, memberId: string) => {
    if (window.confirm("Hapus anggota ini?")) {
      try {
        // Get member data to find avatar URL
        const member = teams
          .flatMap(t => t.members || [])
          .find(m => m.id === memberId);
        
        if (member?.avatar_url && member.avatar_url.includes('supabase.co/storage')) {
          await deleteImage(member.avatar_url);
        }
        
        const res = await fetch(`/api/members?id=${memberId}`, { method: 'DELETE' });
        if (res.ok) fetchData();
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  const updateMember = async () => {
    if (!editingMember) return;
    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.memberId,
          name: editingMember.name,
          position: editingMember.position,
          avatar_url: editingMember.avatar_url
        })
      });
      if (res.ok) {
        setEditingMember(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const migrateMember = async () => {
    if (!migratingMember || !migrationTargetTeam || migrateWithData === null) return;
    
    setIsMigrating(true);
    try {
      const res = await fetch('/api/members/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: migratingMember.member.id,
          new_team_id: migrationTargetTeam,
          migrate_data: migrateWithData
        })
      });
      
      if (res.ok) {
        await fetchData();
        setMigratingMember(null);
        setMigrationTargetTeam('');
        setMigrateWithData(null);
        alert('Anggota berhasil dipindahkan ke tim baru!');
      } else {
        throw new Error('Migration failed');
      }
    } catch (error) {
      console.error('Error migrating member:', error);
      alert('Gagal memindahkan anggota. Silakan coba lagi.');
    } finally {
      setIsMigrating(false);
    }
  };

  const updateAcquisition = (memberId: string, productKey: string, value: string) => {
    const val = parseInt(value) || 0;
    const key = `${memberId}|${activeWeek}`;
    setPendingAcquisitions(prev => {
      const newData = {
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [productKey]: val
        }
      };
      console.log('Pending acquisitions updated:', newData);
      return newData;
    });
  };

  const saveAllAcquisitions = async () => {
    console.log('Saving acquisitions:', pendingAcquisitions);
    setIsSaving(true);
    try {
      const savePromises = Object.entries(pendingAcquisitions).flatMap(([key, products]) => {
        const [memberId, weekStr] = key.split('|');
        const week = parseInt(weekStr);
        return Object.entries(products).map(([productKey, quantity]) => {
          console.log(`Saving: member=${memberId}, week=${week}, product=${productKey}, qty=${quantity}`);
          return fetch('/api/acquisitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              member_id: memberId,
              week: week,
              product_key: productKey,
              quantity
            })
          });
        });
      });

      const results = await Promise.all(savePromises);
      console.log('Save results:', results);

      // Check for failed requests
      const failed = results.some(r => !r.ok);
      if (failed) {
        throw new Error('Some requests failed');
      }

      setPendingAcquisitions({});
      await fetchData();
      alert('Data berhasil disimpan!');
    } catch (error) {
      console.error('Error saving acquisitions:', error);
      alert('Gagal menyimpan data. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasPendingChanges = Object.keys(pendingAcquisitions).length > 0;

  // --- FITUR EXPORT EXCEL MULTI-WEEK ---
  const handleExportAction = () => {
    if (!(window as typeof window & { XLSX?: any }).XLSX) return;
    if (selectedWeeks.length === 0) {
      alert("Pilih minimal satu minggu untuk diekspor.");
      return;
    }

    const products = Object.keys(PRODUCT_POINTS);
    let finalData: Record<string, string | number>[] = [];

    selectedWeeks.sort().forEach(weekNum => {
      teams.forEach(t => {
        (t.members || []).forEach(m => {
          const acq = (m.weeklyAcquisitions || {})[weekNum] || {};
          const row: Record<string, string | number> = {
            "Minggu": `Minggu ${weekNum}`,
            "Nama Sales": m.name,
            "Tim": t.name,
            "Jabatan": m.position,
            "Total Poin": getMemberPoints(acq)
          };
          products.forEach(p => {
            row[p] = acq[p] || 0;
          });
          finalData.push(row);
        });
      });
    });

    const worksheet = (window as any).XLSX.utils.json_to_sheet(finalData);
    const workbook = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Performa");
    (window as any).XLSX.writeFile(workbook, `Laporan_MPS_Terpilih.xlsx`);
    setShowExportModal(false);
  };

  const toggleWeekSelection = (w: number) => {
    setSelectedWeeks(prev =>
      prev.includes(w) ? prev.filter(item => item !== w) : [...prev, w]
    );
  };

  const getTierByRank = (memberId: string) => {
    const rankIndex = globalMemberRankings.findIndex(m => m.id === memberId);
    const member = globalMemberRankings.find(m => m.id === memberId);
    if (!member || member.totalPoints === 0) return { label: 'Rookie', color: 'text-slate-400', icon: <Star className="w-4 h-4" />, bg: 'bg-slate-50' };
    if (rankIndex === 0) return { label: 'MVP / Diamond', color: 'text-cyan-600', icon: <Trophy className="w-4 h-4" />, bg: 'bg-cyan-50' };
    if (rankIndex >= 1 && rankIndex <= 2) return { label: 'Gold', color: 'text-yellow-600', icon: <Medal className="w-4 h-4" />, bg: 'bg-yellow-50' };
    if (rankIndex >= 3 && rankIndex <= 5) return { label: 'Silver', color: 'text-slate-500', icon: <Medal className="w-4 h-4" />, bg: 'bg-slate-50' };
    return { label: 'Bronze', color: 'text-orange-600', icon: <Star className="w-4 h-4" />, bg: 'bg-orange-50' };
  };

  const colors = ['#003d79', '#FDB813', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-[#003d79] text-white sticky top-0 z-50 shadow-lg border-b-4 border-[#FDB813]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MandiriLogo />
            <div className="h-8 w-px bg-white/20 mx-1 hidden sm:block"></div>
            <h1 className="text-lg font-bold tracking-tight">Acquisition Monitor</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-blue-900/60 rounded-full p-1 border border-white/10">
              {[1, 2, 3, 4].map(w => (
                <button key={w} onClick={() => setActiveWeek(w)} className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${activeWeek === w ? 'bg-[#FDB813] text-blue-900 shadow-sm' : 'text-white/60 hover:text-white'}`}>WEEK {w}</button>
              ))}
            </div>
            <nav className="hidden md:flex bg-blue-900/40 p-1 rounded-xl gap-1 border border-white/5">
              <button onClick={() => setViewMode('dashboard')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'dashboard' ? 'bg-white text-blue-900 shadow-md' : 'text-white/70 hover:text-white'}`}><BarChart3 className="w-4 h-4" /> Dashboard</button>
              <button onClick={() => setViewMode('manage')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'manage' ? 'bg-white text-blue-900 shadow-md' : 'text-white/70 hover:text-white'}`}><Settings className="w-4 h-4" /> Manage</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {/* <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Calendar className="text-blue-600 w-8 h-8" /> Rekapitulasi Minggu ke-{activeWeek}</h2> */}
            {/* <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">Data Terkini Bulan Maret 2026</p> */}
          </div>
          <div className="flex items-center gap-3">
             <button
               onClick={() => setShowExportModal(true)}
               disabled={!isExcelReady}
               className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95 ${isExcelReady ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
             >
               <FileSpreadsheet className="w-4 h-4" /> EXPORT EXCEL
             </button>
             <div className="md:hidden flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto gap-2">
                {[1, 2, 3, 4].map(w => (
                  <button key={w} onClick={() => setActiveWeek(w)} className={`flex-shrink-0 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeWeek === w ? 'bg-[#003d79] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>W{w}</button>
                ))}
            </div>
          </div>
        </div>

        {/* --- EXPORT MODAL --- */}
        {showExportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExportModal(false)}></div>
            <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200">
               <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-xl text-slate-800">Opsi Ekspor Excel</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Pilih periode data</p>
                  </div>
                  <button onClick={() => setShowExportModal(false)} className="p-2 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
               </div>

               <div className="space-y-3 mb-8">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Minggu Tersedia</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(w => (
                      <button
                        key={w}
                        onClick={() => toggleWeekSelection(w)}
                        className={`py-4 rounded-3xl border-2 font-black text-sm transition-all flex items-center justify-center gap-3 ${selectedWeeks.includes(w) ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-white border-slate-100 text-slate-300'}`}
                      >
                        {selectedWeeks.includes(w) ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-slate-200"/>}
                        Minggu {w}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedWeeks(selectedWeeks.length === 4 ? [] : [1, 2, 3, 4])}
                    className="w-full py-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    {selectedWeeks.length === 4 ? "Batalkan Semua" : "Pilih Semua Minggu"}
                  </button>
               </div>

               <button
                onClick={handleExportAction}
                className="w-full bg-[#003d79] text-white py-5 rounded-[24px] font-black tracking-tight shadow-xl shadow-blue-100 hover:bg-blue-800 active:scale-95 transition-all flex items-center justify-center gap-3"
               >
                 <Download className="w-5 h-5"/> UNDUH LAPORAN .XLSX
               </button>
            </div>
          </div>
        )}

        {/* --- MEMBER DETAIL MODAL --- */}
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto" style={{ scrollBehavior: 'auto' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedMember(null)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-4 border-white shadow-lg">
                    {selectedMember.member.avatar_url ? (
                      <img src={selectedMember.member.avatar_url} alt={selectedMember.member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-black text-2xl">
                        {selectedMember.member.name?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-800">{selectedMember.member.name}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedMember.member.position}</p>
                    <p className="text-[10px] font-bold text-blue-600 mt-0.5">{selectedMember.team.name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMember(null)} className="p-2 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Score Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-5 border border-blue-200">
                  <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Akuisisi</div>
                  <div className="text-3xl font-black text-blue-900">
                    {(() => {
                      const total = Object.values(selectedMember.member.weeklyAcquisitions || {})
                        .flatMap(week => Object.values(week))
                        .reduce((sum, qty) => sum + qty, 0);
                      return total;
                    })()}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-5 border border-green-200">
                  <div className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Total Skor</div>
                  <div className="text-3xl font-black text-green-900">
                    {(() => {
                      let totalScore = 0;
                      Object.values(selectedMember.member.weeklyAcquisitions || {}).forEach(weekAcq => {
                        totalScore += getMemberPoints(weekAcq);
                      });
                      return totalScore;
                    })()}
                  </div>
                </div>
              </div>

              {/* Weekly Breakdown */}
              <div className="mb-6">
                <h4 className="font-black text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  BREAKDOWN PER MINGGU
                </h4>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(week => {
                    const weekAcq = (selectedMember.member.weeklyAcquisitions || {})[week] || {};
                    const weekScore = getMemberPoints(weekAcq);
                    const weekTotal = Object.values(weekAcq).reduce((sum: number, qty: number) => sum + qty, 0);
                    const hasData = weekTotal > 0;

                    return (
                      <div
                        key={week}
                        className={`rounded-2xl border p-4 transition-all ${hasData ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'}`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${hasData ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              W{week}
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                              {hasData ? `${weekTotal} Akuisisi` : 'Tidak ada data'}
                            </span>
                          </div>
                          <div className={`text-lg font-black ${hasData ? 'text-green-600' : 'text-slate-300'}`}>
                            +{weekScore} Poin
                          </div>
                        </div>

                        {hasData && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(weekAcq)
                              .filter(([_, qty]) => qty > 0)
                              .map(([product, qty]) => {
                                const productConfig = PRODUCT_POINTS[product];
                                let pointsEarned = 0;
                                if (productConfig) {
                                  if ('type' in productConfig && productConfig.type === 'tiered') {
                                    const tier = productConfig.tiers.find(t => qty <= t.limit) || productConfig.tiers[productConfig.tiers.length - 1];
                                    pointsEarned = qty * tier.p;
                                  } else {
                                    pointsEarned = qty * (productConfig as SimpleProduct).p;
                                  }
                                }
                                return (
                                  <div key={product} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">{product}</div>
                                    <div className="flex justify-between items-center mt-1">
                                      <span className="text-sm font-bold text-slate-700">{qty} {productConfig?.unit}</span>
                                      <span className="text-xs font-black text-green-600">+{pointsEarned}</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Score Calculation Info */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ringkasan Skor</div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Trophy className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="font-bold">
                    {(() => {
                      let totalScore = 0;
                      Object.values(selectedMember.member.weeklyAcquisitions || {}).forEach(weekAcq => {
                        totalScore += getMemberPoints(weekAcq);
                      });
                      return `Total kumulatif: ${totalScore} poin dari semua minggu`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MEMBER MIGRATION MODAL --- */}
        {migratingMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto" style={{ scrollBehavior: 'auto' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setMigratingMember(null); setMigrationTargetTeam(''); setMigrateWithData(null); }}></div>
            <div className="bg-white w-full max-w-xl rounded-[40px] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-blue-600" />
                    Pindahkan Anggota
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Transfer ke tim lain</p>
                </div>
                <button onClick={() => { setMigratingMember(null); setMigrationTargetTeam(''); setMigrateWithData(null); }} className="p-2 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Member Info */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-100 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-200 border-3 border-white shadow-md">
                    {migratingMember.member.avatar_url ? (
                      <img src={migratingMember.member.avatar_url} alt={migratingMember.member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-black text-xl">
                        {migratingMember.member.name?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800">{migratingMember.member.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{migratingMember.member.position}</p>
                    <p className="text-[9px] font-bold text-blue-600 mt-0.5">{migratingMember.team.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 rounded-xl p-3 border border-blue-100">
                  <Trophy className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="font-bold">Total Skor: <span className="text-blue-700">
                    {(() => {
                      let totalScore = 0;
                      Object.values(migratingMember.member.weeklyAcquisitions || {}).forEach(weekAcq => {
                        totalScore += getMemberPoints(weekAcq);
                      });
                      return totalScore;
                    })()}
                  </span> poin</span>
                </div>
              </div>

              {/* Step 1: Select Target Team */}
              <div className="mb-6">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[8px] mr-1">1</span>
                  Pilih Tim Tujuan
                </label>
                <select
                  value={migrationTargetTeam}
                  onChange={(e) => setMigrationTargetTeam(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                >
                  <option value="">-- Pilih Tim --</option>
                  {teams.filter(t => t.id !== migratingMember.team.id).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {teams.filter(t => t.id !== migratingMember.team.id).length === 0 && (
                  <p className="text-xs text-slate-400 font-bold mt-2">Tidak ada tim lain untuk dipindahkan.</p>
                )}
              </div>

              {/* Step 2: Choose Data Migration Option */}
              {migrationTargetTeam && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[8px] mr-1">2</span>
                    Opsi Data Akuisisi
                  </label>
                  <div className="space-y-3">
                    <button
                      onClick={() => setMigrateWithData(true)}
                      className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${migrateWithData === true ? 'bg-green-50 border-green-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${migrateWithData === true ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                          {migrateWithData === true && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-slate-800 text-sm mb-1">Pindahkan Semua Data</div>
                          <div className="text-[10px] text-slate-500 font-bold leading-relaxed">
                            Seluruh akuisisi, poin, dan riwayat data akan ikut dipindahkan ke tim baru. Anggota tetap mempertahankan semua pencapaian.
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setMigrateWithData(false)}
                      className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${migrateWithData === false ? 'bg-orange-50 border-orange-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${migrateWithData === false ? 'border-orange-500 bg-orange-500' : 'border-slate-300'}`}>
                          {migrateWithData === false && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-slate-800 text-sm mb-1">Hanya Anggota</div>
                          <div className="text-[10px] text-slate-500 font-bold leading-relaxed">
                            Hanya memindahkan anggota ke tim baru. Semua data akuisisi dan poin akan dihapus (reset).
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {migrateWithData !== null && (
                <div className="flex gap-3 mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <button
                    onClick={() => { setMigratingMember(null); setMigrationTargetTeam(''); setMigrateWithData(null); }}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={migrateMember}
                    disabled={isMigrating}
                    className={`flex-1 py-4 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${isMigrating ? 'bg-slate-400 cursor-not-allowed' : migrateWithData ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200'}`}
                  >
                    {isMigrating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> MEMINDAHKAN...</>
                    ) : (
                      <><UserPlus className="w-5 h-5" /> {migrateWithData ? 'PINDAHKAN DENGAN DATA' : 'PINDAHKAN SAJA'}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Chart Section */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                   <h2 className="font-black text-xl flex items-center gap-3 text-slate-800 mb-1"><div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center"><LineChartIcon className="text-indigo-600 w-6 h-6"/></div>Tren Performa Tim</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-14">Akumulasi skor antar tim setiap minggu</p>
                 </div>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={() => setShowChartControls(!showChartControls)}
                     className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${showChartControls ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                   >
                     <Settings className="w-4 h-4" /> {showChartControls ? 'TUTUP' : 'CUSTOMIZE'}
                   </button>
                   <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100"><span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider italic">Real-time Analysis</span></div>
                 </div>
               </div>

               {/* Chart Controls Panel */}
               {showChartControls && (
                 <div className="mb-8 p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl border border-slate-200">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                     {/* Filter by Team */}
                     <div>
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Filter Tim</label>
                       <select
                         value={chartFilters.filterByTeam}
                         onChange={(e) => setChartFilters({ ...chartFilters, filterByTeam: e.target.value, filterByMember: 'all' })}
                         className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                       >
                         <option value="all">Semua Tim</option>
                         {teams.map(t => (
                           <option key={t.id} value={t.id}>{t.name}</option>
                         ))}
                       </select>
                     </div>

                     {/* Filter by Member */}
                     <div>
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Filter Anggota</label>
                       <select
                         value={chartFilters.filterByMember}
                         onChange={(e) => setChartFilters({ ...chartFilters, filterByMember: e.target.value })}
                         className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                         disabled={chartFilters.filterByTeam === 'all'}
                       >
                         <option value="all">Semua Anggota</option>
                         {teams.filter(t => chartFilters.filterByTeam === 'all' || t.id === chartFilters.filterByTeam)
                           .flatMap(t => t.members || [])
                           .map(m => (
                             <option key={m.id} value={m.id}>{m.name}</option>
                           ))}
                       </select>
                     </div>

                     {/* Metric Type */}
                     <div>
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Metrik</label>
                       <select
                         value={chartFilters.metric}
                         onChange={(e) => setChartFilters({ ...chartFilters, metric: e.target.value as 'score' | 'quantity' })}
                         className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                       >
                         <option value="score">Skor (Poin)</option>
                         <option value="quantity">Jumlah Akuisisi</option>
                       </select>
                     </div>

                     {/* Reset Filters */}
                     <div className="flex items-end">
                       <button
                         onClick={() => setChartFilters({
                           filterByTeam: 'all',
                           filterByMember: 'all',
                           metric: 'score',
                           selectedProducts: Object.keys(PRODUCT_POINTS)
                         })}
                         className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 h-[42px] rounded-xl font-black text-xs transition-all"
                       >
                         RESET FILTER
                       </button>
                     </div>
                   </div>

                   {/* Product Filter */}
                   <div className="mb-6">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">Filter Produk</label>
                     <div className="flex flex-wrap gap-2">
                       {Object.keys(PRODUCT_POINTS).map(p => {
                         const isSelected = chartFilters.selectedProducts.includes(p);
                         return (
                           <button
                             key={p}
                             onClick={() => {
                               const newProducts = isSelected
                                 ? chartFilters.selectedProducts.filter(prod => prod !== p)
                                 : [...chartFilters.selectedProducts, p];
                               if (newProducts.length > 0) {
                                 setChartFilters({ ...chartFilters, selectedProducts: newProducts });
                               }
                             }}
                             className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                           >
                             {p}
                           </button>
                         );
                       })}
                     </div>
                   </div>

                   {/* Team Colors */}
                   <div>
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3">Warna Tim</label>
                     <div className="flex flex-wrap gap-4">
                       {teams.map(t => (
                         <div key={t.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                           <span className="text-[9px] font-bold text-slate-600 truncate max-w-[120px]">{t.name}</span>
                           <input
                             type="color"
                             value={teamColors[t.id] || t.accent_color}
                             onChange={(e) => setTeamColors({ ...teamColors, [t.id]: e.target.value })}
                             className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                           />
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               )}

               <div className="h-[350px] w-full">
                 <RechartsContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} itemStyle={{ fontSize: '11px', fontWeight: 900 }} labelStyle={{ fontSize: '10px', fontWeight: 900, marginBottom: '8px', color: '#64748b' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingBottom: '20px' }} />
                      {teams.map((t, i) => (
                        <Line key={t.id} type="monotone" dataKey={t.name} stroke={teamColors[t.id] || t.accent_color || colors[i % colors.length]} strokeWidth={4} dot={{ r: 6, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={1500} />
                      ))}
                    </LineChart>
                 </RechartsContainer>
               </div>
            </div>

            {/* Tim Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamStats.map((team, idx) => {
                const cardStyle: React.CSSProperties = team.image_url
                  ? {
                      background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.95) 40%, #ffffff 100%)`,
                      position: 'relative'
                    }
                  : { background: 'white' };

                return (
                  <div
                    key={team.id}
                    className={`rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:translate-y-[-6px] hover:shadow-xl group`}
                    style={cardStyle}
                  >
                    {team.image_url && (
                      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <div
                          className="absolute inset-0 opacity-[0.15] blur-3xl scale-125"
                          style={{
                            backgroundImage: `url(${team.image_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        />
                      </div>
                    )}

                    <div className="h-32 w-full relative overflow-hidden z-10">
                      {team.image_url ? (
                        <img
                          src={team.image_url}
                          alt={team.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#003d79] to-[#005bb7] flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      {idx === 0 && team.totalPoints > 0 && <div className="absolute top-4 left-4 bg-[#FDB813] text-[#003d79] text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg animate-bounce z-20"><Trophy className="w-3 h-3"/> TIM TERBAIK</div>}
                      <div className="absolute bottom-4 left-6 right-6 z-20"><h3 className="font-black text-white text-lg leading-tight drop-shadow-md">{team.name}</h3></div>
                    </div>

                    <div className="p-6 relative z-10">
                      <div className="flex items-center justify-between mb-6 bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white/80 shadow-sm">
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Poin Minggu Ini</span><span className="text-3xl font-black tracking-tighter text-[#003d79]">{team.totalPoints}</span></div>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-900 border border-blue-100 font-black text-xs">W{activeWeek}</div>
                      </div>

                      <div className="mb-6 bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-inner">
                        <div className="flex items-center justify-between mb-4"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><TrendingUp className="w-3 h-3 text-blue-600"/> Dashboard Target</span><span className="text-[10px] font-bold text-blue-700 px-2 py-1 bg-blue-100 rounded-md">{Object.keys(WEEKLY_TARGETS).filter(k => (team.stats[k] || 0) >= WEEKLY_TARGETS[k]).length} Goal</span></div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.keys(WEEKLY_TARGETS).map(k => {
                            const current = team.stats[k] || 0;
                            const target = WEEKLY_TARGETS[k];
                            const isDone = current >= target;
                            return (
                              <div key={k} className={`p-2 rounded-xl border transition-all ${isDone ? 'bg-green-50/80 border-green-100' : current > 0 ? 'bg-white/80 border-blue-100' : 'bg-white/40 border-slate-100/50'}`}>
                                <div className="flex justify-between items-start mb-1"><span className={`text-[9px] font-black ${isDone ? 'text-green-700' : 'text-slate-400'}`}>{k}</span>{isDone && <Check className="w-2.5 h-2.5 text-green-600" />}</div>
                                <div className="flex items-end gap-1"><span className={`text-sm font-black leading-none ${isDone ? 'text-green-700' : current > 0 ? 'text-blue-900' : 'text-slate-300'}`}>{current}</span><span className="text-[8px] font-bold text-slate-300 mb-0.5">/ {target}</span></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[...(team.members || [])].sort((a,b) => getMemberPoints((b.weeklyAcquisitions || {})[activeWeek] || {}) - getMemberPoints((a.weeklyAcquisitions || {})[activeWeek] || {})).map(m => {
                          const pts = getMemberPoints((m.weeklyAcquisitions || {})[activeWeek] || {});
                          const tier = getTierByRank(m.id);
                          return (
                            <div
                              key={m.id}
                              onClick={() => setSelectedMember({ member: m, team })}
                              className={`flex justify-between items-center p-3 rounded-full border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] ${pts > 0 ? tier.bg + ' border-transparent shadow-sm' : 'bg-white/30 border-slate-100/30 opacity-60'}`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border-2 border-white shadow-sm">
                                  {m.avatar_url ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-black text-xs">{m.name?.[0]}</div>}
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-slate-800 text-sm leading-tight truncate">{m.name}</div>
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide truncate">{m.position}</div>
                                  <div className={`text-[9px] font-black uppercase flex items-center gap-1 mt-0.5 ${tier.color}`}>{tier.icon} {tier.label}</div>
                                </div>
                              </div>
                              <div className={`text-lg font-black pr-2 flex-shrink-0 ${tier.color}`}>{pts}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Global Progress */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="relative z-10 mb-10"><h2 className="font-black text-xl flex items-center gap-3 text-slate-800 mb-1"><div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center"><Target className="text-blue-600 w-6 h-6"/></div>Total Capaian Mingguan Seluruh Tim</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-14">Akumulasi seluruh tim periode Week {activeWeek}</p></div>
               <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-8 relative z-10">
                  {Object.keys(WEEKLY_TARGETS).map(key => {
                    const totalAchieved = teamStats.reduce((acc, t) => acc + (t.stats[key] || 0), 0);
                    const dynamicTarget = WEEKLY_TARGETS[key] * (teams.length || 1);
                    const progress = Math.min((totalAchieved/dynamicTarget)*100, 100);
                    return (
                      <div key={key} className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-4 border-slate-50 flex flex-col items-center justify-center relative mb-3 bg-white shadow-sm overflow-hidden">
                           <div className={`absolute bottom-0 w-full transition-all duration-1000 ${totalAchieved >= dynamicTarget ? 'bg-green-100' : 'bg-blue-50'}`} style={{height: `${progress}%`}}></div>
                           <span className={`relative text-[10px] font-black ${totalAchieved >= dynamicTarget ? 'text-green-600' : 'text-blue-900'}`}>{totalAchieved}</span>
                           <div className="relative h-px w-6 bg-slate-200 my-1"></div>
                           <span className="relative text-[9px] font-bold text-slate-400">{dynamicTarget}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{key}</span>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {viewMode === 'manage' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Control Center */}
            <div className="bg-[#003d79] p-10 rounded-[40px] text-white shadow-2xl flex flex-col items-center gap-8 border-b-[12px] border-[#FDB813] relative overflow-hidden">
              <div className="flex-1 text-center w-full relative z-10">
                <h2 className="text-3xl font-black mb-2 tracking-tight">Management Center</h2>
                <p className="text-blue-200 text-sm font-medium">Input data akuisisi untuk <span className="text-[#FDB813] font-black underline underline-offset-4">Minggu ke-{activeWeek}</span></p>
              </div>
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-black text-blue-300 ml-4 uppercase tracking-widest">Nama Tim Baru</label><input type="text" value={newTeam.name} onChange={(e) => setNewTeam({...newTeam, name: e.target.value})} placeholder="Contoh: Tim Rajawali" className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 text-sm outline-none focus:bg-white/20 focus:ring-2 focus:ring-[#FDB813]" /></div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-300 ml-4 uppercase tracking-widest block mb-2">Sampul Tim</label>
                  <ImageUploader
                    value={newTeam.image_url}
                    onChange={(url) => setNewTeam({...newTeam, image_url: url || ''})}
                    label="Team Cover"
                    folder="teams"
                    aspectRatio="16/10"
                  />
                </div>
                <div className="md:col-span-3 flex items-end"><button onClick={addTeam} className="w-full bg-[#FDB813] text-blue-900 h-[54px] rounded-full font-black text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> DAFTAR TIM</button></div>
              </div>
              {/* Save Button Bar */}
              {hasPendingChanges && (
                <div className="w-full flex items-center justify-between bg-yellow-500/20 border border-yellow-400/30 rounded-3xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center animate-pulse">
                      <Edit2 className="w-5 h-5 text-blue-900" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-yellow-100">Ada perubahan yang belum disimpan</p>
                      <p className="text-xs text-yellow-200/70">{Object.keys(pendingAcquisitions).length} anggota tim dengan data baru</p>
                    </div>
                  </div>
                  <button
                    onClick={saveAllAcquisitions}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-8 py-4 rounded-full font-black text-sm shadow-lg transition-all ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400 hover:scale-105 text-white shadow-green-900/20'}`}
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? 'SAVING...' : 'SAVE'}
                  </button>
                </div>
              )}
            </div>

            {/* List Team Manajemen */}
            <div className="grid grid-cols-1 gap-12">
              {teams.map(team => (
                <div key={team.id} className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-10 rounded-xl bg-blue-100 border border-blue-200 overflow-hidden flex-shrink-0 shadow-inner">
                        {team.image_url ? <img src={team.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-blue-300"/></div>}
                      </div>
                      {editingTeam?.id === team.id ? (
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full max-w-2xl bg-white p-3 rounded-2xl shadow-md border border-blue-100">
                          <input className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-black outline-none" value={editingTeam.name} onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})} placeholder="Nama tim..."/>
                          <div className="flex-1">
                            <ImageUploader
                              value={editingTeam.image_url}
                              onChange={(url) => setEditingTeam({...editingTeam, image_url: url})}
                              label="Team Cover"
                              folder="teams"
                              entityId={editingTeam.id}
                              aspectRatio="16/10"
                            />
                          </div>
                          <div className="flex gap-2"><button onClick={updateTeam} className="p-3 bg-green-500 text-white rounded-xl"><Check className="w-5 h-5"/></button><button onClick={() => setEditingTeam(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl"><X className="w-5 h-5"/></button></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3"><h3 className="font-black text-[#003d79] text-xl uppercase tracking-tight">{team.name}</h3><button onClick={() => setEditingTeam({id: team.id, name: team.name, image_url: team.image_url, accent_color: team.accent_color})} className="p-1.5 text-slate-300 hover:text-blue-600 transition-all"><Edit2 className="w-4 h-4"/></button></div>
                      )}
                    </div>
                    <button onClick={() => deleteTeam(team.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5"/></button>
                  </div>

                  <div className="p-10 space-y-16">
                    <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Tambah Anggota Tim</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <input type="text" value={tempMember.name} onChange={(e) => setTempMember({...tempMember, name: e.target.value})} placeholder="Nama Lengkap" className="w-full bg-white border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                        <div>
                          <input type="text" value={tempMember.position} onChange={(e) => setTempMember({...tempMember, position: e.target.value})} placeholder="Jabatan" className="w-full bg-white border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                        <div>
                          <ImageUploader
                            value={tempMember.avatar_url}
                            onChange={(url) => setTempMember({...tempMember, avatar_url: url || ''})}
                            label="Member Avatar"
                            folder="members"
                            aspectRatio="1/1"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <button onClick={() => addMemberToTeam(team.id)} className="w-full bg-[#003d79] text-white h-[48px] rounded-full font-black text-xs">TAMBAH</button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-14">
                      {(team.members || []).map(member => (
                        <div key={member.id} className="relative group border-b border-slate-50 pb-10 last:border-0 last:pb-0">
                          <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
                            <div className="flex items-center gap-5 flex-1 min-w-0">
                              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#003d79] text-[#FDB813] flex items-center justify-center font-black text-lg shadow-lg border-4 border-white flex-shrink-0">
                                {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src="https://via.placeholder.com/150"}/> : member.name?.[0]}
                              </div>
                              <div className="truncate flex-1">
                                {editingMember?.memberId === member.id ? (
                                  <div className="flex flex-col gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 w-full max-w-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">Nama</label><input className="text-sm font-black p-2 rounded-lg border border-blue-200 outline-none" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} /></div>
                                      <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">Jabatan</label><input className="text-sm font-black p-2 rounded-lg border border-blue-200 outline-none" value={editingMember.position} onChange={(e) => setEditingMember({...editingMember, position: e.target.value})} /></div>
                                    </div>
                                    <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">Avatar</label>
                                      <ImageUploader
                                        value={editingMember.avatar_url}
                                        onChange={(url) => setEditingMember({...editingMember, avatar_url: url})}
                                        label="Member Avatar"
                                        folder="members"
                                        entityId={editingMember.memberId}
                                        aspectRatio="1/1"
                                      />
                                    </div>
                                    <div className="flex gap-2"><button onClick={updateMember} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2"><Check className="w-3 h-3"/> Simpan</button><button onClick={() => setEditingMember(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase">Batal</button></div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-black text-slate-800 text-lg leading-none truncate">{member.name}</h5>
                                      <button onClick={() => setEditingMember({teamId: team.id, memberId: member.id, name: member.name, position: member.position, avatar_url: member.avatar_url})} className="p-1 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                                      <button onClick={() => deleteMember(team.id, member.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                      <button 
                                        onClick={() => setMigratingMember({ member, team })} 
                                        className="p-1 text-slate-300 hover:text-purple-500 transition-colors"
                                        title="Pindahkan ke tim lain"
                                      >
                                        <UserPlus className="w-3.5 h-3.5"/>
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">{member.position}</p>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="bg-yellow-50 px-6 py-3 rounded-2xl border border-yellow-100 flex-shrink-0 self-start text-center shadow-sm">
                               <p className="text-[9px] font-black text-yellow-700 uppercase tracking-widest mb-1">Poin Minggu {activeWeek}</p>
                               <p className="text-2xl font-black text-yellow-800 leading-none">{getMemberPoints((member.weeklyAcquisitions || {})[activeWeek])}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 ml-0 md:ml-20">
                            {Object.keys(PRODUCT_POINTS).map(pKey => {
                              const savedValue = ((member.weeklyAcquisitions || {})[activeWeek] || {})[pKey] || 0;
                              const pendingKey = `${member.id}|${activeWeek}`;
                              const pendingValue = pendingAcquisitions[pendingKey]?.[pKey];
                              const hasPending = pendingValue !== undefined;
                              const displayValue = hasPending ? pendingValue : savedValue;
                              const isChanged = hasPending && pendingValue !== savedValue;

                              return (
                                <div key={pKey} className="group/input">
                                  <label className={`text-[9px] font-black uppercase block tracking-tighter text-center mb-1 ${isChanged ? 'text-yellow-600' : 'text-slate-300'}`}>{pKey}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={displayValue}
                                    onChange={(e) => updateAcquisition(member.id, pKey, e.target.value)}
                                    className={`w-full bg-slate-50 border rounded-2xl p-3 text-sm font-black text-center outline-none transition-all shadow-sm ${isChanged ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200' : 'border-slate-200 focus:ring-4 focus:ring-[#FDB813]/20 focus:bg-white focus:border-[#FDB813]'}`}
                                  />
                                  {isChanged && (
                                    <div className="flex justify-center mt-1">
                                      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-8 py-4 md:hidden flex justify-around items-center z-50 rounded-t-[40px] shadow-2xl">
         <button onClick={() => setViewMode('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${viewMode === 'dashboard' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><BarChart3 className="w-6 h-6"/><span className="text-[8px] font-black uppercase">Dashboard</span></button>
         <div className="w-12 h-12 bg-[#003d79] rounded-2xl flex items-center justify-center text-[#FDB813] font-black shadow-lg">W{activeWeek}</div>
         <button onClick={() => setViewMode('manage')} className={`flex flex-col items-center gap-1 transition-all ${viewMode === 'manage' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Settings className="w-6 h-6"/><span className="text-[8px] font-black uppercase">Manage</span></button>
      </div>
    </div>
  );
}
