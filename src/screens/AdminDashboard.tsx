import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Sankey
} from 'recharts';
import { 
  Users, CheckCircle, Activity, TrendingUp, 
  Search, Download, Trash2, LogOut, LayoutDashboard, Database, MessageSquare, User, Eye,
  Cpu, ArrowRight, Server, Globe, ShieldCheck, Play, Sparkles, FileSpreadsheet, Link2, Unlink, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { InteractiveButton } from '../components/InteractiveButton';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { BlueprintTab } from '../components/BlueprintTab';
import { soundManager } from '../lib/sound';
import { 
  loginWithGoogleSheets, 
  logoutGoogleSheets, 
  getCachedToken, 
  getGoogleUser, 
  createSpreadsheet, 
  getSheetFirstTabTitle, 
  writeHeaders, 
  syncSessionsToSpreadsheet,
  SpreadsheetInfo 
} from '../services/googleSheetsService';

const COLORS = ['#FF5050', '#ff7676', '#E63E3E', '#CC2C2C', '#FF5050', '#661021'];

const CustomSankeyNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
  const isDropOff = payload.name.includes('Drop-off');
  const fill = isDropOff ? '#FF505020' : '#FF5050';
  const textAnchor = x > (containerWidth || 800) / 2 ? 'end' : 'start';
  const textX = x > (containerWidth || 800) / 2 ? x - 10 : x + width + 10;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={4}
        ry={4}
        stroke={isDropOff ? "rgba(255, 80, 80, 0.15)" : "rgba(255, 255, 255, 0.15)"}
        strokeWidth={1}
      />
      <text
        x={textX}
        y={y + height / 2 + 4}
        textAnchor={textAnchor}
        fontSize="9"
        fontFamily="JetBrains Mono"
        fill={isDropOff ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.9)"}
        className="font-bold tracking-tight uppercase"
      >
        {payload.name}
      </text>
    </g>
  );
};

const CustomSankeyLink = ({ sourceX, targetX, sourceY, targetY, sy, ty, width, target }: any) => {
  const isDropOff = target?.name?.includes('Drop-off');
  const stroke = isDropOff ? 'rgba(255, 80, 80, 0.05)' : 'rgba(255, 80, 80, 0.22)';
  return (
    <path
      d={`M${sourceX},${sy} C${(sourceX + targetX) / 2},${sy} ${(sourceX + targetX) / 2},${ty} ${targetX},${ty}`}
      fill="none"
      stroke={stroke}
      strokeWidth={Math.max(1.5, width)}
    />
  );
};

