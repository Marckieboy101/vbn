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
  Search, Download, Trash2, LogOut, LayoutDashboard, Database, MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';

const COLORS = ['#e11d48', '#fb7185', '#be123c', '#9f1239', '#e11d48', '#4c0519'];

export const AdminDashboard: React.FC = () => {
  const setAdmin = useStore((state) => state.setAdmin);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'sessions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Stats
  const totalUsers = sessions.length;
  const completedSessions = sessions.filter(s => s.completed).length;
  const completionRate = totalUsers > 0 ? ((completedSessions / totalUsers) * 100).toFixed(1) : 0;

  // Genre Data for Chart
  const genreCounts: Record<string, number> = {};
  sessions.forEach(s => {
    (s.genres || []).forEach((g: string) => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const genreData = Object.entries(genreCounts).map(([name, value]) => ({ name, value }));

  // Average Slider Values
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
    value: Math.round(total / sliderCounts[name])
  }));

  const filteredSessions = sessions.filter(s => 
    s.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.genres && s.genres.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col p-6 glass">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.4)]">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl uppercase tracking-tighter">VanBeresteyn <span className="text-brand">Core</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-brand/10 text-brand rounded-xl font-medium border border-brand/20">
            <Activity className="w-5 h-5" /> Analytics
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors">
            <Database className="w-5 h-5" /> Database
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors">
            <MessageSquare className="w-5 h-5" /> AI Logs
          </button>
        </nav>

        <button 
          onClick={() => setAdmin(false)}
          className="mt-auto flex items-center gap-3 px-4 py-3 text-white/40 hover:text-brand transition-colors font-mono text-xs uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" /> Terminate Session
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-black to-zinc-950">
        <header className="flex justify-between items-end mb-12">
          <div>
            <span className="text-brand font-mono text-xs tracking-widest uppercase mb-1 block">Live Feed / Analytics</span>
            <h1 className="text-4xl font-display font-bold uppercase">System <span className="text-brand">Performance</span></h1>
          </div>
          <div className="flex gap-4">
             <div className="glass px-6 py-4 rounded-2xl border-white/5 text-center">
                <span className="block text-white/30 text-[10px] uppercase font-mono tracking-widest">Network Status</span>
                <span className="text-emerald-500 font-bold flex items-center gap-2 justify-center mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> STABLE
                </span>
             </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard icon={<Users />} label="Total Interactions" value={totalUsers} trends="+12%" />
          <StatCard icon={<CheckCircle />} label="Completed Tours" value={completedSessions} trends={`${completionRate}% Rate`} />
          <StatCard icon={<TrendingUp />} label="Avg. Session Time" value="4:22m" trends="Optimized" />
          <StatCard icon={<TrendingUp />} label="AI Recommendations" value={completedSessions} trends="100% Success" />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Genre Popularity */}
          <div className="glass p-8 rounded-[2rem] border-white/5">
            <h3 className="text-xl font-display font-bold uppercase mb-8">Popular <span className="text-brand">Genres</span></h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis stroke="#ffffff40" axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '12px' }}
                    itemStyle={{ color: '#e11d48' }}
                  />
                  <Bar dataKey="value" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Preference Trends */}
          <div className="glass p-8 rounded-[2rem] border-white/5">
            <h3 className="text-xl font-display font-bold uppercase mb-8">Behavioral <span className="text-brand">Trends</span></h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sliderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sliderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {sliderData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs font-mono text-white/40 uppercase">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {d.name.substring(0, 10)}: {d.value}%
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass rounded-[2rem] border-white/5 overflow-hidden">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-xl font-display font-bold uppercase">Session <span className="text-brand">Registry</span></h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text" 
                placeholder="Search Sessions..." 
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-white/30 text-[10px] font-mono uppercase tracking-[0.2em]">
                <tr>
                  <th className="p-6">Session ID</th>
                  <th className="p-6">Timestamp</th>
                  <th className="p-6">Genres</th>
                  <th className="p-6">Status</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6 font-mono text-sm">{session.sessionId}</td>
                    <td className="p-6 text-white/50 text-sm">
                      {new Date(session.timestamp).toLocaleString()}
                    </td>
                    <td className="p-6">
                      <div className="flex gap-1 flex-wrap">
                        {session.genres?.map((g: string) => (
                          <span key={g} className="bg-brand/10 text-brand text-[10px] px-2 py-0.5 rounded-full border border-brand/20 uppercase font-bold">
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={cn(
                        "text-[10px] uppercase font-bold tracking-widest",
                        session.completed ? "text-emerald-500" : "text-amber-500"
                      )}>
                        {session.completed ? 'Completed' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                       <button className="p-2 text-white/20 hover:text-white transition-colors">
                          <Eye className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, trends: string }> = ({ icon, label, value, trends }) => (
  <div className="glass p-8 rounded-[2rem] border-white/5 flex flex-col gap-4">
    <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
      {icon}
    </div>
    <div>
      <span className="text-white/40 text-xs font-mono uppercase tracking-widest">{label}</span>
      <div className="flex items-baseline gap-3">
        <h4 className="text-3xl font-display font-bold mt-1">{value}</h4>
        <span className="text-xs font-mono text-brand font-bold">{trends}</span>
      </div>
    </div>
  </div>
);

function Eye({...props}) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
}
