'use client'
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, Plus, Trash2, UserPlus, X, Trophy, Medal, Star, Settings, Users, Briefcase, Target, Camera, ImageIcon, TrendingUp, Edit2, Check, Calendar, ChevronRight, Download, FileSpreadsheet, LineChart as LineChartIcon
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer as RechartsContainer } from 'recharts';

// --- KONFIGURASI POIN & TARGET ---
const PRODUCT_POINTS = {
  MTB: { name: 'Mandiri Tabungan Bisnis', unit: 'Rekening', type: 'tiered', tiers: [{limit: 10, p: 3}, {limit: 30, p: 6}, {limit: 999, p: 9}] },
  GIRO: { name: 'Tabungan Giro', unit: 'Rekening', type: 'tiered', tiers: [{limit: 5, p: 3}, {limit: 999, p: 6}] },
  EDC: { name: 'EDC', unit: 'Aplikasi', p: 3 },
  KOPRA: { name: 'Kopra', unit: 'Aplikasi', p: 2 },
  MTR: { name: 'Mandiri Tabungan Rencana', unit: 'Rekening', p: 2 },
  CC: { name: 'Credit Card', unit: 'Aplikasi', p: 2 },
  KPR: { name: 'KPR', unit: 'Juta', p: 4 },
  KSM: { name: 'KSM', unit: 'Juta', p: 4 },
  KUM: { name: 'KUM', unit: 'Juta', p: 2 },
  KUR: { name: 'KUR', unit: 'Juta', p: 2 },
  LVMUREG: { name: 'LVM Ureg', unit: 'Aplikasi', p: 1 },
  LVMUSAK: { name: 'LVM Usak', unit: 'Aplikasi', p: 1 },
  LIVIN: { name: 'Livin', unit: 'Rekening', p: 1 },
};

const WEEKLY_TARGETS = {
  MTB: 4, GIRO: 2, MTR: 28, KOPRA: 1, EDC: 2, LIVIN: 84, CC: 2, KUM: 130, KUR: 174, KSM: 36, KPR: 80, LVMUREG: 17, LVMUSAK: 45
};

const MandiriLogo = () => (
  <img 
    src="https://upload.wikimedia.org/wikipedia/id/thumb/f/fa/Bank_Mandiri_logo.svg/2560px-Bank_Mandiri_logo.svg.png" 
    alt="mandiri" 
    className="h-7 w-auto object-contain"
  />
);