export const AdminDashboard: React.FC = () => {
  const setAdmin = useStore((state) => state.setAdmin);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'interrupted'>('all');
  const [activeTab, setActiveTab] = useState<'analytics' | 'database' | 'logs' | 'blueprint'>('analytics');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Auto-refresh state declarations
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Google Sheets state integration
  const [sheetsUser, setSheetsUser] = useState<any>(null);
  const [sheetsToken, setSheetsToken] = useState<string | null>(null);
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<SpreadsheetInfo | null>(() => {
    const saved = localStorage.getItem("vb_spreadsheet");
    return saved ? JSON.parse(saved) : null;
  });
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsMsg, setSheetsMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [manualSheetId, setManualSheetId] = useState('');
  const [syncSteps, setSyncSteps] = useState<{ id: string; label: string; status: 'pending' | 'running' | 'completed' | 'error' }[]>([]);

  useEffect(() => {
    const token = getCachedToken();
    const user = getGoogleUser();
    if (token) setSheetsToken(token);
    if (user) setSheetsUser(user);
  }, []);

  const handleSheetsLogin = async () => {
    setSheetsLoading(true);
    setSyncSteps([]);
    setSheetsMsg({ text: "Verbinding maken met Google...", type: 'info' });
    try {
      const result = await loginWithGoogleSheets();
      if (result) {
        setSheetsUser(result.user);
        setSheetsToken(result.token);
        setSheetsMsg({ text: "Succesvol ingelogd met Google Sheets Toegang!", type: 'success' });
        soundManager.play('SUCCESS', 0.4);
      }
    } catch (err: any) {
      setSheetsMsg({ text: `Inloggen mislukt: ${err.message || err}`, type: 'error' });
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleSheetsLogout = () => {
    logoutGoogleSheets();
    setSheetsUser(null);
    setSheetsToken(null);
    setSyncSteps([]);
    setSheetsMsg({ text: "Sessie ontkoppeld.", type: 'success' });
    soundManager.play('CLICK', 0.3);
  };

  const handleCreateAndSync = async () => {
    if (!sheetsToken) return;
    setSheetsLoading(true);
    
    const initialSteps = [
      { id: 'create', label: "Google Spreadsheet aanmaken", status: 'running' as const },
      { id: 'fetch_meta', label: "Tabbladinformatie ophalen", status: 'pending' as const },
      { id: 'headers', label: "Kolomkoppen initialiseren (A1:I1)", status: 'pending' as const },
      { id: 'data', label: `Sessieregisters synchroniseren (${sessions.length} rijen)`, status: 'pending' as const }
    ];
    setSyncSteps(initialSteps);
    setSheetsMsg({ text: "Nieuwe Spreadsheet aanmaken...", type: 'info' });

    try {
      const spreadsheet = await createSpreadsheet("VanBeresteyn Experience - Sessie Registry");
      setCurrentSpreadsheet(spreadsheet);
      localStorage.setItem("vb_spreadsheet", JSON.stringify(spreadsheet));
      
      setSyncSteps(prev => prev.map(s => s.id === 'create' ? { ...s, status: 'completed' as const } : s.id === 'fetch_meta' ? { ...s, status: 'running' as const } : s));
      setSheetsMsg({ text: "Tabbladinformatie ophalen...", type: 'info' });
      const sheetName = await getSheetFirstTabTitle(spreadsheet.spreadsheetId);
      
      setSyncSteps(prev => prev.map(s => s.id === 'fetch_meta' ? { ...s, status: 'completed' as const } : s.id === 'headers' ? { ...s, status: 'running' as const } : s));
      setSheetsMsg({ text: "Headers wegschrijven...", type: 'info' });
      await writeHeaders(spreadsheet.spreadsheetId, sheetName);
      
      setSyncSteps(prev => prev.map(s => s.id === 'headers' ? { ...s, status: 'completed' as const } : s.id === 'data' ? { ...s, status: 'running' as const } : s));
      setSheetsMsg({ text: "Sessiehulp synchroniseren...", type: 'info' });
      await syncSessionsToSpreadsheet(spreadsheet.spreadsheetId, sheetName, sessions);
      
      setSyncSteps(prev => prev.map(s => s.id === 'data' ? { ...s, status: 'completed' as const } : s));
      setSheetsMsg({ text: "Spreadsheet met succes aangemaakt en gesynchroniseerd!", type: 'success' });
      soundManager.play('SUCCESS', 0.5);
    } catch (err: any) {
      console.error(err);
      setSyncSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' as const } : s));
      setSheetsMsg({ text: `Mislukt: ${err.message || err}`, type: 'error' });
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleLinkExistingAndSync = async () => {
    if (!sheetsToken) return;
    let targetId = manualSheetId.trim();
    if (!targetId) {
      setSheetsMsg({ text: "Voer a.u.b. een Google Sheet ID of URL in.", type: 'error' });
      return;
    }
    
    if (targetId.includes("docs.google.com/spreadsheets")) {
      const match = targetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        targetId = match[1];
      }
    }

    setSheetsLoading(true);
    
    const initialSteps = [
      { id: 'verify', label: "Spreadsheet identificeren en openen", status: 'running' as const },
      { id: 'headers', label: "Kolomkoppen initialiseren (A1:I1)", status: 'pending' as const },
      { id: 'data', label: `Sessieregisters synchroniseren (${sessions.length} rijen)`, status: 'pending' as const }
    ];
    setSyncSteps(initialSteps);
    setSheetsMsg({ text: "Spreadsheet koppelen...", type: 'info' });

    try {
      const sheetName = await getSheetFirstTabTitle(targetId);
      const spreadsheet = {
        spreadsheetId: targetId,
        title: "Gekoppelde Google Sheet",
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetId}/edit`
      };
      
      setCurrentSpreadsheet(spreadsheet);
      localStorage.setItem("vb_spreadsheet", JSON.stringify(spreadsheet));
      
      setSyncSteps(prev => prev.map(s => s.id === 'verify' ? { ...s, status: 'completed' as const } : s.id === 'headers' ? { ...s, status: 'running' as const } : s));
      setSheetsMsg({ text: "Headers herformuleren...", type: 'info' });
      await writeHeaders(targetId, sheetName);
      
      setSyncSteps(prev => prev.map(s => s.id === 'headers' ? { ...s, status: 'completed' as const } : s.id === 'data' ? { ...s, status: 'running' as const } : s));
      setSheetsMsg({ text: "Data streamen naar Sheet...", type: 'info' });
      await syncSessionsToSpreadsheet(targetId, sheetName, sessions);
      
      setSyncSteps(prev => prev.map(s => s.id === 'data' ? { ...s, status: 'completed' as const } : s));
      setSheetsMsg({ text: "Bestaande Sheet succesvol gekoppeld en gesynchroniseerd!", type: 'success' });
      soundManager.play('SUCCESS', 0.5);
      setManualSheetId('');
    } catch (err: any) {
      console.error(err);
      setSyncSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' as const } : s));
      setSheetsMsg({ text: `Koppeling mislukt: ${err.message || err}`, type: 'error' });
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleReSync = async () => {
    if (!sheetsToken || !currentSpreadsheet) return;
    setSheetsLoading(true);

    const initialSteps = [
      { id: 'verify', label: "Tabbladstructuur valideren", status: 'running' as const },
      { id: 'data', label: `Sessiegegevens actualiseren (${sessions.length} rijen)`, status: 'pending' as const }
    ];
    setSyncSteps(initialSteps);
    setSheetsMsg({ text: "Google Sheet registraties actualiseren...", type: 'info' });

    try {
      const sheetName = await getSheetFirstTabTitle(currentSpreadsheet.spreadsheetId);
      
      setSyncSteps(prev => prev.map(s => s.id === 'verify' ? { ...s, status: 'completed' as const } : s.id === 'data' ? { ...s, status: 'running' as const } : s));
      await syncSessionsToSpreadsheet(currentSpreadsheet.spreadsheetId, sheetName, sessions);
      
      setSyncSteps(prev => prev.map(s => s.id === 'data' ? { ...s, status: 'completed' as const } : s));
      setSheetsMsg({ text: "Actualisatie voltooid!", type: 'success' });
      soundManager.play('SUCCESS', 0.5);
    } catch (err: any) {
      console.error(err);
      setSyncSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' as const } : s));
      setSheetsMsg({ text: `Actualisatie mislukt: ${err.message || err}`, type: 'error' });
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleUnlinkSheet = () => {
    setCurrentSpreadsheet(null);
    localStorage.removeItem("vb_spreadsheet");
    setSyncSteps([]);
    setSheetsMsg({ text: "U heeft de koppeling met de spreadsheet verwijderd.", type: 'info' });
    soundManager.play('CLICK', 0.3);
  };

  const fetchSessions = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) setLoading(true);
    setIsRefreshing(true);
    try {
      const q = query(collection(db, 'sessions'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessions(true);
  }, []);

  // System time ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh countdown trigger
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchSessions(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze sessie wilt verwijderen?')) return;
    
    try {
      await deleteDoc(doc(db, 'sessions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${id}`);
    }
  };

  // Stats logic
  const totalUsers = sessions.length;
  const completedSessions = sessions.filter(s => s.completed).length;
  const completionRate = totalUsers > 0 ? ((completedSessions / totalUsers) * 100).toFixed(1) : 0;

  const genreCounts: Record<string, number> = {};
  sessions.forEach(s => {
    (s.genres || []).forEach((g: string) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const genreData = Object.entries(genreCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const sliderTotals: Record<string, number> = {};
  const sliderCounts: Record<string, number> = {};
  sessions.forEach(s => {
    Object.entries(s.answers || {}).forEach(([key, val]) => {
      sliderTotals[key] = (sliderTotals[key] || 0) + (val as number);
      sliderCounts[key] = (sliderCounts[key] || 0) + 1;
    });
  });
  const sliderData = Object.entries(sliderTotals).map(([name, total]) => ({
    name,
    value: Math.round(total / (sliderCounts[name] || 1))
  }));

  const computeSankeyData = () => {
    if (!sessions || sessions.length === 0) {
      return {
        nodes: [
          { name: '1. Landing' },
          { name: '2. Genre Selectie' },
          { name: 'Drop-off (Genre)' },
          { name: '3. Vragenlijst' },
          { name: 'Drop-off (Vragen)' },
          { name: '4. Wrapped' },
          { name: 'Drop-off (Wrapped)' },
          { name: '5. Voice Feedback' },
          { name: 'Drop-off (Voice)' },
          { name: '6. Voltooid' }
        ],
        links: [
          { source: 0, target: 1, value: 85 },
          { source: 0, target: 2, value: 15 },
          { source: 1, target: 3, value: 70 },
          { source: 1, target: 4, value: 15 },
          { source: 3, target: 5, value: 65 },
          { source: 3, target: 6, value: 5 },
          { source: 5, target: 7, value: 50 },
          { source: 5, target: 8, value: 15 },
          { source: 7, target: 9, value: 45 },
          { source: 7, target: 8, value: 5 }
        ]
      };
    }

    const total = sessions.length;
    const hasGenres = sessions.filter(s => s.genres && s.genres.length > 0).length;
    const dropGenre = Math.max(0, total - hasGenres);

    const hasSliders = sessions.filter(s => s.answers && Object.keys(s.answers).length > 0).length;
    const flowToSliders = Math.min(hasGenres, hasSliders);
    const dropSliders = Math.max(0, hasGenres - flowToSliders);

    const hasArchetype = sessions.filter(s => s.archetype || s.archetypeTitle).length;
    const flowToArch = Math.min(flowToSliders, hasArchetype);
    const dropArch = Math.max(0, flowToSliders - flowToArch);

    const hasFeedback = sessions.filter(s => s.voice_feedback || s.voice_feedback_original).length;
    const flowToFeedback = Math.min(flowToArch, hasFeedback);
    const dropFeedback = Math.max(0, flowToArch - flowToFeedback);

    const completed = sessions.filter(s => s.completed).length;
    const flowToCompleted = Math.min(flowToFeedback, completed);
    const dropCompleted = Math.max(0, flowToFeedback - flowToCompleted);

    const nodes = [
      { name: '1. Landing' },               // 0
      { name: '2. Genre Selectie' },       // 1
      { name: 'Drop-off (Genre)' },         // 2
      { name: '3. Vragenlijst' },           // 3
      { name: 'Drop-off (Vragen)' },        // 4
      { name: '4. Wrapped' },               // 5
      { name: 'Drop-off (Wrapped)' },       // 6
      { name: '5. Voice Feedback' },        // 7
      { name: 'Drop-off (Voice)' },         // 8
      { name: '6. Voltooid' }               // 9
    ];

    const links = [];
    
    if (hasGenres > 0) links.push({ source: 0, target: 1, value: hasGenres });
    if (dropGenre > 0) links.push({ source: 0, target: 2, value: dropGenre });
    
    if (flowToSliders > 0) links.push({ source: 1, target: 3, value: flowToSliders });
    if (dropSliders > 0) links.push({ source: 1, target: 4, value: dropSliders });
    
    if (flowToArch > 0) links.push({ source: 3, target: 5, value: flowToArch });
    if (dropArch > 0) links.push({ source: 3, target: 6, value: dropArch });
    
    if (flowToFeedback > 0) links.push({ source: 5, target: 7, value: flowToFeedback });
    if (dropFeedback > 0) links.push({ source: 5, target: 8, value: dropFeedback });
    
    if (flowToCompleted > 0) links.push({ source: 7, target: 9, value: flowToCompleted });
    if (dropCompleted > 0) links.push({ source: 7, target: 8, value: dropCompleted });

    if (links.length === 0) {
      links.push({ source: 0, target: 9, value: 1 });
    }

    return { nodes, links };
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = (s.sessionId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.genres && s.genres.join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && s.completed) ||
      (statusFilter === 'interrupted' && !s.completed);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#020202] text-[#F9FAFB] flex font-sans overflow-hidden selection:bg-brand/30">
      {/* Sidebar - Enhanced Visuals */}
      <aside className="w-80 border-r border-white/[0.04] flex flex-col p-8 bg-[#050505] z-20 relative">
        <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        
        <div className="flex items-center gap-4 mb-14">
          <div className="w-12 h-12 bg-gradient-to-br from-brand via-brand to-[#831843] rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(255,80,80,0.3)] ring-1 ring-white/10 group cursor-pointer">
            <LayoutDashboard className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl uppercase tracking-tighter leading-none">CORE</span>
            <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.4em] mt-1.5 font-bold">VanBeresteyn</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] mb-4 ml-4">Monitor</p>
          <NavButton 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
            icon={<Activity className="w-4 h-4" />} 
            label="Analyses" 
          />
          <NavButton 
            active={activeTab === 'database'} 
            onClick={() => setActiveTab('database')}
            icon={<Database className="w-4 h-4" />} 
            label="Register" 
          />
          <NavButton 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')}
            icon={<MessageSquare className="w-4 h-4" />} 
            label="Systeem Logs" 
          />
          <NavButton 
            active={activeTab === 'blueprint'} 
            onClick={() => setActiveTab('blueprint')}
            icon={<Cpu className="w-4 h-4" />} 
            label="Dev Blueprint" 
          />
        </nav>

        <div className="pt-8 mt-8 border-t border-white/[0.03]">
          <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/[0.04] mb-8 group hover:bg-white/[0.04] transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-emerald-500/80 font-bold">Encrypted Link</span>
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed font-mono">
              [SYSTEM_LOAD]: STABLE<br />
              [LATENCY]: 12ms
            </p>
          </div>

          <InteractiveButton 
            onClick={() => setAdmin(false)}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-white/40 hover:text-brand transition-all rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-brand/5 group"
          >
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] font-bold">
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Sessie Beëindigen
            </div>
          </InteractiveButton>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-h-screen relative bg-[#020202]">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-brand/[0.02] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="p-12 max-w-7xl mx-auto space-y-16">
          <header className="flex justify-between items-end">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-[2px] w-12 bg-gradient-to-r from-brand to-transparent" />
                <span className="text-brand font-mono text-[10px] tracking-[0.4em] uppercase font-black">Cluster Management</span>
              </div>
              <h1 className="text-6xl font-display font-bold uppercase tracking-tight leading-[0.85]">
                Digital <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/30">Intelligence</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
               <div className="flex flex-col items-end gap-1">
                 <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">System Time</span>
                 <span className="text-2xl font-display font-bold text-white tabular-nums">
                   {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                 </span>
               </div>
               <div className="w-[1px] h-12 bg-white/[0.08]" />
               
               {/* Auto-Refresh Control Panel */}
               <div className="bg-white/[0.02] ring-1 ring-white/[0.06] pl-6 pr-4 py-4 rounded-3xl flex items-center gap-4 backdrop-blur-xl">
                 <div className="text-right">
                   <span className="block text-white/20 text-[9px] uppercase font-mono tracking-[0.2em] mb-1">Auto-Refresh</span>
                   <span className="text-white/60 text-[10px] font-bold font-mono tracking-[0.1em] block">
                     {autoRefresh ? `AEST (${countdown}s)` : 'PAUSED'}
                   </span>
                 </div>
                 
                 {/* Sliding toggle pill */}
                 <button
                   onClick={() => {
                     setAutoRefresh(!autoRefresh);
                     if (!autoRefresh) setCountdown(60);
                     soundManager.play('CLICK', 0.2);
                   }}
                   className={cn(
                     "w-10 h-6 rounded-full flex items-center p-1 transition-colors duration-300 relative cursor-pointer",
                     autoRefresh ? "bg-emerald-500" : "bg-white/10"
                   )}
                   title={autoRefresh ? "Pauzeer automatische verversing" : "Activeer automatische verversing"}
                 >
                   <div className={cn(
                     "w-4 h-4 bg-white rounded-full shadow-md transform duration-300 ease-in-out",
                     autoRefresh ? "translate-x-4" : "translate-x-0"
                   )} />
                 </button>

                 {/* Manual Refresh Action */}
                 <button
                   onClick={() => {
                     fetchSessions(false);
                     setCountdown(60);
                     soundManager.play('SUCCESS', 0.3);
                   }}
                   disabled={isRefreshing}
                   className="p-2 hover:bg-white/5 rounded-xl transition-all border border-white/5 text-white/40 hover:text-white flex items-center justify-center cursor-pointer disabled:opacity-30"
                   title="Nu handmatig verversen"
                 >
                   <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-emerald-400")} />
                 </button>
               </div>

               <div className="w-[1px] h-12 bg-white/[0.08]" />
               <div className="bg-white/[0.02] ring-1 ring-white/[0.06] pl-6 pr-4 py-4 rounded-3xl flex items-center gap-6 backdrop-blur-xl">
                 <div className="text-right">
                   <span className="block text-white/20 text-[9px] uppercase font-mono tracking-[0.2em] mb-1">Network</span>
                   <span className="text-emerald-500 text-[10px] font-bold font-mono uppercase tracking-[0.2em] flex items-center justify-end gap-2">
                     Active <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   </span>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center group cursor-help transition-all hover:bg-white/10">
                    <User className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
                 </div>
               </div>
            </div>
          </header>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white/[0.02] p-1.5 rounded-2xl border border-white/[0.04] w-fit">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] font-bold transition-all",
                activeTab === 'analytics' ? "bg-white/10 text-white shadow-lg shadow-black/20" : "text-white/30 hover:text-white/60"
              )}
            >
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('database')}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] font-bold transition-all",
                activeTab === 'database' ? "bg-white/10 text-white shadow-lg shadow-black/20" : "text-white/30 hover:text-white/60"
              )}
            >
              Database
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] font-bold transition-all",
                activeTab === 'logs' ? "bg-white/10 text-white shadow-lg shadow-black/20" : "text-white/30 hover:text-white/60"
              )}
            >
              System Logs
            </button>
            <button 
              onClick={() => setActiveTab('blueprint')}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] font-bold transition-all",
                activeTab === 'blueprint' ? "bg-white/10 text-white shadow-lg shadow-black/20" : "text-white/30 hover:text-white/60"
              )}
            >
              Dev Blueprint
            </button>
          </div>

          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-12"
          >
            {activeTab === 'analytics' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    icon={<Users />} 
                    label="Totaal Sessies" 
                    value={totalUsers} 
                    trend="+12%" 
                    description="Interacties in de laatste 24u" 
                  />
                  <StatCard 
                    icon={<CheckCircle />} 
                    label="Voltooid" 
                    value={completedSessions} 
                    trend={`${completionRate}%`} 
                    description="Conversie naar voltooiing" 
                  />
                  <StatCard 
                    icon={<Activity />} 
                    label="Real-time Load" 
                    value="Low" 
                    trend="Stable" 
                    description="Systeem performantie" 
                  />
                  <StatCard 
                    icon={<TrendingUp />} 
                    label="Core Sync" 
                    value="99.9%" 
                    trend="+0.1%" 
                    description="Database synchronisatie" 
                  />
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <ChartSection title="Gebruikersstroom (Sankey Flow)" subtitle="Sessie conversie en drop-off trechter">
                    <ResponsiveContainer width="100%" height="100%">
                      <Sankey
                        data={computeSankeyData()}
                        node={<CustomSankeyNode />}
                        link={<CustomSankeyLink />}
                        margin={{ top: 20, bottom: 20, left: 10, right: 10 }}
                        nodeWidth={12}
                        nodePadding={24}
                      >
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#050505', 
                            border: '1px solid #ffffff08', 
                            borderRadius: '20px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono'
                          }}
                        />
                      </Sankey>
                    </ResponsiveContainer>
                  </ChartSection>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <ChartSection title="Genre Calibratie" subtitle="Distributie van user interesses">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={genreData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#ffffff10" 
                          axisLine={false} 
                          tickLine={false} 
                          fontSize={9} 
                          tick={{ fill: '#ffffff30' }}
                          dy={12}
                        />
                        <YAxis 
                          stroke="#ffffff10" 
                          axisLine={false} 
                          tickLine={false} 
                          fontSize={9} 
                          tick={{ fill: '#ffffff30' }}
                          dx={-12}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#050505', 
                            border: '1px solid #ffffff08', 
                            borderRadius: '20px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono'
                          }}
                          itemStyle={{ color: '#FF5050' }}
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        />
                        <Bar dataKey="value" fill="#FF5050" radius={[10, 10, 0, 0]} barSize={34} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartSection>

                  <ChartSection title="Mood Signatures" subtitle="Gedrags-DNA over alle sessies">
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={sliderData}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={105}
                              paddingAngle={6}
                              dataKey="value"
                              stroke="none"
                            >
                              {sliderData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#050505', border: '1px solid #ffffff08', borderRadius: '20px' }}
                              itemStyle={{ color: '#fff' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-x-10 gap-y-4 mt-8 pb-4">
                        {sliderData.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between group cursor-default">
                            <div className="flex items-center gap-3">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.1)] transition-transform group-hover:scale-125" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-[10px] font-mono text-white/30 uppercase group-hover:text-white/50 transition-colors tracking-widest">{d.name}</span>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-white/60">{d.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartSection>
                </div>
              </>
            )}

            {activeTab === 'database' && (
              <div className="space-y-8">
                {/* Google Sheets Connection and Sync Terminal */}
                <div className="bg-[#050505] border border-white/[0.04] rounded-[3rem] p-10 relative overflow-hidden shadow-2xl group">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#34A853]/50 to-transparent" />
                  
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-display font-bold uppercase tracking-tight">Google Sheets <span className="text-[#34A853]">Live Sync</span></h3>
                          <span className={cn(
                            "text-[8px] font-mono px-3 py-1 rounded-full font-black tracking-widest",
                            sheetsToken ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/30"
                          )}>
                            {sheetsToken ? "ONLINE" : "STAND-BY"}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 leading-relaxed max-w-2xl">
                          Exporteer en synchroniseer alle sessieregisters rechtstreeks met Google Sheets. U kunt een nieuwe spreadsheet maken of een bestaand id koppelen. De spreadsheet update direct met gecorrigeerde kolommen en percentages.
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-wrap gap-4">
                      {!sheetsToken ? (
                        <InteractiveButton
                          onClick={handleSheetsLogin}
                          disabled={sheetsLoading}
                          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-display font-bold uppercase tracking-wider text-[10px] rounded-2xl shadow-[0_10px_35px_rgba(52,168,83,0.2)] transition-all flex items-center gap-3"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.136 4.113-3.41 0-6.173-2.77-6.173-6.18s2.763-6.18 6.173-6.18c1.554 0 2.964.577 4.05 1.52l3.1-3.1C19.14 1.838 16.034 1 12.24 1 5.922 1 1 5.93 1 12.2s4.922 11.2 11.24 11.2c5.894 0 10.638-4.113 10.638-10.285 0-.648-.052-1.217-.156-1.83H12.24z"/>
                          </svg>
                          Connect Google Service
                        </InteractiveButton>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] text-white/20 uppercase font-mono tracking-wider">Geautoriseerd</p>
                            <p className="text-xs font-mono text-white/60 font-medium">{sheetsUser?.email}</p>
                          </div>
                          <div title="Machtiging Verwijderen">
                            <InteractiveButton
                              onClick={handleSheetsLogout}
                              className="p-4 bg-white/[0.02] hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-2xl transition-all border border-white/5"
                            >
                              <Unlink className="w-4 h-4" />
                            </InteractiveButton>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {sheetsToken && (
                    <div className="mt-10 pt-10 border-t border-white/[0.04] grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Left: Spreadsheet Control */}
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] font-bold">Actieve Spreadsheet Koppeling</h4>
                        
                        {currentSpreadsheet ? (
                          <div className="bg-white/5 border border-white/[0.04] p-6 rounded-2xl space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-mono text-emerald-400 font-bold mb-1">{currentSpreadsheet.title}</p>
                                <p className="text-[9px] font-mono text-white/20 truncate max-w-sm">ID: {currentSpreadsheet.spreadsheetId}</p>
                              </div>
                              <div className="flex gap-2">
                                <a 
                                  href={currentSpreadsheet.spreadsheetUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="p-3 bg-white/[0.02] hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 rounded-xl transition-all border border-white/5 flex items-center justify-center"
                                  title="Open in Nieuw Tabblad"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </a>
                                <button 
                                  onClick={handleUnlinkSheet}
                                  className="p-3 bg-white/[0.02] hover:bg-red-500/10 text-white/30 hover:text-red-400 rounded-xl transition-all border border-white/5 flex items-center justify-center"
                                  title="Koppeling Ongedaan Maken"
                                >
                                  <Unlink className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <InteractiveButton
                              onClick={handleReSync}
                              disabled={sheetsLoading}
                              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 font-bold"
                            >
                              <RefreshCw className={cn("w-4 h-4 text-emerald-400", sheetsLoading && "animate-spin")} />
                              Synchroniseer Registry ({sessions.length})
                            </InteractiveButton>
                          </div>
                        ) : (
                          <div className="bg-white/[0.02] border border-dashed border-white/5 p-8 rounded-2xl text-center space-y-6">
                            <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Nog geen spreadsheet gekoppeld</p>
                            <InteractiveButton
                              onClick={handleCreateAndSync}
                              disabled={sheetsLoading}
                              className="px-6 py-4 bg-[#34A853]/10 hover:bg-[#34A853]/20 border border-[#34A853]/30 text-[#34A853] font-display font-medium uppercase tracking-wider text-[10px] rounded-xl transition-all w-full flex items-center justify-center gap-2"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              Maak Nieuwe Google Sheet met Data
                            </InteractiveButton>
                          </div>
                        )}
                      </div>

                      {/* Right: Connect Pre-existing Sheet */}
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] font-bold font-black">Bestaand Spreadsheet ID Koppelen</h4>
                        
                        <div className="bg-white/5 border border-white/[0.04] p-6 rounded-2xl space-y-4">
                          <p className="text-[9px] font-mono text-white/30 leading-relaxed uppercase">
                            Heeft u al een spreadsheet? Plak hier de Google Sheets URL of het ID van de spreadsheet en koppel deze.
                          </p>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={manualSheetId}
                              onChange={(e) => setManualSheetId(e.target.value)}
                              placeholder="ID of complete URL"
                              disabled={sheetsLoading}
                              className="flex-1 bg-white/[0.01] border border-white/10 rounded-xl px-4 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/40"
                            />
                            <InteractiveButton
                              onClick={handleLinkExistingAndSync}
                              disabled={sheetsLoading || !manualSheetId.trim()}
                              className="px-5 py-3 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 text-white/60 text-[10px] font-mono uppercase tracking-widest rounded-xl transition-all border border-white/10 font-bold flex items-center gap-2 shrink-0 disabled:opacity-30"
                            >
                              <Link2 className="w-4 h-4" />
                              Koppel Sheet
                            </InteractiveButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback Message Bar */}
                  {sheetsMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "mt-8 p-6 rounded-2xl border space-y-4",
                        sheetsMsg.type === "success" && "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
                        sheetsMsg.type === "error" && "bg-brand/5 border-brand/20 text-brand",
                        sheetsMsg.type === "info" && "bg-white/5 border-white/10 text-white/70"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          sheetsMsg.type === "success" && "bg-emerald-400 animate-pulse",
                          sheetsMsg.type === "error" && "bg-red-400",
                          sheetsMsg.type === "info" && "bg-blue-400 animate-ping"
                        )} />
                        <span className="text-[10px] font-mono uppercase tracking-wider">{sheetsMsg.text}</span>
                      </div>

                      {syncSteps.length > 0 && (
                        <div className="border-t border-white/[0.04] pt-4 space-y-3">
                          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 font-bold">Synchronisatie Voortgangstaken</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {syncSteps.map((step) => (
                              <div 
                                key={step.id} 
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl transition-all border duration-300",
                                  step.status === "completed" && "bg-emerald-500/[0.02] border-emerald-500/10 text-emerald-400/80",
                                  step.status === "running" && "bg-white/[0.02] border-white/10 text-white font-medium",
                                  step.status === "pending" && "bg-transparent border-transparent text-white/20",
                                  step.status === "error" && "bg-red-500/[0.02] border-red-500/15 text-red-400"
                                )}
                              >
                                {step.status === "completed" && (
                                  <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {step.status === "running" && (
                                  <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin shrink-0" />
                                )}
                                {step.status === "pending" && (
                                  <div className="w-3 h-3 rounded-full border-2 border-white/10 shrink-0" />
                                )}
                                {step.status === "error" && (
                                  <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                                <span className="text-[10px] font-mono tracking-tight">{step.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="bg-[#050505] border border-white/[0.04] rounded-[3rem] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
                
                <div className="p-12 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
                  <div>
                    <h3 className="text-3xl font-display font-bold uppercase tracking-tight">Sessie <span className="text-brand">Registry</span></h3>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-mono mt-2 font-bold">Audit Trail & Session Data</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex bg-white/[0.02] p-1 rounded-xl border border-white/5">
                      {(['all', 'completed', 'interrupted'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all",
                            statusFilter === status ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <div className="relative group">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-brand transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Zoek id, genre..." 
                        className="bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-14 pr-8 text-sm focus:outline-none focus:border-brand/40 focus:ring-4 focus:ring-brand/5 transition-all min-w-[300px] font-mono"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/[0.01] text-white/20 text-[9px] font-mono uppercase tracking-[0.4em]">
                      <tr>
                        <th className="px-12 py-8 border-b border-white/[0.04]">UID_SEQUENCE</th>
                        <th className="px-12 py-8 border-b border-white/[0.04]">GENRE_PROFILE</th>
                        <th className="px-12 py-8 border-b border-white/[0.04]">SLIDER_CALIBRATION</th>
                        <th className="px-12 py-8 border-b border-white/[0.04] text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {filteredSessions.map((session, idx) => (
                        <tr key={session.id} className="hover:bg-white/[0.03] transition-all group even:bg-white/[0.005]">
                          <td className="px-12 py-7">
                            <span className="font-mono text-[11px] text-white/50 bg-white/[0.04] px-3 py-2 rounded-xl border border-white/[0.05] tracking-tighter">
                              {session.sessionId}
                            </span>
                            <p className="text-[9px] text-white/20 font-mono mt-2 tracking-widest uppercase">
                              {new Date(session.timestamp).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })} • {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-12 py-7">
                            <div className="flex gap-2 flex-wrap max-w-[200px]">
                              {session.genres?.map((g: string) => (
                                <span key={g} className="bg-brand/[0.03] text-brand text-[9px] px-2.5 py-1.5 rounded-lg border border-brand/10 uppercase font-black tracking-widest transition-colors hover:bg-brand/10 cursor-default">
                                  {g}
                                </span>
                              ))}
                              {(!session.genres || session.genres.length === 0) && (
                                <span className="text-[9px] text-white/10 uppercase font-mono italic tracking-widest">UNCALIBRATED</span>
                              )}
                            </div>
                          </td>
                          <td className="px-12 py-7">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-[350px]">
                              {Object.entries(session.answers || {}).map(([key, val]: [string, any]) => (
                                <div key={key} className="flex justify-between items-center gap-3 bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
                                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-tighter">{key}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                      <div className="h-full bg-brand" style={{ width: `${val}%` }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-brand font-bold tabular-nums">{val}%</span>
                                  </div>
                                </div>
                              ))}
                              {Object.keys(session.answers || {}).length === 0 && (
                                <span className="text-[9px] text-white/10 uppercase font-mono italic tracking-widest">NO_PREF_DATA</span>
                              )}
                            </div>
                          </td>
                          <td className="px-12 py-7 text-right">
                             <div className="flex justify-end gap-2">
                               <InteractiveButton 
                                 onClick={() => setSelectedSession(session)}
                                 className="p-4 bg-white/[0.02] hover:bg-brand/10 rounded-2xl transition-all border border-white/5 inline-flex items-center justify-center group/btn"
                               >
                                  <Eye className="w-4 h-4 text-white/20 group-hover/btn:text-brand transition-colors" />
                               </InteractiveButton>
                               <InteractiveButton 
                                 onClick={() => { handleDeleteSession(session.id); }}
                                 className="p-4 bg-white/[0.02] hover:bg-red-500/10 rounded-2xl transition-all border border-white/5 inline-flex items-center justify-center group/btn"
                               >
                                  <Trash2 className="w-4 h-4 text-white/20 group-hover/btn:text-red-500 transition-colors" />
                               </InteractiveButton>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredSessions.length === 0 && (
                    <div className="py-32 text-center">
                      <Search className="w-16 h-16 text-white/5 mx-auto mb-6" />
                      <p className="text-white/10 font-mono text-xs uppercase tracking-[0.5em]">No synchronization targets found</p>
                    </div>
                  )}
                </div>
                
                <div className="p-10 bg-white/[0.01] border-t border-white/[0.04] flex justify-between items-center text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">
                  <div className="flex gap-8">
                    <span>Active Clusters: 04</span>
                    <span>Database Load: 0.12%</span>
                  </div>
                  <span>SESSION_MAP_v4.0.12</span>
                </div>
              </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-[#050505] border border-white/[0.04] rounded-[2.5rem] p-10 font-mono text-[11px] leading-relaxed relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/[0.04]">
                  <span className="text-brand font-bold uppercase tracking-[0.3em]">System_Runtime_Logs</span>
                  <div className="flex items-center gap-4 text-white/20">
                    <span className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> STABLE
                    </span>
                    <span className="text-white/10">|</span>
                    <span>v2.4.0-CORE</span>
                  </div>
                </div>
                <div className="space-y-3 h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                  {sessions.slice(0, 50).map((s, i) => (
                    <div key={i} className="flex gap-6 group hover:bg-white/[0.02] p-2 rounded-lg transition-colors">
                      <span className="text-white/10 w-44 shrink-0">[{new Date(s.timestamp).toISOString()}]</span>
                      <span className="text-brand/50 shrink-0 uppercase">[SESSION_SYNC]</span>
                      <span className="text-white/40 truncate">
                        Synchronized session <span className="text-white/70 italic">{s.sessionId}</span> | Genres: {s.genres?.join(', ') || 'NONE'} | Status: {s.completed ? 'SUCCESS' : 'INTERRUPTED'}
                      </span>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-white/10 italic py-10 uppercase tracking-[0.2em] text-center">
                      Waiting for incoming data stream...
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'blueprint' && (
              <BlueprintTab />
            )}
          </motion.div>
        </div>

        {/* Detail Modal */}
        {selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedSession(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-2xl bg-[#050505] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand to-transparent" />
              
              <div className="p-12">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h3 className="text-3xl font-display font-bold uppercase tracking-tight mb-2">Sessie <span className="text-brand">Details</span></h3>
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.4em] font-bold">UID: {selectedSession.sessionId}</p>
                  </div>
                  <InteractiveButton 
                    onClick={() => setSelectedSession(null)}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
                  >
                    Sluiten
                  </InteractiveButton>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Geselecteerde Genres</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.genres?.map((g: string) => (
                        <span key={g} className="bg-brand/10 text-brand text-[10px] px-4 py-2 rounded-xl border border-brand/20 uppercase font-black tracking-widest">
                          {g}
                        </span>
                      ))}
                      {(!selectedSession.genres || selectedSession.genres.length === 0) && (
                        <span className="text-white/10 italic">Geen genres geselecteerd</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Slider Antwoorden</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(selectedSession.answers || {}).map(([key, val]: [string, any]) => (
                        <div key={key} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center">
                          <span className="text-[11px] font-mono text-white/40 uppercase">{key}</span>
                          <span className="text-brand font-bold font-mono">{val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex justify-between items-center">
                    <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                      Tijdstip: {new Date(selectedSession.timestamp).toLocaleString('nl-NL')}
                    </div>
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-[0.2em] font-bold",
                      selectedSession.completed ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                    )}>
                      {selectedSession.completed ? 'Voltooid' : 'Onderbroken'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active?: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all duration-500 group relative overflow-hidden",
      active 
        ? "bg-brand/10 text-brand ring-1 ring-brand/30 shadow-[0_10px_40px_rgba(255,80,80,0.2)]" 
        : "text-white/20 hover:bg-white/[0.03] hover:text-white/60"
    )}
  >
    {active && (
      <motion.div 
        layoutId="activeNavIndicator" 
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-brand rounded-r-full shadow-[0_0_20px_rgba(255,80,80,0.8)]"
      />
    )}
    <div className={cn(
      "transition-all duration-500 shrink-0",
      active ? "text-brand scale-110" : "text-white/10 group-hover:text-white/30 group-hover:scale-110"
    )}>
      {icon}
    </div>
    <span className="font-display font-medium text-xs uppercase tracking-[0.2em]">
      {label}
    </span>
  </button>
);

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, trend: string, description: string }> = ({ icon, label, value, trend, description }) => (
  <div className="bg-[#050505] border border-white/[0.04] p-10 rounded-[3rem] flex flex-col gap-10 hover:border-white/[0.1] transition-all group relative overflow-hidden shadow-sm">
    <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-all group-hover:scale-110">
      {React.cloneElement(icon as React.ReactElement<any>, { className: "w-24 h-24" })}
    </div>
    
    <div className="w-14 h-14 bg-white/[0.02] rounded-2xl flex items-center justify-center text-white/20 border border-white/[0.05] shadow-inner group-hover:text-brand group-hover:border-brand/20 transition-all">
      {icon}
    </div>
    
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <span className="text-white/20 text-[10px] font-mono uppercase tracking-[0.3em] font-bold">{label}</span>
        <span className={cn(
          "text-[9px] font-mono font-black px-2.5 py-1 rounded-full shadow-sm tracking-wider",
          trend.startsWith('+') ? "text-emerald-500 bg-emerald-500/10" : "text-white/40 bg-white/5"
        )}>{trend}</span>
      </div>
      <h4 className="text-5xl font-display font-bold leading-none tracking-tight">{value}</h4>
      <div className="flex items-center gap-2 pt-2">
        <div className="w-1 h-1 rounded-full bg-brand" />
        <p className="text-[9px] text-white/20 leading-tight font-mono uppercase tracking-[0.1em]">{description}</p>
      </div>
    </div>
  </div>
);

const ChartSection: React.FC<{ title: string, subtitle: string, children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-[#050505] border border-white/[0.04] p-12 rounded-[3.5rem] backdrop-blur-3xl relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
    <div className="mb-14">
      <h3 className="text-3xl font-display font-bold uppercase tracking-tight leading-none mb-3">{title}</h3>
      <p className="text-[10px] text-white/20 uppercase font-mono tracking-[0.4em] font-bold">{subtitle}</p>
    </div>
    <div className="h-80 relative">
      {children}
    </div>
  </div>
);



