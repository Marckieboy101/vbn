import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  Users, CheckCircle, Activity, TrendingUp, 
  Search, Download, Trash2, LogOut, LayoutDashboard, Database, MessageSquare, User
} from 'lucide-react';
import { cn } from '../lib/utils';
import { InteractiveButton } from '../components/InteractiveButton';

const COLORS = ['#e11d48', '#fb7185', '#be123c', '#9f1239', '#e11d48', '#4c0519'];

export const AdminDashboard: React.FC = () => {
  const setAdmin = useStore((state) => state.setAdmin);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'database' | 'logs'>('analytics');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const q = query(collection(db, 'sessions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
      setLoading(false);
    });
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

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

  const filteredSessions = sessions.filter(s => 
    (s.sessionId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.genres && s.genres.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#020202] text-[#F9FAFB] flex font-sans overflow-hidden selection:bg-brand/30">
      {/* Sidebar - Enhanced Visuals */}
      <aside className="w-80 border-r border-white/[0.04] flex flex-col p-8 bg-[#050505] z-20 relative">
        <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
        
        <div className="flex items-center gap-4 mb-14">
          <div className="w-12 h-12 bg-gradient-to-br from-brand via-brand to-[#831843] rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(225,29,72,0.3)] ring-1 ring-white/10 group cursor-pointer">
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
                          itemStyle={{ color: '#e11d48' }}
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        />
                        <Bar dataKey="value" fill="#e11d48" radius={[10, 10, 0, 0]} barSize={34} />
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
              <div className="bg-[#050505] border border-white/[0.04] rounded-[3rem] overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
                
                <div className="p-12 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
                  <div>
                    <h3 className="text-3xl font-display font-bold uppercase tracking-tight">Sessie <span className="text-brand">Registry</span></h3>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-mono mt-2 font-bold">Audit Trail & Session Data</p>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-brand transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Zoek id, genre of status..." 
                      className="bg-white/[0.02] border border-white/10 rounded-2xl py-4 pl-14 pr-8 text-sm focus:outline-none focus:border-brand/40 focus:ring-4 focus:ring-brand/5 transition-all min-w-[400px] font-mono"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                             <InteractiveButton className="p-4 bg-white/[0.02] hover:bg-brand/10 rounded-2xl transition-all border border-white/5 inline-flex items-center justify-center group/btn">
                                <Eye className="w-4 h-4 text-white/20 group-hover/btn:text-brand transition-colors" />
                             </InteractiveButton>
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
          </motion.div>
        </div>
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
        ? "bg-brand/10 text-brand ring-1 ring-brand/30 shadow-[0_10px_40px_rgba(225,29,72,0.2)]" 
        : "text-white/20 hover:bg-white/[0.03] hover:text-white/60"
    )}
  >
    {active && (
      <motion.div 
        layoutId="activeNavIndicator" 
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-brand rounded-r-full shadow-[0_0_20px_rgba(225,29,72,0.8)]"
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


function Eye({...props}) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
}
