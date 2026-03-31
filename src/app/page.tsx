'use client'
import {
  BarChart3, Calendar, Check, ChevronDown, ChevronUp, Clock, Database, Edit2, FileText, Megaphone,
  ImageIcon, LineChart as LineChartIcon, Loader2, Medal,
  Package, Plus, Save, Settings, Star, Target, Trash2, TrendingUp, Trophy, User, UserPlus, X, Activity, Users
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
import GradientMenu from '@/components/ui/GradientMenu';
import { Banner } from '@/components/ui/Banner';
import BasicModal from '@/components/ui/BasicModal';
import InputAcquisition from '@/components/InputAcquisition';
import Skeleton, { SkeletonCard, SkeletonStatsCard, SkeletonTable, SkeletonAvatar, SkeletonText } from '@/components/Skeleton';
import { CountUp, AnimatedContent } from '@/components/animations';

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
  KPR: { name: 'KPR', unit: 'Rp', p: 1 },
  KSM: { name: 'KSM', unit: 'Rp', p: 1 },
  KUM: { name: 'KUM', unit: 'Rp', p: 1 },
  KUR: { name: 'KUR', unit: 'Rp', p: 1 },
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
  weeklyAcquisitions?: Record<number, Record<string, { quantity: number; nominal?: number } | number>>;
}

interface Acquisition {
  id: string;
  member_id: string;
  week: number;
  product_key: string;
  quantity: number;
  nominal?: number;  // For CREDIT products: nominal in Rupiah
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
  credit_nominal_per_point?: number;  // For CREDIT: how many millions for 1 point
  is_active: boolean;
}

