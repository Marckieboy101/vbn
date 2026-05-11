import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { InteractiveButton } from '../components/InteractiveButton';

export const AdminLogin: React.FC = () => {
  const setAdmin = useStore((state) => state.setAdmin);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (username === 'admin' && password === '1234') {
      setAdmin(true);
    } else {
      setError('Ongeldige inloggegevens');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020202] relative overflow-hidden font-sans selection:bg-brand/30">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,80,80,0.02),transparent_70%)]" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full pointer-events-none opacity-40" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full pointer-events-none opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#050505] p-12 rounded-[3.5rem] border border-white/[0.04] shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand/30 to-transparent opacity-50" />
          
          <div className="text-center mb-14">
            <motion.div 
              initial={{ rotate: -10, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-20 h-20 bg-white/[0.02] rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:border-brand/20 transition-colors"
            >
              <Lock className="w-8 h-8 text-white/20 group-hover:text-brand transition-colors" />
            </motion.div>
            <h2 className="text-5xl font-display font-bold uppercase tracking-tighter text-white leading-none">
              CORE <br /><span className="text-brand">ACCESS</span>
            </h2>
            <p className="text-white/20 text-[9px] font-mono mt-5 uppercase tracking-[0.5em] font-black">
              Secure Authentication Node
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-10">
            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">Identity</label>
                <span className="text-[8px] font-mono text-white/10 uppercase">v4.0.12</span>
              </div>
              <div className="relative group/input">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within/input:text-brand transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/[0.01] border border-white/[0.06] rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:border-brand/40 focus:bg-white/[0.02] transition-all font-mono text-xs tracking-wider"
                  placeholder="ID_SEQUENCE"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">Key_Code</label>
                <span className="text-[8px] font-mono text-white/10 uppercase">ENCRYPTED</span>
              </div>
              <div className="relative group/input">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within/input:text-brand transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.01] border border-white/[0.06] rounded-2xl py-5 pl-14 pr-14 focus:outline-none focus:border-brand/40 focus:bg-white/[0.02] transition-all font-mono text-xs tracking-wider"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/10 hover:text-brand transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-brand/5 border border-brand/20 rounded-xl p-4"
              >
                <p className="text-brand text-[9px] font-mono text-center uppercase tracking-[0.2em] font-bold">
                  [AUTH_ERROR]: {error}
                </p>
              </motion.div>
            )}

            <InteractiveButton
              onClick={() => {
                if (loading) return;
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                handleLogin(fakeEvent);
              }}
              disabled={loading}
              className="w-full py-6 bg-brand hover:brightness-110 text-white font-display font-bold uppercase tracking-[0.4em] rounded-[1.5rem] transition-all shadow-[0_15px_40px_rgba(255,80,80,0.25)] border border-white/5 active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'Establish Connection'}
            </InteractiveButton>
          </form>

          <div className="mt-14 flex justify-center border-t border-white/[0.04] pt-10">
            <InteractiveButton 
              onClick={() => window.location.href = '/'}
              className="px-8 py-3 text-white/10 hover:text-white/40 text-[9px] font-mono uppercase tracking-[0.5em] transition-all rounded-full overflow-hidden border border-transparent hover:border-white/[0.05] font-black"
            >
              Verlaat Portaal
            </InteractiveButton>
          </div>
        </div>
        
        <p className="text-center mt-10 text-white/[0.05] font-mono text-[8px] uppercase tracking-[1.5em] font-black">
          ENCRYPTED CLUSTER v2.4.0
        </p>
      </motion.div>
    </div>
  );
};
