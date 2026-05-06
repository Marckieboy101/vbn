import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const setAdmin = useStore((state) => state.setAdmin);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === '1234') {
      setAdmin(true);
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-12 rounded-[2.5rem] w-full max-w-md relative z-10 border-white/5"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand/20">
            <Lock className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-3xl font-display font-bold uppercase tracking-tight">Admin <span className="text-brand">Access</span></h2>
          <p className="text-white/40 text-sm mt-2">Centralized Experience Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-white/50 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand/50 transition-colors"
                placeholder="root_admin"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest text-white/50 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:border-brand/50 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-brand text-xs text-center font-mono">
              [ERROR]: {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full py-5 bg-brand hover:bg-brand-glow text-white font-display font-bold uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_0_30px_rgba(225,29,72,0.3)] hover:shadow-[0_0_50px_rgba(225,29,72,0.5)] active:scale-[0.98]"
          >
            Authenticate
          </button>
        </form>

        <div className="mt-8 text-center">
            <button 
              onClick={() => window.location.href = '/'}
              className="text-white/20 hover:text-white/40 text-[10px] font-mono uppercase tracking-widest transition-colors"
            >
              Return to Experience Floor
            </button>
        </div>
      </motion.div>
    </div>
  );
};