export default function App() {
  const [viewMode, setViewMode] = useState('dashboard');
  const [manageSubTab, setManageSubTab] = useState<'products' | 'team'>('products');
  const [activeWeek, setActiveWeek] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [dashboardViewMode, setDashboardViewMode] = useState<'weekly' | 'monthly'>('weekly');

  // Update banner modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Data state
  const [teams, setTeams] = useState<Team[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form states
  const [newTeam, setNewTeam] = useState({ name: '', image_url: '' });
  const [tempMembers, setTempMembers] = useState<Record<string, { name: string, position: string, avatar_url: string }>>({});
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
  const [memberViewMode, setMemberViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [memberAttendance, setMemberAttendance] = useState<any>(null);
  const [creditDetailModal, setCreditDetailModal] = useState<{ isOpen: boolean; productKey: string; productName: string; week?: number; data: { quantity: number; nominal?: number } | null } | null>(null);

  // Migration modal state
  const [migratingMember, setMigratingMember] = useState<{ member: Member, team: Team } | null>(null);
  const [migrationTargetTeam, setMigrationTargetTeam] = useState<string>('');
  const [migrateWithData, setMigrateWithData] = useState<boolean | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Modal states for team and member creation
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState<{ isOpen: boolean; teamId: string; teamName: string } | null>(null);
  const [newMemberForm, setNewMemberForm] = useState<{ name: string; position: string; avatar_url: string }>({ name: '', position: '', avatar_url: '' });

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

  // Fetch attendance data for a member
  const fetchMemberAttendance = async (memberId: string) => {
    try {
      const monthStr = String(parseInt(selectedMonth)).padStart(2, '0');
      const startDate = `${selectedYear}-${monthStr}-01`;
      const lastDay = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
      const endDate = `${selectedYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const res = await fetch(`/api/attendances/summary?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const result = await res.json();
        const memberData = result.data?.find((m: any) => m.member_id === memberId);
        if (memberData) {
          // Calculate percentages
          const totalDays = memberData.total_days + memberData.alpha; // Include alpha days in total
          const presentRate = totalDays > 0 ? Math.round((memberData.present / totalDays) * 100) : 0;
          const lateRate = totalDays > 0 ? Math.round((memberData.late / totalDays) * 100) : 0;
          const leaveRate = totalDays > 0 ? Math.round((memberData.leave / totalDays) * 100) : 0;
          const alphaRate = totalDays > 0 ? Math.round((memberData.alpha / totalDays) * 100) : 0;

          setMemberAttendance({
            present: memberData.present,
            late: memberData.late,
            leave: memberData.leave,
            alpha: memberData.alpha,
            totalDays: totalDays,
            presentRate,
            lateRate,
            leaveRate,
            alphaRate,
            totalLateMinutes: memberData.total_late_minutes
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch member attendance:', error);
    }
  };

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
              .reduce((acc: Record<number, Record<string, { quantity: number; nominal?: number } | number>>, a: Acquisition) => {
                const product = productsData.data?.find((p: Product) => p.product_key === a.product_key);
                const isCredit = product?.category === 'CREDIT';

                if (!acc[a.week]) acc[a.week] = {};

                if (isCredit) {
                  // For CREDIT: accumulate quantity and nominal from multiple rows
                  const existing = acc[a.week][a.product_key];
                  const currentQty = typeof existing === 'object' ? existing.quantity : (existing || 0);
                  const currentNominal = typeof existing === 'object' ? (existing.nominal || 0) : 0;

                  acc[a.week][a.product_key] = {
                    quantity: currentQty + a.quantity,
                    nominal: currentNominal + (a.nominal || 0)
                  };
                } else {
                  // For FUNDING/TRANSACTION: just quantity
                  acc[a.week][a.product_key] = a.quantity;
                }
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

  const formatToIDR = (value: number): string => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  // Format nominal to compact display (e.g., 36.000.000 → 36jt)
  const formatToJuta = (value: number): string => {
    const juta = value / 1000000;
    if (juta >= 1000) {
      return `${(juta / 1000).toFixed(1)}M`; // 1.5M for 1.5 milyar
    }
    return `${juta}jt`; // 36jt for 36 juta
  };

  const getMemberPoints = useCallback((acquisitions: Record<string, { quantity: number; nominal?: number } | number> | undefined) => {
    let total = 0;
    if (!acquisitions || products.length === 0) return 0;

    Object.keys(acquisitions).forEach(key => {
      const data = acquisitions[key];
      const product = products.find(p => p.product_key === key);
      if (!product || !product.is_active) return;

      if (product.category === 'CREDIT') {
        // CREDIT: points based on configurable nominal per point
        // Formula: Math.floor(nominal / 1000000 / credit_nominal_per_point)
        // Example: nominal=309jt, credit_nominal_per_point=100 → Math.floor(309/100) = 3 poin
        const nominal = typeof data === 'object' ? (data.nominal || 0) : 0;
        const nominalPerPoint = product.credit_nominal_per_point || 100; // Default 100jt per point
        total += Math.floor((nominal / 1000000) / nominalPerPoint);
      } else {
        // FUNDING/TRANSACTION: points based on quantity
        const qty = typeof data === 'object' ? data.quantity : (data || 0);
        if (product.is_tiered && product.tier_config) {
          const tier = product.tier_config.find(t => qty <= t.limit) || product.tier_config[product.tier_config.length - 1];
          total += qty * tier.points;
        } else {
          total += qty * (product.flat_points || 0);
        }
      }
    });
    return total;
  }, [products]);

  const teamStats = useMemo(() => {
    return teams.map(team => {
      const combined: Record<string, { quantity: number; nominal?: number } | number> = {};
      (team.members || []).forEach(m => {
        if (dashboardViewMode === 'monthly') {
          // Accumulate all weeks for monthly view
          Object.values(m.weeklyAcquisitions || {}).forEach(weekAcq => {
            Object.entries(weekAcq || {}).forEach(([p, current]) => {
              const existing = combined[p];
              if (typeof current === 'object') {
                // CREDIT: accumulate quantity and nominal
                const existingObj = typeof existing === 'object' ? existing : { quantity: 0, nominal: 0 };
                combined[p] = {
                  quantity: (existingObj.quantity || 0) + (current.quantity || 0),
                  nominal: (existingObj.nominal || 0) + (current.nominal || 0)
                };
              } else {
                // FUNDING/TRANSACTION: accumulate quantity only
                combined[p] = (typeof existing === 'object' ? existing.quantity : (existing || 0)) + (current || 0);
              }
            });
          });
        } else {
          // Weekly view - use activeWeek
          const currentAqc = (m.weeklyAcquisitions || {})[activeWeek] || {};
          Object.entries(currentAqc || {}).forEach(([p, current]) => {
            const existing = combined[p];
            if (typeof current === 'object') {
              const existingObj = typeof existing === 'object' ? existing : { quantity: 0, nominal: 0 };
              combined[p] = {
                quantity: (existingObj.quantity || 0) + (current.quantity || 0),
                nominal: (existingObj.nominal || 0) + (current.nominal || 0)
              };
            } else {
              combined[p] = (typeof existing === 'object' ? existing.quantity : (existing || 0)) + (current || 0);
            }
          });
        }
      });
      return { ...team, stats: combined, totalPoints: getMemberPoints(combined) };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [teams, activeWeek, dashboardViewMode, getMemberPoints]);

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
              const data = memberAcq[productKey];
              const product = products.find(p => p.product_key === productKey);
              if (!product) return;

              if (product.category === 'CREDIT') {
                // CREDIT: points based on nominal
                const nominal = typeof data === 'object' ? (data.nominal || 0) : 0;
                metricValue += nominal * (product.flat_points || 0);
              } else {
                // FUNDING/TRANSACTION: points based on quantity
                const qty = typeof data === 'object' ? data.quantity : (data || 0);
                if (product.is_tiered && product.tier_config) {
                  const tier = product.tier_config.find(tier => qty <= tier.limit) || product.tier_config[product.tier_config.length - 1];
                  metricValue += qty * tier.points;
                } else {
                  metricValue += qty * (product.flat_points || 0);
                }
              }
            });
          } else {
            // Calculate quantity based on filtered products
            Object.keys(memberAcq).forEach(productKey => {
              if (!chartFilters.selectedProducts.includes(productKey)) return;
              const data = memberAcq[productKey];
              metricValue += typeof data === 'object' ? data.quantity : (data || 0);
            });
          }
        });

        dataPoint[t.name] = metricValue;
      });

      return dataPoint;
    });
  }, [teams, chartFilters, products]);

  const globalMemberRankings = useMemo(() => {
    const allMembers: (Member & { teamName: string, totalPoints: number, acquisitions: Record<string, { quantity: number; nominal?: number } | number> })[] = [];
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
    const memberData = tempMembers[teamId];
    if (!memberData?.name || !memberData?.position) return;
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          name: memberData.name,
          position: memberData.position,
          avatar_url: memberData.avatar_url || null
        })
      });
      if (res.ok) {
        setTempMembers(prev => {
          const newState = { ...prev };
          delete newState[teamId];
          return newState;
        });
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
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
        <header className="bg-[#003d79] text-white sticky top-0 z-50 shadow-lg border-b-4 border-[#FDB813]">
          <div className="max-w-[95%] lg:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <MandiriLogo />
              <div className="h-6 sm:h-8 w-px bg-white/20 mx-1 hidden sm:block"></div>
              <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight whitespace-nowrap">Bintang Kejora Jagasatru</h1>
            </div>
          </div>
        </header>

        <main className="max-w-[95%] lg:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          {/* Export Button Skeleton */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <Skeleton variant="rectangular" width="140px" height="40px" className="rounded-xl" />
          </div>

          {/* Navigation Bar Skeleton */}
          <div className="sticky top-[60px] sm:top-[68px] z-30 bg-slate-50/9 backdrop-blur-[8px] pb-4 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pt-4">
            <div className="bg-white rounded-[20px] sm:rounded-[30px] md:rounded-[40px] p-4 sm:p-6 md:p-8 border border-slate-200 shadow-lg">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
                <div className="flex items-center gap-2 sm:gap-4 w-full lg:w-auto">
                  <Skeleton variant="circular" width="40px" height="40px" />
                  <Skeleton variant="text" width="120px" height="24px" />
                  <Skeleton variant="circular" width="40px" height="40px" />
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end">
                  <Skeleton variant="rectangular" width="160px" height="40px" className="rounded-xl" />
                  <div className="hidden md:flex gap-1">
                    {[1, 2, 3, 4].map(w => (
                      <Skeleton key={w} variant="circular" width="60px" height="36px" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-32 w-full bg-slate-200 animate-pulse" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton variant="text" width="80px" height="32px" />
                    <Skeleton variant="circular" width="40px" height="40px" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl p-4">
                    <Skeleton variant="text" width="100px" height="16px" className="mb-3" />
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map(j => (
                        <Skeleton key={j} variant="rectangular" width="100%" height="50px" className="rounded-xl" />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="flex items-center gap-3">
                        <Skeleton variant="circular" width="40px" height="40px" />
                        <div className="flex-1">
                          <Skeleton variant="text" width="120px" height="16px" className="mb-1" />
                          <Skeleton variant="text" width="80px" height="12px" />
                        </div>
                        <Skeleton variant="text" width="30px" height="20px" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Global Progress Skeleton */}
          <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm mt-8">
            <div className="mb-10">
              <Skeleton variant="text" width="200px" height="24px" className="mb-2" />
              <Skeleton variant="text" width="150px" height="14px" />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-8">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="flex flex-col items-center">
                  <Skeleton variant="circular" width="64px" height="64px" className="mb-3" />
                  <Skeleton variant="text" width="40px" height="12px" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Helper function to get member points based on dashboardViewMode
  const getMemberPointsForView = (member: Member) => {
    if (dashboardViewMode === 'monthly') {
      // Accumulate all weeks for monthly view
      let totalAcq: Record<string, { quantity: number; nominal?: number } | number> = {};
      Object.values(member.weeklyAcquisitions || {}).forEach(weekAcq => {
        Object.entries(weekAcq || {}).forEach(([p, current]) => {
          const existing = totalAcq[p];
          if (typeof current === 'object') {
            const existingObj = typeof existing === 'object' ? existing : { quantity: 0, nominal: 0 };
            totalAcq[p] = {
              quantity: (existingObj.quantity || 0) + (current.quantity || 0),
              nominal: (existingObj.nominal || 0) + (current.nominal || 0)
            };
          } else {
            totalAcq[p] = (typeof existing === 'object' ? existing.quantity : (existing || 0)) + (current || 0);
          }
        });
      });
      return getMemberPoints(totalAcq);
    }
    // Weekly view - use activeWeek
    return getMemberPoints((member.weeklyAcquisitions || {})[activeWeek] || {});
  };

  // Get tier based on dashboardViewMode
  const getTierByRankForView = (memberId: string) => {
    // Calculate rankings based on current view mode
    const allMembers: { id: string; totalPoints: number }[] = [];
    teams.forEach(t => {
      (t.members || []).forEach(m => {
        const points = getMemberPointsForView(m);
        allMembers.push({ id: m.id, totalPoints: points });
      });
    });
    const sortedMembers = allMembers.sort((a, b) => b.totalPoints - a.totalPoints);

    const rankIndex = sortedMembers.findIndex(m => m.id === memberId);
    const member = sortedMembers.find(m => m.id === memberId);

    if (!member || member.totalPoints === 0) return { label: 'Rookie', color: 'text-slate-400', icon: <Star className="w-4 h-4" />, bg: 'bg-slate-50' };
    if (rankIndex === 0) return { label: 'MVP / Diamond', color: 'text-cyan-600', icon: <Trophy className="w-4 h-4" />, bg: 'bg-cyan-50' };
    if (rankIndex >= 1 && rankIndex <= 2) return { label: 'Gold', color: 'text-yellow-600', icon: <Medal className="w-4 h-4" />, bg: 'bg-yellow-50' };
    if (rankIndex >= 3 && rankIndex <= 5) return { label: 'Silver', color: 'text-slate-500', icon: <Medal className="w-4 h-4" />, bg: 'bg-slate-50' };
    return { label: 'Bronze', color: 'text-orange-600', icon: <Star className="w-4 h-4" />, bg: 'bg-orange-50' };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Update Banner */}
      <div
        onClick={() => setShowUpdateModal(true)}
        className="cursor-pointer"
      >
        <Banner
          id="update-banner"
          variant="rainbow"
          className="shadow-lg bg-white dark:bg-transparent"
          rainbowColors={[
            "rgba(0,149,255,0.6)",
            "rgba(231,77,255,0.8)",
            "transparent",
            "rgba(0,149,255,0.6)",
            "transparent",
            "rgba(231,77,255,0.8)",
            "transparent",
          ]}
          height="2.5rem"
        >
          <span className="text-sm">
            🚀 <strong>Update v2.0.0:</strong> Sistem Major Update, Bintang Kejora Jagasatru <i> formerly Branch Acquisition Monitor</i> sekarang kembali online! Klik untuk melihat detail update.
          </span>
        </Banner>
      </div>

      <header className="bg-[#003d79] text-white sticky top-0 z-50 shadow-lg border-b-4 border-[#FDB813]">
        <div className="max-w-[95%] lg:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <MandiriLogo />
            <div className="h-6 sm:h-8 w-px bg-white/20 mx-1 hidden sm:block"></div>
            <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight whitespace-nowrap">Bintang Kejora Jagasatru</h1>
          </div>
          <GradientMenu activeTab={viewMode} onTabChange={setViewMode} />
        </div>
      </header>

      <main className="max-w-[95%] lg:max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
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
                          .reduce((sum: number, data) => {
                            const qty = typeof data === 'object' ? data.quantity : (data || 0);
                            return sum + qty;
                          }, 0);
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

                {/* Attendance Recap - Month to Date */}
                {memberAttendance && (
                  <div className="mb-6">
                    <h4 className="font-black text-sm text-slate-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      REKAP ABSENSI - {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase()}
                    </h4>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="text-center">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hadir</div>
                          <div className="text-2xl font-black text-green-600">{memberAttendance.present || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Terlambat</div>
                          <div className="text-2xl font-black text-yellow-600">{memberAttendance.late || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Izin</div>
                          <div className="text-2xl font-black text-blue-600">{memberAttendance.leave || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Alpha</div>
                          <div className="text-2xl font-black text-red-600">{memberAttendance.alpha || 0}</div>
                        </div>
                      </div>

                      {/* Progress Bars */}
                      <div className="space-y-3">
                        {/* Present */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              Hadir
                            </span>
                            <span className="font-black text-green-600">{memberAttendance.presentRate || 0}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${memberAttendance.presentRate || 0}%` }}></div>
                          </div>
                        </div>

                        {/* Late */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                              Terlambat
                            </span>
                            <span className="font-black text-yellow-600">{memberAttendance.lateRate || 0}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${memberAttendance.lateRate || 0}%` }}></div>
                          </div>
                        </div>

                        {/* Leave */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              Izin
                            </span>
                            <span className="font-black text-blue-600">{memberAttendance.leaveRate || 0}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${memberAttendance.leaveRate || 0}%` }}></div>
                          </div>
                        </div>

                        {/* Alpha */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-slate-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              Alpha
                            </span>
                            <span className="font-black text-red-600">{memberAttendance.alphaRate || 0}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${memberAttendance.alphaRate || 0}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Total Days */}
                      <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <div className="text-xs text-slate-500">
                          Total Hari Kerja: <span className="font-black text-slate-700">{memberAttendance.totalDays || 0} hari</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weekly Breakdown */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-sm text-slate-700 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      {memberViewMode === 'weekly' ? 'BREAKDOWN PER MINGGU' : 'BREAKDOWN PER BULAN'}
                    </h4>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setMemberViewMode('weekly')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${memberViewMode === 'weekly'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        Minggu
                      </button>
                      <button
                        onClick={() => setMemberViewMode('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${memberViewMode === 'monthly'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        Bulan
                      </button>
                    </div>
                  </div>

                  {/* Weekly View */}
                  {memberViewMode === 'weekly' && (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(week => {
                        const weekAcq = (selectedMember.member.weeklyAcquisitions || {})[week] || {};
                        const weekScore = getMemberPoints(weekAcq);
                        const weekTotal = Object.values(weekAcq).reduce((sum: number, data) => {
                          const qty = typeof data === 'object' ? data.quantity : (data || 0);
                          return sum + qty;
                        }, 0);
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
                                  .filter(([_, data]) => {
                                    const qty = typeof data === 'object' ? data.quantity : (data || 0);
                                    return qty > 0;
                                  })
                                  .map(([product, data]) => {
                                    const productConfig = products.find(p => p.product_key === product);
                                    const isCredit = productConfig?.category === 'CREDIT';
                                    const qty = typeof data === 'object' ? data.quantity : (data || 0);
                                    const nominal = typeof data === 'object' ? (data.nominal || 0) : 0;
                                    let pointsEarned = 0;
                                    if (productConfig) {
                                      if (productConfig.is_tiered && productConfig.tier_config) {
                                        const tier = productConfig.tier_config.find(t => qty <= t.limit) || productConfig.tier_config[productConfig.tier_config.length - 1];
                                        pointsEarned = qty * tier.points;
                                      } else {
                                        // CREDIT: points based on configurable nominal per point
                                        const nominalPerPoint = productConfig.credit_nominal_per_point || 100;
                                        pointsEarned = isCredit ? Math.floor((nominal / 1000000) / nominalPerPoint) : qty * (productConfig.flat_points || 0);
                                      }
                                    }
                                    return (
                                      <div
                                        key={product}
                                        onClick={() => isCredit && setCreditDetailModal({
                                          isOpen: true,
                                          productKey: product,
                                          productName: productConfig?.product_name || product,
                                          week,
                                          data: typeof data === 'object' ? data : null
                                        })}
                                        className={`bg-slate-50 rounded-xl p-2.5 border border-slate-100 transition-all ${isCredit ? 'cursor-pointer hover:bg-purple-50 hover:border-purple-200' : ''}`}
                                      >
                                        <div className="text-[9px] font-black text-slate-400 uppercase">{product}</div>
                                        <div className="flex justify-between items-center mt-1">
                                          <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">{qty} {productConfig?.unit}</span>
                                            {isCredit && <span className="text-[9px] font-black text-purple-600">{formatToIDR(nominal)} Rp</span>}
                                          </div>
                                          <span className="text-xs font-black text-green-600">+{isCredit ? Math.floor((nominal / 1000000) / (productConfig.credit_nominal_per_point || 100)) : pointsEarned}</span>
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
                  )}

                  {/* Monthly View */}
                  {memberViewMode === 'monthly' && (
                    <div className="space-y-3">
                      {(() => {
                        const monthlyAcq: Record<string, { quantity: number; nominal?: number } | number> = {};
                        Object.values(selectedMember.member.weeklyAcquisitions || {}).forEach(weekAcq => {
                          Object.entries(weekAcq).forEach(([productKey, data]) => {
                            const existing = monthlyAcq[productKey];
                            if (typeof data === 'object') {
                              const existingObj = typeof existing === 'object' ? existing : { quantity: 0, nominal: 0 };
                              monthlyAcq[productKey] = {
                                quantity: (existingObj.quantity || 0) + (data.quantity || 0),
                                nominal: (existingObj.nominal || 0) + (data.nominal || 0)
                              };
                            } else {
                              monthlyAcq[productKey] = (typeof existing === 'object' ? existing.quantity : (existing || 0)) + (data || 0);
                            }
                          });
                        });
                        const monthlyScore = getMemberPoints(monthlyAcq);
                        const monthlyTotal = Object.entries(monthlyAcq).reduce((sum: number, [productKey, data]) => {
                          const product = products.find(p => p.product_key === productKey);
                          const isCredit = product?.category === 'CREDIT';
                          // For CREDIT: count number of entries (quantity), for others: sum quantity
                          if (isCredit && typeof data === 'object') {
                            return sum + data.quantity;
                          }
                          const qty = typeof data === 'object' ? data.quantity : (data || 0);
                          return sum + qty;
                        }, 0);
                        const hasData = monthlyTotal > 0;

                        return (
                          <div
                            className={`rounded-2xl border p-4 transition-all ${hasData ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'}`}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${hasData ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                  <BarChart3 className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                  {hasData ? `${monthlyTotal} Akuisisi` : 'Tidak ada data'}
                                </span>
                              </div>
                              <div className={`text-lg font-black ${hasData ? 'text-green-600' : 'text-slate-300'}`}>
                                +{monthlyScore} Poin
                              </div>
                            </div>

                            {hasData && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(monthlyAcq)
                                  .filter(([_, data]) => {
                                    const qty = typeof data === 'object' ? data.quantity : (data || 0);
                                    return qty > 0;
                                  })
                                  .map(([product, data]) => {
                                    const productConfig = products.find(p => p.product_key === product);
                                    const isCredit = productConfig?.category === 'CREDIT';
                                    const qty = typeof data === 'object' ? data.quantity : (data || 0);
                                    const nominal = typeof data === 'object' ? (data.nominal || 0) : 0;
                                    let pointsEarned = 0;
                                    if (productConfig) {
                                      if (productConfig.is_tiered && productConfig.tier_config) {
                                        const tier = productConfig.tier_config.find(t => qty <= t.limit) || productConfig.tier_config[productConfig.tier_config.length - 1];
                                        pointsEarned = qty * tier.points;
                                      } else {
                                        // CREDIT: points based on configurable nominal per point
                                        const nominalPerPoint = productConfig.credit_nominal_per_point || 100;
                                        pointsEarned = isCredit ? Math.floor((nominal / 1000000) / nominalPerPoint) : qty * (productConfig.flat_points || 0);
                                      }
                                    }
                                    return (
                                      <div
                                        key={product}
                                        onClick={() => isCredit && setCreditDetailModal({
                                          isOpen: true,
                                          productKey: product,
                                          productName: productConfig?.product_name || product,
                                          data: typeof data === 'object' ? data : null
                                        })}
                                        className={`bg-slate-50 rounded-xl p-2.5 border border-slate-100 transition-all ${isCredit ? 'cursor-pointer hover:bg-purple-50 hover:border-purple-200' : ''}`}
                                      >
                                        <div className="text-[9px] font-black text-slate-400 uppercase">{product}</div>
                                        <div className="flex justify-between items-center mt-1">
                                          <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">{qty} {productConfig?.unit}</span>
                                            {isCredit && <span className="text-[9px] font-black text-purple-600">{formatToIDR(nominal)} Rp</span>}
                                          </div>
                                          <span className="text-xs font-black text-green-600">+{isCredit ? Math.floor((nominal / 1000000) / (productConfig.credit_nominal_per_point || 100)) : pointsEarned}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
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

        {/* --- CREDIT DETAIL MODAL --- */}
        {creditDetailModal && creditDetailModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto" style={{ scrollBehavior: 'auto' }}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCreditDetailModal(null)}></div>
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 my-auto max-h-[80vh] overflow-y-auto scrollbar-hide">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-[40px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-xl">{creditDetailModal.productName}</h3>
                    <p className="text-xs font-bold text-purple-100 mt-1">
                      Minggu {creditDetailModal.week} • CREDIT
                    </p>
                  </div>
                  <button
                    onClick={() => setCreditDetailModal(null)}
                    className="p-2 hover:bg-white/20 rounded-2xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Summary */}
                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Total</div>
                      <div className="text-2xl font-black text-purple-900">
                        {creditDetailModal.data && typeof creditDetailModal.data === 'object' ? creditDetailModal.data.quantity : 0} Akuisisi
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Nominal</div>
                      <div className="text-2xl font-black text-purple-900">
                        {creditDetailModal.data && typeof creditDetailModal.data === 'object' ? formatToIDR(creditDetailModal.data.nominal || 0) + ' Rp' : '0 Rp'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-600 mb-1">Detail Akuisisi</div>
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                        Poin dihitung berdasarkan konfigurasi nominal per poin (default: 1 poin per 100 juta).
                        Rumus: floor(nominal / 1.000.000 / nominal_per_poin).
                      </p>
                    </div>
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

                  {/* Week/Month Toggle & Week Selector */}
                  <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end">
                    {/* Week/Month Toggle */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setDashboardViewMode('weekly')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${dashboardViewMode === 'weekly'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        Mingguan
                      </button>
                      <button
                        onClick={() => setDashboardViewMode('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${dashboardViewMode === 'monthly'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        Bulanan
                      </button>
                    </div>

                    {/* Week Selector (only show in weekly mode) */}
                    {dashboardViewMode === 'weekly' && (
                      <>
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
                      </>
                    )}
                    <div className="lg:hidden text-xs sm:text-sm font-bold text-slate-500">
                      {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tim Card Grid */}
            <div
              key={dashboardViewMode === 'weekly' ? `week-${activeWeek}` : `month-${selectedMonth}-${selectedYear}`}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {teamStats.map((team, idx) => {
                const cardStyle: React.CSSProperties = team.image_url
                  ? {
                    background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.95) 40%, #ffffff 100%)`,
                    position: 'relative'
                  }
                  : { background: 'white' };

                return (
                  <AnimatedContent
                    key={team.id}
                    // ANIMATION CUSTOMIZATION:
                    distance={100}        // Start 100px below final position
                    direction="horizontal"  // Animate on y-axis (vertical)
                    reverse={false}       // false = from bottom, true = from top
                    duration={0.6}        // Animation duration in seconds
                    ease="power3.in"     // Easing: power3.out = smooth deceleration
                    delay={idx * 0.15}    // Stagger delay: 0.15s per card
                    threshold={0.05}      // Trigger when 5% of card is visible
                    initialOpacity={0}    // Start fully transparent
                    animateOpacity={true} // Fade in during animation
                    scale={1}             // Start at normal size (no scaling)
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
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            {dashboardViewMode === 'monthly' ? 'Poin Bulan Ini' : 'Poin Minggu Ini'}
                          </span>
                          <span className="text-3xl font-black tracking-tighter text-[#003d79]">
                            <CountUp value={team.totalPoints} duration={1.5} delay={idx * 0.15 + 0.6} />
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-900 border border-blue-100 font-black text-xs">
                          {dashboardViewMode === 'monthly'
                            ? new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('id-ID', { month: 'short' }).toUpperCase().replace('.', '')
                            : `W${activeWeek}`
                          }
                        </div>
                      </div>

                      <div className="mb-6 bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-blue-600" /> Dashboard Target
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 px-2 py-1 bg-blue-100 rounded-md">
                            {products.filter(p => {
                              const current = team.stats[p.product_key];
                              const isCredit = p.category === 'CREDIT';
                              const currentValue = isCredit && typeof current === 'object'
                                ? current.nominal || 0
                                : (typeof current === 'object' ? current.quantity : (current || 0));
                              const targetMultiplier = dashboardViewMode === 'monthly' ? 4 : 1;
                              const target = p.weekly_target * targetMultiplier;
                              return p.is_active && currentValue >= target;
                            }).length} Goal
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {products.filter(p => p.is_active).map(p => {
                            const current = team.stats[p.product_key];
                            const isCredit = p.category === 'CREDIT';
                            // For CREDIT: get total nominal, for others: get quantity
                            const currentValue = isCredit && typeof current === 'object'
                              ? current.nominal || 0
                              : (typeof current === 'object' ? current.quantity : (current || 0));
                            const targetMultiplier = dashboardViewMode === 'monthly' ? 4 : 1;
                            const target = p.weekly_target * targetMultiplier;
                            const isDone = isCredit ? currentValue >= target : currentValue >= target;
                            return (
                              <div key={p.product_key} className={`p-2 rounded-xl border transition-all ${isDone ? 'bg-green-50/80 border-green-100' : currentValue > 0 ? 'bg-white/80 border-blue-100' : 'bg-white/40 border-slate-100/50'}`}>
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`text-[9px] font-black ${isDone ? 'text-green-700' : 'text-slate-400'}`}>{p.product_key}</span>
                                  {isDone && <Check className="w-2.5 h-2.5 text-green-600" />}
                                </div>
                                <div className="flex items-end gap-1">
                                  <span className={`text-sm font-black leading-none ${isDone ? 'text-green-700' : currentValue > 0 ? 'text-blue-900' : 'text-slate-300'}`}>
                                    {isCredit ? formatToJuta(currentValue) : currentValue}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-300 mb-0.5">/ {isCredit ? formatToJuta(target) : target}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[...(team.members || [])].sort((a, b) => getMemberPointsForView(b) - getMemberPointsForView(a)).map(m => {
                          const pts = getMemberPointsForView(m);
                          const tier = getTierByRankForView(m.id);
                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedMember({ member: m, team });
                                fetchMemberAttendance(m.id);
                              }}
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
                              <div className={`text-lg font-black pr-2 flex-shrink-0 ${tier.color}`}>
                                <CountUp value={pts} duration={1} delay={idx * 0.15 + 0.6} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </AnimatedContent>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'manage' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Tab Selectors */}
            <div className="bg-white rounded-[30px] p-2 border border-slate-200 shadow-sm">
              <div className="flex gap-2">
                <button
                  onClick={() => setManageSubTab('products')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[20px] text-sm font-black transition-all ${manageSubTab === 'products'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  <Package className="w-4 h-4" /> Manage Products
                </button>
                <button
                  onClick={() => setManageSubTab('team')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[20px] text-sm font-black transition-all ${manageSubTab === 'team'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  <Users className="w-4 h-4" /> Manage Team
                </button>
              </div>
            </div>

            {/* Product Management */}
            {manageSubTab === 'products' && (
              <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm">
                <ProductManager products={products} onSaveProducts={setProducts} isLoading={isLoading} />
              </div>
            )}

            {/* Team Management */}
            {manageSubTab === 'team' && (
              <div className="space-y-8">
                {/* Team Creation Button */}
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Users className="w-6 h-6" /> Manage Team
                  </h3>
                  <button
                    onClick={() => setShowNewTeamModal(true)}
                    className="bg-[#003d79] hover:bg-[#002d5a] text-white px-5 py-2.5 rounded-full font-black text-sm transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4" /> Buat Tim Baru
                  </button>
                </div>

                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map(team => (
                    <div key={team.id} className="bg-white rounded-[30px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                      {/* Team Header */}
                      <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-10 rounded-xl bg-blue-100 border border-blue-200 overflow-hidden flex-shrink-0 shadow-inner">
                            {team.image_url ? (
                              <img src={team.image_url} className="w-full h-full object-cover" alt={team.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-blue-300" />
                              </div>
                            )}
                          </div>
                          {editingTeam?.id === team.id ? (
                            <div className="flex flex-col gap-2 flex-1 bg-white p-2 rounded-xl shadow-md border border-blue-100">
                              <input
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-black outline-none focus:ring-2 focus:ring-blue-200"
                                value={editingTeam.name}
                                onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                placeholder="Nama tim..."
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <ImageUploader
                                  value={editingTeam.image_url}
                                  onChange={(url) => setEditingTeam({ ...editingTeam, image_url: url })}
                                  label="Upload"
                                  folder="teams"
                                  entityId={editingTeam.id}
                                  aspectRatio="16/10"
                                />
                                <ImageUploader
                                  value={editingTeam.image_url}
                                  onChange={(url) => setEditingTeam({ ...editingTeam, image_url: url })}
                                  label="Paste URL"
                                  folder="teams"
                                  entityId={editingTeam.id}
                                  aspectRatio="16/10"
                                />
                              </div>
                              <div className="flex gap-1.5 w-full">
                                <button onClick={updateTeam} className="flex-1 p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingTeam(null)} className="flex-1 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h3 className="font-black text-[#003d79] text-base uppercase tracking-tight truncate">{team.name}</h3>
                              <button
                                onClick={() => setEditingTeam({ id: team.id, name: team.name, image_url: team.image_url, accent_color: team.accent_color })}
                                className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Members Section */}
                      <div className="p-5 flex-1 flex flex-col">
                        {/* Add Member Button */}
                        <button
                          onClick={() => {
                            setShowAddMemberModal({ isOpen: true, teamId: team.id, teamName: team.name });
                            setNewMemberForm({ name: '', position: '', avatar_url: '' });
                          }}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 border-2 border-dashed border-slate-300"
                        >
                          <UserPlus className="w-4 h-4" /> Tambah Anggota
                        </button>

                        {/* Members List */}
                        {(team.members && team.members.length > 0) ? (
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center justify-between px-2 py-1.5">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Anggota ({team.members.length})</span>
                              <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Minggu {activeWeek}</span>
                            </div>
                            {(team.members || []).map(member => (
                              <div key={member.id} className="group bg-slate-50 hover:bg-blue-50 rounded-xl p-3 border border-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#003d79] text-[#FDB813] flex items-center justify-center font-black text-xs shadow-md border-2 border-white flex-shrink-0">
                                    {member.avatar_url ? (
                                      <img src={member.avatar_url} className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150"} />
                                    ) : (
                                      member.name?.[0]?.toUpperCase()
                                    )}
                                  </div>
                                  {editingMember?.memberId === member.id ? (
                                    <div className="flex-1 space-y-2">
                                      <input
                                        className="w-full text-sm font-black p-1.5 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-200"
                                        value={editingMember.name}
                                        onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                        placeholder="Nama"
                                      />
                                      <input
                                        className="w-full text-xs font-black p-1.5 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-200"
                                        value={editingMember.position}
                                        onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })}
                                        placeholder="Jabatan"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <ImageUploader
                                          value={editingMember.avatar_url}
                                          onChange={(url) => setEditingMember({ ...editingMember, avatar_url: url })}
                                          label="Upload"
                                          folder="members"
                                          entityId={editingMember.memberId}
                                          aspectRatio="1/1"
                                        />
                                        <ImageUploader
                                          value={editingMember.avatar_url}
                                          onChange={(url) => setEditingMember({ ...editingMember, avatar_url: url })}
                                          label="Paste URL"
                                          folder="members"
                                          entityId={editingMember.memberId}
                                          aspectRatio="1/1"
                                        />
                                      </div>
                                      <div className="flex gap-1.5">
                                        <button
                                          onClick={updateMember}
                                          className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-black transition-colors"
                                        >
                                          Simpan
                                        </button>
                                        <button
                                          onClick={() => setEditingMember(null)}
                                          className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-black transition-colors"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="font-black text-slate-800 text-sm truncate">{member.name}</p>
                                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                              onClick={() => setEditingMember({ teamId: team.id, memberId: member.id, name: member.name, position: member.position, avatar_url: member.avatar_url })}
                                              className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-100 rounded transition-all"
                                              title="Edit"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => deleteMember(team.id, member.id)}
                                              className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-100 rounded transition-all"
                                              title="Hapus"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => setMigratingMember({ member, team })}
                                              className="p-1 text-slate-300 hover:text-purple-500 hover:bg-purple-100 rounded transition-all"
                                              title="Pindahkan"
                                            >
                                              <UserPlus className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">{member.position}</p>
                                      </div>
                                      <div className="bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100 text-center flex-shrink-0">
                                        <p className="text-base font-black text-yellow-800 leading-none">{getMemberPoints((member.weeklyAcquisitions || {})[activeWeek])}</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400 flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="w-10 h-10 opacity-20" />
                              <p className="text-xs font-bold">Belum ada anggota</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Team Modal */}
            {showNewTeamModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ scrollBehavior: 'auto' }}>
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNewTeamModal(false)}></div>
                <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 my-auto">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-[#003d79] to-[#005bb7] text-white p-6 rounded-t-[40px]">
                    <h3 className="font-black text-xl flex items-center gap-2">
                      <Users className="w-6 h-6" /> Buat Tim Baru
                    </h3>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Nama Tim</label>
                      <input
                        type="text"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        placeholder="Masukkan nama tim..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Gambar Tim</label>
                      <div className="grid grid-cols-2 gap-3">
                        <ImageUploader
                          value={newTeam.image_url}
                          onChange={(url) => setNewTeam({ ...newTeam, image_url: url || '' })}
                          label="Upload"
                          folder="teams"
                          aspectRatio="16/10"
                        />
                        <ImageUploader
                          value={newTeam.image_url}
                          onChange={(url) => setNewTeam({ ...newTeam, image_url: url || '' })}
                          label="Paste URL"
                          folder="teams"
                          aspectRatio="16/10"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setShowNewTeamModal(false)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-black text-sm transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => {
                          addTeam();
                          setShowNewTeamModal(false);
                        }}
                        disabled={!newTeam.name.trim()}
                        className="flex-1 bg-[#003d79] hover:bg-[#002d5a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Plus className="w-5 h-5" /> Buat Tim
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ scrollBehavior: 'auto' }}>
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddMemberModal(null)}></div>
                <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-slate-200 my-auto">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-[#003d79] to-[#005bb7] text-white p-6 rounded-t-[40px]">
                    <h3 className="font-black text-xl flex items-center gap-2">
                      <UserPlus className="w-6 h-6" /> Tambah Anggota - {showAddMemberModal.teamName}
                    </h3>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Nama Lengkap</label>
                      <input
                        type="text"
                        value={newMemberForm.name}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                        placeholder="Masukkan nama lengkap..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Jabatan</label>
                      <input
                        type="text"
                        value={newMemberForm.position}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, position: e.target.value })}
                        placeholder="Masukkan jabatan..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Foto Anggota</label>
                      <div className="grid grid-cols-2 gap-3">
                        <ImageUploader
                          value={newMemberForm.avatar_url || null}
                          onChange={(url) => setNewMemberForm({ ...newMemberForm, avatar_url: url || '' })}
                          label="Upload"
                          folder="members"
                          aspectRatio="1/1"
                        />
                        <ImageUploader
                          value={newMemberForm.avatar_url || null}
                          onChange={(url) => setNewMemberForm({ ...newMemberForm, avatar_url: url || '' })}
                          label="Paste URL"
                          folder="members"
                          aspectRatio="1/1"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setShowAddMemberModal(null)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-black text-sm transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => {
                          setTempMembers({ ...tempMembers, [showAddMemberModal.teamId]: newMemberForm });
                          addMemberToTeam(showAddMemberModal.teamId);
                          setShowAddMemberModal(null);
                        }}
                        disabled={!newMemberForm.name.trim() || !newMemberForm.position.trim()}
                        className="flex-1 bg-[#003d79] hover:bg-[#002d5a] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Plus className="w-5 h-5" /> Tambah
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

      {/* Update System Modal */}
      <BasicModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="📢 Announcement System Update"
        size="md"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          {/* Version Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4 sticky top-0 z-10">
            <div className="flex items-center gap-3 mb-2">
              <Megaphone className="w-6 h-6" />
              <h4 className="font-black text-lg">Versi 2.0.0</h4>
            </div>
            <p className="text-sm text-blue-100">Released: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          {/* Update Content */}
          <div className="prose prose-sm max-w-none">
            <p className="text-slate-600">
              Detail Update:
            </p>

            <ul className="space-y-2 mt-4">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Fitur Baru:</strong> Integrasi absensi, fleksibilitas produk, animasi, dan mikrointeraksi dari GSAP dan framer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">🔧</span>
                <span><strong>Perbaikan:</strong> implementasi sistem input berbasis tanggal, separasi produk dengan kategori kredit dan non-kredit, toggle report weekly/monthly, dan perbaikan error karena migrasi sistem lama ke sistem baru</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">⚡</span>
                <span><strong>Optimasi:</strong> Peningkatan performa pada dekstop</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">💎</span>
                <span><strong>On going:</strong> Development Chart, PDF & Excel Report Feature, Mobile Optimization</span>
              </li>
            </ul>
          </div>

          {/* Release Notes Section */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h5 className="font-black text-slate-800 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Changelog
            </h5>
            <div className="text-sm text-slate-600 space-y-2">
              <p>• [26/03/2026] - Implementasi fitur absensi dan produk manajer dinamis, memperbaiki animasi loading</p>
              <p>• [29/03/2026] - menambahkan beberapa fitur baru, integrasi realtime input dengan basis kalender</p>
              <p>• [30/03/2026] - separasi produk kredit dan non-kredit, report monthly/weekly adjustment, menambahkan thousand separator pada form</p>
              <p>• [01/04/2026] - finishing, menambahkan animasi dengan GSAP, dan beberapa mikrointeraksi</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 sticky bottom-0 bg-white pt-4">
            <button
              onClick={() => setShowUpdateModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors font-bold text-sm"
            >
              Tutup
            </button>
            <button
              onClick={() => setShowUpdateModal(false)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold text-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      </BasicModal>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 sm:px-4 py-2 sm:py-3 md:hidden flex justify-around items-center z-50 rounded-t-[20px] sm:rounded-t-[30px] md:rounded-t-[40px] shadow-2xl overflow-x-auto">
        <button onClick={() => setViewMode('dashboard')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'dashboard' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Home</span></button>
        <button onClick={() => setViewMode('analytics')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'analytics' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Activity className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Analytics</span></button>
        <button onClick={() => setViewMode('input')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'input' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Edit2 className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Input</span></button>
        <button onClick={() => setViewMode('backup')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'backup' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Database className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Backup</span></button>
        <button onClick={() => setViewMode('manage')} className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-all flex-shrink-0 px-2 py-1 ${viewMode === 'manage' ? 'text-blue-900 scale-110' : 'text-slate-300'}`}><Settings className="w-5 h-5 sm:w-6 sm:h-6" /><span className="text-[6px] sm:text-[7px] font-black uppercase">Manage</span></button>
      </div>
    </div>
  );
}
