'use client'
import {
  BarChart3, Calendar, Check, ChevronDown, ChevronUp, Clock, Database, Download, Edit2,
  FileSpreadsheet, FileText, ImageIcon, LineChart as LineChartIcon, Loader2, Medal,
  Plus, Save, Settings, Star, Target, Trash2, TrendingUp, Trophy, UserPlus, X, Activity
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer as RechartsContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ImageUploader from '@/components/ImageUploader';
import { deleteImage } from '@/lib/storage';
import AttendanceManager from '@/components/AttendanceManager';
import AttendanceSummary from '@/components/AttendanceSummary';
import ProductManager from '@/components/ProductManager';
import GridLoader from '@/components/GridLoader';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/Accordion';
import AutoSaveIndicator from '@/components/AutoSaveIndicator';
import { useAutoSave } from '@/hooks/useAutoSave';
import DashboardAnalytics from '@/components/DashboardAnalytics';
import DataBackup from '@/components/DataBackup';
import InputAcquisition from '@/components/InputAcquisition';

// --- KONFIGURASI POIN & TARGET ---
type TieredProduct = { name: string; unit: string; type: 'tiered'; tiers: { limit: number; p: number }[] };
type SimpleProduct = { name: string; unit: string; p: number };
type ProductConfig = TieredProduct | SimpleProduct;

const PRODUCT_POINTS: Record<string, ProductConfig> = {
  MTB: { name: 'Mandiri Tabungan Bisnis', unit: 'Rekening', type: 'tiered' as const, tiers: [{ limit: 10, p: 3 }, { limit: 30, p: 6 }, { limit: 999, p: 9 }] },
  GIRO: { name: 'Tabungan Giro', unit: 'Rekening', type: 'tiered' as const, tiers: [{ limit: 5, p: 3 }, { limit: 999, p: 6 }] },
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

// WEEKLY_TARGETS is now fetched dynamically from the products table
// const WEEKLY_TARGETS: Record<string, number> = {...};

const MandiriLogo = () => (
  <img
    src="Bank_Mandiri_logo.png"
    alt="mandiri"
    className="h-6 sm:h-7 w-auto object-contain"
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

export default function App() {
  const [viewMode, setViewMode] = useState('dashboard');
  const [activeWeek, setActiveWeek] = useState(1);
  const [isExcelReady, setIsExcelReady] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState([1]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [exportMode, setExportMode] = useState<'weeks' | 'month' | 'all'>('weeks');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // Data state
  const [teams, setTeams] = useState<Team[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form states
  const [newTeam, setNewTeam] = useState({ name: '', image_url: '' });
  const [tempMember, setTempMember] = useState({ name: '', position: '', avatar_url: '' });
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMember, setEditingMember] = useState<{ teamId: string, memberId: string, name: string, position: string, avatar_url: string | null } | null>(null);

  // Chart customization state
  const [showChartControls, setShowChartControls] = useState(false);
  const [chartFilters, setChartFilters] = useState({
    filterByTeam: 'all' as string,
    filterByMember: 'all' as string,
    metric: 'score' as 'score' | 'quantity',
    selectedProducts: [] as string[]
  });
  const [teamColors, setTeamColors] = useState<Record<string, string>>({});

  // Member detail modal state
  const [selectedMember, setSelectedMember] = useState<{ member: Member, team: Team } | null>(null);

  // Migration modal state
  const [migratingMember, setMigratingMember] = useState<{ member: Member, team: Team } | null>(null);
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

  // Fetch data from Supabase with optional month/year filter
  const fetchData = useCallback(async (month?: string, year?: string) => {
    try {
      setIsLoading(true);

      // Build query params for acquisitions with date filter
      const acquisitionsParams = new URLSearchParams();
      if (month && year) {
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        const monthStr = String(monthNum).padStart(2, '0');
        const startDate = `${yearNum}-${monthStr}-01`;
        // Calculate last day of month correctly
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        const endDate = `${yearNum}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
        acquisitionsParams.append('startDate', startDate);
        acquisitionsParams.append('endDate', endDate);
      }

      const [teamsRes, acquisitionsRes, productsRes] = await Promise.all([
        fetch('/api/teams'),
        fetch(`/api/acquisitions?${acquisitionsParams.toString()}`),
        fetch('/api/products?activeOnly=true')
      ]);

      if (!teamsRes.ok || !acquisitionsRes.ok || !productsRes.ok) throw new Error('Failed to fetch data');

      const teamsData = await teamsRes.json();
      const acquisitionsData = await acquisitionsRes.json();
      const productsData = await productsRes.json();

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
      setProducts(productsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, fetchData]);

  const getMemberPoints = useCallback((acquisitions: Record<string, number> | undefined) => {
    let total = 0;
    if (!acquisitions || products.length === 0) return 0;

    Object.keys(acquisitions).forEach(key => {
      const qty = acquisitions[key];
      const product = products.find(p => p.product_key === key);
      if (!product || !product.is_active) return;

      if (product.is_tiered && product.tier_config) {
        const tier = product.tier_config.find(t => qty <= t.limit) || product.tier_config[product.tier_config.length - 1];
        total += qty * tier.points;
      } else {
        total += qty * (product.flat_points || 0);
      }
    });
    return total;
  }, [products]);

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
              const product = products.find(p => p.product_key === productKey);
              if (!product) return;
              if (product.is_tiered && product.tier_config) {
                const tier = product.tier_config.find(tier => qty <= tier.limit) || product.tier_config[product.tier_config.length - 1];
                metricValue += qty * tier.points;
              } else {
                metricValue += qty * (product.flat_points || 0);
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

  // --- FITUR EXPORT EXCEL ---
  const handleExportAction = () => {
    if (!(window as typeof window & { XLSX?: any }).XLSX) return;

    const activeProducts = products.filter(p => p.is_active);
    let finalData: Record<string, string | number>[] = [];
    let fileName = '';

    if (exportMode === 'weeks') {
      if (selectedWeeks.length === 0) {
        alert("Pilih minimal satu minggu untuk diekspor.");
        return;
      }
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
            activeProducts.forEach(p => {
              row[p.product_key] = acq[p.product_key] || 0;
            });
            finalData.push(row);
          });
        });
      });
      fileName = `Laporan_Minggu_${selectedWeeks.join('-')}_${selectedYear}-${selectedMonth}.xlsx`;
    } else if (exportMode === 'month') {
      const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      teams.forEach(t => {
        (t.members || []).forEach(m => {
          let totalAcq: Record<string, number> = {};
          [1, 2, 3, 4].forEach(weekNum => {
            const weekAcq = (m.weeklyAcquisitions || {})[weekNum] || {};
            Object.entries(weekAcq).forEach(([key, value]) => {
              totalAcq[key] = (totalAcq[key] || 0) + value;
            });
          });
          const row: Record<string, string | number> = {
            "Bulan": monthName,
            "Nama Sales": m.name,
            "Tim": t.name,
            "Jabatan": m.position,
            "Total Poin": getMemberPoints(totalAcq)
          };
          activeProducts.forEach(p => {
            row[p.product_key] = totalAcq[p.product_key] || 0;
          });
          finalData.push(row);
        });
      });
      fileName = `Laporan_Bulan_${selectedYear}-${selectedMonth}.xlsx`;
    } else if (exportMode === 'all') {
      teams.forEach(t => {
        (t.members || []).forEach(m => {
          let totalAcq: Record<string, number> = {};
          [1, 2, 3, 4].forEach(weekNum => {
            const weekAcq = (m.weeklyAcquisitions || {})[weekNum] || {};
            Object.entries(weekAcq).forEach(([key, value]) => {
              totalAcq[key] = (totalAcq[key] || 0) + value;
            });
          });
          const row: Record<string, string | number> = {
            "Export Mode": "All Data",
            "Nama Sales": m.name,
            "Tim": t.name,
            "Jabatan": m.position,
            "Total Poin": getMemberPoints(totalAcq)
          };
          activeProducts.forEach(p => {
            row[p.product_key] = totalAcq[p.product_key] || 0;
          });
          finalData.push(row);
        });
      });
      fileName = `Laporan_Semua_Data_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (exportMode === 'custom' && exportStartDate && exportEndDate) {
      fileName = `Laporan_Custom_${exportStartDate}_to_${exportEndDate}.xlsx`;
    }

    if (finalData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const worksheet = (window as any).XLSX.utils.json_to_sheet(finalData);
    const workbook = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Performa");
    (window as any).XLSX.writeFile(workbook, fileName);
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
          <GridLoader pattern="frame" size="lg" color="#FDB813" mode="stagger" />
          <p className="text-slate-500 font-bold mt-4">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-[#003d79] text-white sticky top-0 z-50 shadow-lg border-b-4 border-[#FDB813]">
        <div className="max-w-[95%] lg:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <MandiriLogo />
            <div className="h-6 sm:h-8 w-px bg-white/20 mx-1 hidden sm:block"></div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">Acquisition Monitor</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden md:flex bg-blue-900/40 p-0.5 sm:p-1 rounded-lg sm:rounded-xl gap-0.5 sm:gap-1 border border-white/5 overflow-x-auto max-w-[50vw]">
              <button onClick={() => setViewMode('dashboard')} className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'dashboard' ? 'bg-white text-blue-900 shadow-md' : 'text-white/70 hover:text-white'}`}><BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Dashboard</button>
              <button onClick={() => setViewMode('analytics')} className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'analytics' ? 'bg-white text-blue-900 shadow-md' : 'text-white/70 hover:text-white'}`}><Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Analytics</button>
              <button onClick={() => setViewMode('absensi')} className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'absensi' ? 'bg-white text-blue-900 shadow-md' : 'text-white/70 hover:text-white'}`}><FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Absensi</button>
              <button onClick={() => setViewMode('input')} className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'input' ? 'bg-white text-blue-900 shadow-md' : 'text-white/70 hover:text-white'}`}><Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Input</button>
              <button onClick={() => setViewMode('backup')} className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'backup' ? 'bg-white text-blue-900 shadow-md' : 'text-white/70 hover:text-white'}`}><Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Backup</button>
              <button onClick={() => setViewMode('manage')} className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${viewMode === 'manage' ? 'bg-white text-blue-900 shadow-md' : 'text-white/70 hover:text-white'}`}><Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Manage</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-[95%] lg:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              disabled={!isExcelReady}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black shadow-lg transition-all active:scale-95 ${isExcelReady ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">EXPORT EXCEL</span><span className="xs:hidden">EXPORT</span>
            </button>
          </div>
        </div>

        {/* --- EXPORT MODAL --- */}
        {showExportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExportModal(false)}></div>
            <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-xl text-slate-800">Opsi Ekspor Excel</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Pilih periode data</p>
                </div>
                <button onClick={() => setShowExportModal(false)} className="p-2 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>

              {/* Export Mode Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setExportMode('weeks')}
                  className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${exportMode === 'weeks' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >
                  <Calendar className="w-5 h-5 mx-auto mb-2" />
                  Per Minggu
                </button>
                <button
                  onClick={() => setExportMode('month')}
                  className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${exportMode === 'month' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-2" />
                  Per Bulan
                </button>
                <button
                  onClick={() => setExportMode('all')}
                  className={`p-4 rounded-2xl border-2 font-black text-sm transition-all ${exportMode === 'all' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                >
                  <Database className="w-5 h-5 mx-auto mb-2" />
                  Semua Data
                </button>
              </div>

              {/* Weeks Selection */}
              {exportMode === 'weeks' && (
                <div className="space-y-3 mb-8">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Pilih Minggu</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(w => (
                      <button
                        key={w}
                        onClick={() => toggleWeekSelection(w)}
                        className={`py-4 rounded-3xl border-2 font-black text-sm transition-all flex items-center justify-center gap-3 ${selectedWeeks.includes(w) ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-white border-slate-100 text-slate-300'}`}
                      >
                        {selectedWeeks.includes(w) ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-slate-200" />}
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
              )}

              {/* Month Selection */}
              {exportMode === 'month' && (
                <div className="space-y-4 mb-8">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Pilih Bulan & Tahun</p>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* All Data Info */}
              {exportMode === 'all' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
                  <div className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Ekspor Semua Data</p>
                      <p className="text-xs text-blue-600 mt-1">Semua data akuisisi yang ada di sistem akan diekspor ke dalam satu file Excel.</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleExportAction}
                className="w-full bg-[#003d79] text-white py-5 rounded-[24px] font-black tracking-tight shadow-xl shadow-blue-100 hover:bg-blue-800 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Download className="w-5 h-5" /> UNDUH LAPORAN .XLSX
              </button>
            </div>
          </div>
        )}

        {/* --- MEMBER DETAIL MODAL --- */}
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto" style={{ scrollBehavior: 'auto' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedMember(null)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 my-auto max-h-[90vh] overflow-y-auto scrollbar-hide">
              {/* Cover Image with Gradient Fade */}
              <div className="relative h-48 w-full overflow-hidden rounded-t-[40px]">
                {selectedMember.member.avatar_url ? (
                  <img
                    src={selectedMember.member.avatar_url}
                    alt={selectedMember.member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                    <div className="text-white font-black text-6xl opacity-30">
                      {selectedMember.member.name?.[0]}
                    </div>
                  </div>
                )}
                {/* Gradient Fade Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white"></div>
                {/* Close Button */}
                <button
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-sm rounded-2xl text-slate-600 hover:text-slate-800 hover:bg-white transition-all shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Section */}
              <div className="p-8">
                {/* Member Info Header */}
                <div className="text-center mb-8">
                  <h3 className="font-black text-2xl text-slate-800 mb-1">{selectedMember.member.name}</h3>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{selectedMember.member.position}</p>
                  <p className="text-xs font-bold text-blue-600 mt-1">{selectedMember.team.name}</p>
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
                                  const productConfig = products.find(p => p.product_key === product);
                                  let pointsEarned = 0;
                                  if (productConfig) {
                                    if (productConfig.is_tiered && productConfig.tier_config) {
                                      const tier = productConfig.tier_config.find(t => qty <= t.limit) || productConfig.tier_config[productConfig.tier_config.length - 1];
                                      pointsEarned = qty * tier.points;
                                    } else {
                                      pointsEarned = qty * (productConfig.flat_points || 0);
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
                      <><GridLoader pattern="edge-cw" size="sm" color="#FDB813" mode="stagger" /> MEMINDAHKAN...</>
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
          <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Floating Navigation Bar - Sticky */}
            <div className="sticky top-[60px] sm:top-[68px] z-30 bg-slate-50/9 backdrop-blur-[8px] pb-4 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pt-4">
              <div className="bg-white rounded-[20px] sm:rounded-[30px] md:rounded-[40px] p-4 sm:p-6 md:p-8 border border-slate-200 shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
                  {/* Month/Year Navigation */}
                  <div className="flex items-center gap-2 sm:gap-4 w-full lg:w-auto">
                    <button
                      onClick={() => {
                        const newMonth = parseInt(selectedMonth) - 1;
                        if (newMonth < 1) {
                          setSelectedMonth('12');
                          setSelectedYear(String(parseInt(selectedYear) - 1));
                        } else {
                          setSelectedMonth(String(newMonth));
                        }
                      }}
                      className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all flex-shrink-0"
                    >
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 rotate-270" style={{ transform: 'rotate(0deg)' }} />
                    </button>
                    <div className="text-center flex-1 lg:flex-none">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent text-base sm:text-lg font-black text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm font-bold text-slate-500 outline-none cursor-pointer ml-2"
                      >
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        const newMonth = parseInt(selectedMonth) + 1;
                        if (newMonth > 12) {
                          setSelectedMonth('1');
                          setSelectedYear(String(parseInt(selectedYear) + 1));
                        } else {
                          setSelectedMonth(String(newMonth));
                        }
                      }}
                      className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all flex-shrink-0"
                    >
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" style={{ transform: 'rotate(90deg)' }} />
                    </button>
                    <div className="hidden lg:block text-sm font-bold text-slate-500 ml-2">
                      {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden lg:block w-px h-12 bg-slate-200"></div>

                  {/* Week Selector */}
                  <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end">
                    <div className="hidden md:flex bg-blue-100 rounded-full p-0.5 sm:p-1 border border-blue-200">
                      {[1, 2, 3, 4].map(w => (
                        <button key={w} onClick={() => setActiveWeek(w)} className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black transition-all ${activeWeek === w ? 'bg-[#003d79] text-white shadow-md' : 'text-blue-700 hover:bg-blue-200'}`}>Week {w}</button>
                      ))}
                    </div>
                    <div className="md:hidden flex bg-blue-100 p-0.5 sm:p-1 rounded-xl border border-blue-200 overflow-x-auto">
                      {[1, 2, 3, 4].map(w => (
                        <button key={w} onClick={() => setActiveWeek(w)} className={`flex-shrink-0 px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all ${activeWeek === w ? 'bg-[#003d79] text-white shadow-md' : 'text-blue-700'}`}>W{w}</button>
                      ))}
                    </div>
                    <div className="lg:hidden text-xs sm:text-sm font-bold text-slate-500">
                      {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
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
                      {idx === 0 && team.totalPoints > 0 && <div className="absolute top-4 left-4 bg-[#FDB813] text-[#003d79] text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg animate-bounce z-20"><Trophy className="w-3 h-3" /> TIM TERBAIK</div>}
                      <div className="absolute bottom-4 left-6 right-6 z-20"><h3 className="font-black text-white text-lg leading-tight drop-shadow-md">{team.name}</h3></div>
                    </div>

                    <div className="p-6 relative z-10">
                      <div className="flex items-center justify-between mb-6 bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white/80 shadow-sm">
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Poin Minggu Ini</span><span className="text-3xl font-black tracking-tighter text-[#003d79]">{team.totalPoints}</span></div>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-900 border border-blue-100 font-black text-xs">W{activeWeek}</div>
                      </div>

                      <div className="mb-6 bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-blue-600" /> Dashboard Target
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 px-2 py-1 bg-blue-100 rounded-md">
                            {products.filter(p => p.is_active && (team.stats[p.product_key] || 0) >= p.weekly_target).length} Goal
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {products.filter(p => p.is_active).map(p => {
                            const current = team.stats[p.product_key] || 0;
                            const target = p.weekly_target;
                            const isDone = current >= target;
                            return (
                              <div key={p.product_key} className={`p-2 rounded-xl border transition-all ${isDone ? 'bg-green-50/80 border-green-100' : current > 0 ? 'bg-white/80 border-blue-100' : 'bg-white/40 border-slate-100/50'}`}>
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`text-[9px] font-black ${isDone ? 'text-green-700' : 'text-slate-400'}`}>{p.product_key}</span>
                                  {isDone && <Check className="w-2.5 h-2.5 text-green-600" />}
                                </div>
                                <div className="flex items-end gap-1">
                                  <span className={`text-sm font-black leading-none ${isDone ? 'text-green-700' : current > 0 ? 'text-blue-900' : 'text-slate-300'}`}>{current}</span>
                                  <span className="text-[8px] font-bold text-slate-300 mb-0.5">/ {target}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[...(team.members || [])].sort((a, b) => getMemberPoints((b.weeklyAcquisitions || {})[activeWeek] || {}) - getMemberPoints((a.weeklyAcquisitions || {})[activeWeek] || {})).map(m => {
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
              <div className="relative z-10 mb-10">
                <h2 className="font-black text-xl flex items-center gap-3 text-slate-800 mb-1">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <Target className="text-blue-600 w-6 h-6" />
                  </div>
                  Total Capaian Mingguan Seluruh Tim
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-14">Akumulasi seluruh tim periode Week {activeWeek}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-8 relative z-10">
                {products.filter(p => p.is_active).map(p => {
                  const totalAchieved = teamStats.reduce((acc, t) => acc + (t.stats[p.product_key] || 0), 0);
                  const dynamicTarget = p.weekly_target * (teams.length || 1);
                  const progress = Math.min((totalAchieved / dynamicTarget) * 100, 100);
                  return (
                    <div key={p.product_key} className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-50 flex flex-col items-center justify-center relative mb-3 bg-white shadow-sm overflow-hidden">
                        <div className={`absolute bottom-0 w-full transition-all duration-1000 ${totalAchieved >= dynamicTarget ? 'bg-green-100' : 'bg-blue-50'}`} style={{ height: `${progress}%` }}></div>
                        <span className={`relative text-[10px] font-black ${totalAchieved >= dynamicTarget ? 'text-green-600' : 'text-blue-900'}`}>{totalAchieved}</span>
                        <div className="relative h-px w-6 bg-slate-200 my-1"></div>
                        <span className="relative text-[9px] font-bold text-slate-400">{dynamicTarget}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{p.product_key}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'manage' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Product Management */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm">
              <ProductManager products={products} onSaveProducts={setProducts} />
            </div>

            {/* Control Center - Team Management Only */}
            <div className="bg-[#003d79] p-10 rounded-[40px] text-white shadow-2xl flex flex-col items-center gap-8 border-b-[12px] border-[#FDB813] relative overflow-hidden">
              <div className="flex-1 text-center w-full relative z-10">
                <h2 className="text-3xl font-black mb-2 tracking-tight">Management Center</h2>
                <p className="text-blue-200 text-sm font-medium">Kelola tim dan anggota <span className="text-[#FDB813] font-black underline underline-offset-4">di sini</span></p>
              </div>
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-black text-blue-300 ml-4 uppercase tracking-widest">Nama Tim Baru</label><input type="text" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} placeholder="Contoh: Tim Rajawali" className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 text-sm outline-none focus:bg-white/20 focus:ring-2 focus:ring-[#FDB813]" /></div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-blue-300 ml-4 uppercase tracking-widest block mb-2">Sampul Tim</label>
                  <ImageUploader
                    value={newTeam.image_url}
                    onChange={(url) => setNewTeam({ ...newTeam, image_url: url || '' })}
                    label="Team Cover"
                    folder="teams"
                    aspectRatio="16/10"
                  />
                </div>
                <div className="md:col-span-3 flex items-end"><button onClick={addTeam} className="w-full bg-[#FDB813] text-blue-900 h-[54px] rounded-full font-black text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> DAFTAR TIM</button></div>
              </div>
            </div>

            {/* List Team Manajemen */}
            <div className="grid grid-cols-1 gap-12">
              {teams.map(team => (
                <div key={team.id} className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-10 rounded-xl bg-blue-100 border border-blue-200 overflow-hidden flex-shrink-0 shadow-inner">
                        {team.image_url ? <img src={team.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-blue-300" /></div>}
                      </div>
                      {editingTeam?.id === team.id ? (
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full max-w-2xl bg-white p-3 rounded-2xl shadow-md border border-blue-100">
                          <input className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-black outline-none" value={editingTeam.name} onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })} placeholder="Nama tim..." />
                          <div className="flex-1">
                            <ImageUploader
                              value={editingTeam.image_url}
                              onChange={(url) => setEditingTeam({ ...editingTeam, image_url: url })}
                              label="Team Cover"
                              folder="teams"
                              entityId={editingTeam.id}
                              aspectRatio="16/10"
                            />
                          </div>
                          <div className="flex gap-2"><button onClick={updateTeam} className="p-3 bg-green-500 text-white rounded-xl"><Check className="w-5 h-5" /></button><button onClick={() => setEditingTeam(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl"><X className="w-5 h-5" /></button></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3"><h3 className="font-black text-[#003d79] text-xl uppercase tracking-tight">{team.name}</h3><button onClick={() => setEditingTeam({ id: team.id, name: team.name, image_url: team.image_url, accent_color: team.accent_color })} className="p-1.5 text-slate-300 hover:text-blue-600 transition-all"><Edit2 className="w-4 h-4" /></button></div>
                      )}
                    </div>
                    <button onClick={() => deleteTeam(team.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                  </div>

                  <div className="p-10 space-y-16">
                    <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Tambah Anggota Tim</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <input type="text" value={tempMember.name} onChange={(e) => setTempMember({ ...tempMember, name: e.target.value })} placeholder="Nama Lengkap" className="w-full bg-white border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                        <div>
                          <input type="text" value={tempMember.position} onChange={(e) => setTempMember({ ...tempMember, position: e.target.value })} placeholder="Jabatan" className="w-full bg-white border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                        <div>
                          <ImageUploader
                            value={tempMember.avatar_url}
                            onChange={(url) => setTempMember({ ...tempMember, avatar_url: url || '' })}
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
                                {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150"} /> : member.name?.[0]}
                              </div>
                              <div className="truncate flex-1">
                                {editingMember?.memberId === member.id ? (
                                  <div className="flex flex-col gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 w-full max-w-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">Nama</label><input className="text-sm font-black p-2 rounded-lg border border-blue-200 outline-none" value={editingMember.name} onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })} /></div>
                                      <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">Jabatan</label><input className="text-sm font-black p-2 rounded-lg border border-blue-200 outline-none" value={editingMember.position} onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })} /></div>
                                    </div>
                                    <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">Avatar</label>
                                      <ImageUploader
                                        value={editingMember.avatar_url}
                                        onChange={(url) => setEditingMember({ ...editingMember, avatar_url: url })}
                                        label="Member Avatar"
                                        folder="members"
                                        entityId={editingMember.memberId}
                                        aspectRatio="1/1"
                                      />
                                    </div>
                                    <div className="flex gap-2"><button onClick={updateMember} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2"><Check className="w-3 h-3" /> Simpan</button><button onClick={() => setEditingMember(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase">Batal</button></div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-black text-slate-800 text-lg leading-none truncate">{member.name}</h5>
                                      <button onClick={() => setEditingMember({ teamId: team.id, memberId: member.id, name: member.name, position: member.position, avatar_url: member.avatar_url })} className="p-1 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => deleteMember(team.id, member.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                      <button
                                        onClick={() => setMigratingMember({ member, team })}
                                        className="p-1 text-slate-300 hover:text-purple-500 transition-colors"
                                        title="Pindahkan ke tim lain"
                                      >
                                        <UserPlus className="w-3.5 h-3.5" />
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
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <DashboardAnalytics />
          </div>
        )}

        {viewMode === 'backup' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <DataBackup />
          </div>
        )}

        {viewMode === 'absensi' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm">
              <AttendanceManager members={teams.flatMap(t => t.members || [])} />
            </div>
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm">
              <AttendanceSummary members={teams.flatMap(t => t.members || [])} />
            </div>
          </div>
        )}

        {viewMode === 'input' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm">
              <InputAcquisition
                products={products.filter(p => p.is_active)}
                teams={teams}
                members={teams.flatMap(t => t.members || [])}
              />
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 sm:px-4 py-2 sm:py-3 md:hidden flex justify-around items-center z-50 rounded-t-[20px] sm:rounded-t-[30px] md:rounded-t-[40px] shadow-2xl overflow-x-auto">
        <button onClick={() => setViewMode('dashboard')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'dashboard' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Home</span></button>
        <button onClick={() => setViewMode('analytics')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'analytics' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Activity className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Analytics</span></button>
        <button onClick={() => setViewMode('absensi')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'absensi' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><FileText className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Absensi</span></button>
        <button onClick={() => setViewMode('input')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'input' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Edit2 className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Input</span></button>
        <button onClick={() => setViewMode('backup')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'backup' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Database className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Backup</span></button>
        <button onClick={() => setViewMode('manage')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'manage' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Settings className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Manage</span></button>
      </div>
    </div>
  );
}