export default function App() {
  const [viewMode, setViewMode] = useState('dashboard');
  const [activeWeek, setActiveWeek] = useState(1);
  const [isExcelReady, setIsExcelReady] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState([1]);

  // Load SheetJS for XLSX support
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setIsExcelReady(true);
    document.body.appendChild(script);
  }, []);

  const [teams, setTeams] = useState([
    { 
      id: 1, 
      name: 'Tim Garuda - KCP Sudirman', 
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
      accentColor: '#003d79',
      members: [
        { 
          id: 101, 
          name: 'Budi Santoso', 
          position: 'Senior Sales', 
          avatar: 'https://i.pravatar.cc/150?u=101', 
          weeklyAcquisitions: { 
            1: { KUR: 50, LIVIN: 20, MTB: 5 },
            2: { KUR: 80, LIVIN: 40, MTB: 12 },
            3: { KUR: 60, LIVIN: 30, MTB: 8 },
            4: { KUR: 90, LIVIN: 50, MTB: 15 }
          } 
        }
      ]
    },
    { 
      id: 2, 
      name: 'Tim Elang - KCP Thamrin', 
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop',
      accentColor: '#1e40af',
      members: [
        { 
          id: 102, 
          name: 'Siti Aminah', 
          position: 'Account Manager', 
          avatar: 'https://i.pravatar.cc/150?u=102', 
          weeklyAcquisitions: { 
            1: { KUR: 40, LIVIN: 60, EDC: 2 },
            2: { KUR: 30, LIVIN: 45, EDC: 1 },
            3: { KUR: 70, LIVIN: 90, EDC: 4 },
            4: { KUR: 55, LIVIN: 75, EDC: 3 }
          } 
        }
      ]
    }
  ]);

  const [newTeam, setNewTeam] = useState({ name: '', image: '' });
  const [tempMember, setTempMember] = useState({ name: '', position: '', avatar: '' });
  const [editingTeam, setEditingTeam] = useState(null); 
  const [editingMember, setEditingMember] = useState(null); 

  const getMemberPoints = (acquisitions) => {
    let total = 0;
    if (!acquisitions) return 0;
    Object.keys(acquisitions).forEach(key => {
      const qty = acquisitions[key];
      const product = PRODUCT_POINTS[key];
      if (!product) return;
      if (product.type === 'tiered') {
        const tier = product.tiers.find(t => qty <= t.limit) || product.tiers[product.tiers.length - 1];
        total += qty * tier.p;
      } else {
        total += qty * product.p;
      }
    });
    return total;
  };

  const teamStats = useMemo(() => {
    return teams.map(team => {
      const combined = {};
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
      const dataPoint = { name: `Week ${w}` };
      teams.forEach(t => {
        let weeklyTeamScore = 0;
        (t.members || []).forEach(m => {
          weeklyTeamScore += getMemberPoints((m.weeklyAcquisitions || {})[w] || {});
        });
        dataPoint[t.name] = weeklyTeamScore;
      });
      return dataPoint;
    });
  }, [teams]);

  const globalMemberRankings = useMemo(() => {
    const allMembers = [];
    teams.forEach(t => {
      (t.members || []).forEach(m => {
        const currentAqc = (m.weeklyAcquisitions || {})[activeWeek] || {};
        allMembers.push({ ...m, teamName: t.name, totalPoints: getMemberPoints(currentAqc), acquisitions: currentAqc });
      });
    });
    return allMembers.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [teams, activeWeek]);

  // --- FITUR EXPORT EXCEL MULTI-WEEK ---
  const handleExportAction = () => {
    if (!window.XLSX) return;
    if (selectedWeeks.length === 0) {
      alert("Pilih minimal satu minggu untuk diekspor.");
      return;
    }

    const products = Object.keys(PRODUCT_POINTS);
    let finalData = [];

    // Loop through selected weeks and collect member data
    selectedWeeks.sort().forEach(weekNum => {
      teams.forEach(t => {
        (t.members || []).forEach(m => {
          const acq = (m.weeklyAcquisitions || {})[weekNum] || {};
          const row = {
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

    const worksheet = window.XLSX.utils.json_to_sheet(finalData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Performa");
    window.XLSX.writeFile(workbook, `Laporan_MPS_Maret_Terpilih.xlsx`);
    setShowExportModal(false);
  };

  const toggleWeekSelection = (w) => {
    setSelectedWeeks(prev => 
      prev.includes(w) ? prev.filter(item => item !== w) : [...prev, w]
    );
  };

  const getTierByRank = (memberId) => {
    const rankIndex = globalMemberRankings.findIndex(m => m.id === memberId);
    const member = globalMemberRankings.find(m => m.id === memberId);
    if (!member || member.totalPoints === 0) return { label: 'Rookie', color: 'text-slate-400', icon: <Star className="w-4 h-4" />, bg: 'bg-slate-50' };
    if (rankIndex === 0) return { label: 'MVP / Diamond', color: 'text-cyan-600', icon: <Trophy className="w-4 h-4" />, bg: 'bg-cyan-50' };
    if (rankIndex >= 1 && rankIndex <= 2) return { label: 'Gold', color: 'text-yellow-600', icon: <Medal className="w-4 h-4" />, bg: 'bg-yellow-50' };
    if (rankIndex >= 3 && rankIndex <= 5) return { label: 'Silver', color: 'text-slate-500', icon: <Medal className="w-4 h-4" />, bg: 'bg-slate-50' };
    return { label: 'Bronze', color: 'text-orange-600', icon: <Star className="w-4 h-4" />, bg: 'bg-orange-50' };
  };

  const addTeam = () => {
    if (!newTeam.name) return;
    setTeams([...teams, { id: Date.now(), name: newTeam.name, image: newTeam.image, members: [], accentColor: '#003d79' }]);
    setNewTeam({ name: '', image: '' });
  };

  const deleteTeam = (id) => {
    if (window.confirm("Hapus tim ini beserta seluruh anggotanya?")) {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  const saveEditTeam = () => {
    if (!editingTeam) return;
    setTeams(teams.map(t => t.id === editingTeam.id ? { ...t, name: editingTeam.name, image: editingTeam.image } : t));
    setEditingTeam(null);
  };

  const addMemberToTeam = (teamId) => {
    if (!tempMember.name || !tempMember.position) return;
    setTeams(teams.map(t => t.id === teamId ? {
      ...t, members: [...(t.members || []), { id: Date.now(), ...tempMember, weeklyAcquisitions: {} }]
    } : t));
    setTempMember({ name: '', position: '', avatar: '' });
  };

  const deleteMember = (teamId, memberId) => {
    if (window.confirm("Hapus anggota ini?")) {
      setTeams(teams.map(t => t.id === teamId ? {
        ...t, members: t.members.filter(m => m.id !== memberId)
      } : t));
    }
  };

  const saveEditMember = () => {
    if (!editingMember) return;
    setTeams(teams.map(t => t.id === editingMember.teamId ? {
      ...t, members: t.members.map(m => m.id === editingMember.memberId ? {
        ...m, 
        name: editingMember.name, 
        position: editingMember.position, 
        avatar: editingMember.avatar 
      } : m)
    } : t));
    setEditingMember(null);
  };

  const updateAcquisition = (teamId, memberId, productKey, value) => {
    const val = parseInt(value) || 0;
    setTeams(teams.map(t => t.id === teamId ? {
      ...t, members: t.members.map(m => m.id === memberId ? {
        ...m, 
        weeklyAcquisitions: { 
          ...(m.weeklyAcquisitions || {}), 
          [activeWeek]: { 
            ...((m.weeklyAcquisitions || {})[activeWeek] || {}), 
            [productKey]: val 
          } 
        }
      } : m)
    } : t));
  };

  const colors = ['#003d79', '#FDB813', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-[#003d79] text-white sticky top-0 z-50 shadow-lg border-b-4 border-[#FDB813]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MandiriLogo />
            <div className="h-8 w-px bg-white/20 mx-1 hidden sm:block"></div>
            <h1 className="text-lg font-bold tracking-tight">Sales Performance Monitor</h1>
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
            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3"><Calendar className="text-blue-600 w-8 h-8" /> Rekapitulasi Minggu ke-{activeWeek}</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">Data Terkini Bulan Maret 2026</p>
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
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Minggu Tersedia (Bulan Maret)</p>
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

        {viewMode === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Chart Section */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                   <h2 className="font-black text-xl flex items-center gap-3 text-slate-800 mb-1"><div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center"><LineChartIcon className="text-indigo-600 w-6 h-6"/></div>Tren Performa Tim</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-14">Akumulasi skor antar tim setiap minggunya</p>
                 </div>
                 <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100"><span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider italic">Real-time Analysis</span></div>
               </div>
               <div className="h-[350px] w-full">
                 <RechartsContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} itemStyle={{ fontSize: '11px', fontWeight: 900 }} labelStyle={{ fontSize: '10px', fontWeight: 900, marginBottom: '8px', color: '#64748b' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingBottom: '20px' }} />
                      {teams.map((t, i) => (
                        <Line key={t.id} type="monotone" dataKey={t.name} stroke={t.accentColor || colors[i % colors.length]} strokeWidth={4} dot={{ r: 6, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 8, strokeWidth: 0 }} animationDuration={1500} />
                      ))}
                    </LineChart>
                 </RechartsContainer>
               </div>
            </div>

            {/* Tim Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamStats.map((team, idx) => {
                const cardStyle = team.image 
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
                    {team.image && (
                      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                        <div 
                          className="absolute inset-0 opacity-[0.15] blur-3xl scale-125"
                          style={{ 
                            backgroundImage: `url(${team.image})`, 
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="h-32 w-full relative overflow-hidden z-10">
                      {team.image ? (
                        <img 
                          src={team.image} 
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
                        {[...(team.members || [])].sort((a,b) => getMemberPoints((b.weeklyAcquisitions || {})[activeWeek]) - getMemberPoints((a.weeklyAcquisitions || {})[activeWeek])).map(m => {
                          const pts = getMemberPoints((m.weeklyAcquisitions || {})[activeWeek]);
                          const tier = getTierByRank(m.id);
                          return (
                            <div key={m.id} className={`flex justify-between items-center p-3 rounded-full border transition-all ${pts > 0 ? tier.bg + ' border-transparent shadow-sm' : 'bg-white/30 border-slate-100/30 opacity-60'}`}>
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-white border-2 border-white flex-shrink-0 shadow-sm">
                                   {m.avatar ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 font-black text-xs">{m.name?.[0]}</div>}
                                </div>
                                <div className="truncate"><div className="font-bold text-slate-800 text-sm leading-tight truncate">{m.name}</div><div className={`text-[9px] font-black uppercase flex items-center gap-1 mt-0.5 ${tier.color}`}>{tier.icon} {tier.label}</div></div>
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
                <h2 className="text-3xl font-black mb-2 tracking-tight">Pusat Kendali</h2>
                <p className="text-blue-200 text-sm font-medium">Input data akuisisi untuk <span className="text-[#FDB813] font-black underline underline-offset-4">Maret - Minggu ke-{activeWeek}</span></p>
              </div>
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div className="space-y-1"><label className="text-[10px] font-black text-blue-300 ml-4 uppercase tracking-widest">Nama Tim Baru</label><input type="text" value={newTeam.name} onChange={(e) => setNewTeam({...newTeam, name: e.target.value})} placeholder="Contoh: Tim Rajawali" className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 text-sm outline-none focus:bg-white/20 focus:ring-2 focus:ring-[#FDB813]" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-blue-300 ml-4 uppercase tracking-widest">URL Sampul</label><input type="text" value={newTeam.image} onChange={(e) => setNewTeam({...newTeam, image: e.target.value})} placeholder="https://images..." className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 text-sm outline-none focus:bg-white/20 focus:ring-2 focus:ring-[#FDB813]" /></div>
                <div className="flex items-end"><button onClick={addTeam} className="w-full bg-[#FDB813] text-blue-900 h-[54px] rounded-full font-black text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> DAFTAR TIM</button></div>
              </div>
            </div>

            {/* List Team Manajemen */}
            <div className="grid grid-cols-1 gap-12">
              {teams.map(team => (
                <div key={team.id} className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-10 rounded-xl bg-blue-100 border border-blue-200 overflow-hidden flex-shrink-0 shadow-inner">
                        {team.image ? <img src={team.image} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-blue-300"/></div>}
                      </div>
                      {editingTeam?.id === team.id ? (
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full max-w-2xl bg-white p-3 rounded-2xl shadow-md border border-blue-100">
                          <input className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-black outline-none" value={editingTeam.name} onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})} placeholder="Nama tim..."/>
                          <input className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-black outline-none" value={editingTeam.image} onChange={(e) => setEditingTeam({...editingTeam, image: e.target.value})} placeholder="URL sampul..."/>
                          <div className="flex gap-2"><button onClick={saveEditTeam} className="p-3 bg-green-500 text-white rounded-xl"><Check className="w-5 h-5"/></button><button onClick={() => setEditingTeam(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl"><X className="w-5 h-5"/></button></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3"><h3 className="font-black text-[#003d79] text-xl uppercase tracking-tight">{team.name}</h3><button onClick={() => setEditingTeam({id: team.id, name: team.name, image: team.image})} className="p-1.5 text-slate-300 hover:text-blue-600 transition-all"><Edit2 className="w-4 h-4"/></button></div>
                      )}
                    </div>
                    <button onClick={() => deleteTeam(team.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-5 h-5"/></button>
                  </div>

                  <div className="p-10 space-y-16">
                    <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Tambah Anggota Tim</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <input type="text" value={tempMember.name} onChange={(e) => setTempMember({...tempMember, name: e.target.value})} placeholder="Nama Lengkap" className="w-full bg-white border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                        <input type="text" value={tempMember.position} onChange={(e) => setTempMember({...tempMember, position: e.target.value})} placeholder="Jabatan" className="w-full bg-white border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                        <input type="text" value={tempMember.avatar} onChange={(e) => setTempMember({...tempMember, avatar: e.target.value})} placeholder="URL Avatar" className="w-full bg-white border border-slate-200 rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
                        <button onClick={() => addMemberToTeam(team.id)} className="w-full bg-[#003d79] text-white h-[48px] rounded-full font-black text-xs">TAMBAH</button>
                      </div>
                    </div>

                    <div className="space-y-14">
                      {(team.members || []).map(member => (
                        <div key={member.id} className="relative group border-b border-slate-50 pb-10 last:border-0 last:pb-0">
                          <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
                            <div className="flex items-center gap-5 flex-1 min-w-0">
                              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#003d79] text-[#FDB813] flex items-center justify-center font-black text-lg shadow-lg border-4 border-white flex-shrink-0">
                                {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" onError={(e) => e.target.src="https://via.placeholder.com/150"}/> : member.name?.[0]}
                              </div>
                              <div className="truncate flex-1">
                                {editingMember?.memberId === member.id ? (
                                  <div className="flex flex-col gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 w-full max-w-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">Nama</label><input className="text-sm font-black p-2 rounded-lg border border-blue-200 outline-none" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} /></div>
                                      <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">Jabatan</label><input className="text-sm font-black p-2 rounded-lg border border-blue-200 outline-none" value={editingMember.position} onChange={(e) => setEditingMember({...editingMember, position: e.target.value})} /></div>
                                    </div>
                                    <div className="flex flex-col"><label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-1">URL Avatar</label><input className="text-sm font-black p-2 rounded-lg border border-blue-200 outline-none" value={editingMember.avatar} onChange={(e) => setEditingMember({...editingMember, avatar: e.target.value})} /></div>
                                    <div className="flex gap-2"><button onClick={saveEditMember} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2"><Check className="w-3 h-3"/> Simpan</button><button onClick={() => setEditingMember(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase">Batal</button></div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-black text-slate-800 text-lg leading-none truncate">{member.name}</h5>
                                      <button onClick={() => setEditingMember({teamId: team.id, memberId: member.id, name: member.name, position: member.position, avatar: member.avatar})} className="p-1 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                                      <button onClick={() => deleteMember(team.id, member.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
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
                            {Object.keys(PRODUCT_POINTS).map(pKey => (
                              <div key={pKey} className="group/input">
                                <label className="text-[9px] font-black text-slate-300 uppercase block tracking-tighter text-center mb-1">{pKey}</label>
                                <input type="number" min="0" value={((member.weeklyAcquisitions || {})[activeWeek] || {})[pKey] || 0} onChange={(e) => updateAcquisition(team.id, member.id, pKey, e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-black text-center focus:ring-4 focus:ring-[#FDB813]/20 focus:bg-white focus:border-[#FDB813] outline-none transition-all shadow-sm" />
                              </div>
                            ))}
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