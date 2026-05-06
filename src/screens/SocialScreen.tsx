import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { InteractiveButton } from '../components/InteractiveButton';
import { Instagram, Twitter, MessageCircle, Youtube, Link as LinkIcon } from 'lucide-react';

const SocialCard: React.FC<{ icon: React.ReactNode, name: string, handle: string, delay: number }> = ({ icon, name, handle, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    className="glass p-8 rounded-3xl flex items-center gap-6 group hover:border-brand/40 transition-all cursor-none"
  >
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div className="text-left">
      <h3 className="text-lg font-display font-bold uppercase">{name}</h3>
      <p className="text-white/40 font-mono text-sm">{handle}</p>
    </div>
  </motion.div>
);

export const SocialScreen: React.FC = () => {
  const setStep = useStore((state) => state.setStep);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 max-w-6xl mx-auto">
      <header className="mb-16 text-center">
        <span className="text-brand font-mono text-sm tracking-[0.4em] uppercase mb-4 block">Neural Network</span>
        <h2 className="text-5xl font-display font-bold uppercase tracking-tight">Join the <span className="text-brand">VanBeresteyn</span> Collective</h2>
        <p className="mt-4 text-white/40 max-w-2xl mx-auto">
          Culture is better shared. Connect with our community of film lovers, creators, and digital explorers.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-16">
        <SocialCard icon={<Instagram />} name="Instagram" handle="@vanberesteyn" delay={0.2} />
        <SocialCard icon={<Youtube />} name="TikTok" handle="@vberesteyn_hub" delay={0.3} />
        <SocialCard icon={<MessageCircle />} name="Discord" handle="VB_Future_Collective" delay={0.4} />
        <SocialCard icon={<Twitter />} name="X / Twitter" handle="@VBeresteyn" delay={0.5} />
      </div>

      <div className="glass p-12 rounded-[3rem] border-white/10 w-full flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div className="text-left">
          <h3 className="text-3xl font-display font-bold uppercase mb-2">Claim your <span className="text-brand">Collector ID</span></h3>
          <p className="text-white/50">Scan the terminal on-site to receive a printed version of your recommendation.</p>
        </div>
        <div className="w-32 h-32 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
          <LinkIcon className="w-12 h-12 text-white/20" />
        </div>
      </div>

      <InteractiveButton
        onClick={() => setStep('final')}
        className="px-16 py-5 glass-red rounded-full"
      >
        <span className="text-xl font-display font-medium uppercase tracking-[0.2em]">Finalize Sequence</span>
      </InteractiveButton>
    </div>
  );
};
