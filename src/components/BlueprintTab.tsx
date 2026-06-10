import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, ArrowRight, Server, Globe, ShieldCheck, Play, Sparkles, Database,
  Sliders, Terminal, Info, Code, Map, CheckCircle2, RefreshCw, Send, AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { InteractiveButton } from './InteractiveButton';

// Copyable Code snippets for reference in UI
const CODE_SNIPPETS = {
  frontend_sync: `// Website 1 (Frontend) - Local state sync with Google Sheets
import { loadSessionFromLocalStorage } from '../lib/sessionStorage';
import { GoogleSheetsSync } from '../services/googleSheetsService';

export async function syncSession(sessionId, sessionData) {
  localStorage.setItem('activeSession', JSON.stringify(sessionData));
  await GoogleSheetsSync.writeSession(sessionId, sessionData);
}

export function listenToSessionUpdates(onUpdated) {
  const payload = loadSessionFromLocalStorage();
  if (payload) {
    onUpdated(payload);
  }
  // Optionally poll or refresh from Sheets if needed.
}
`,
  backend_endpoint: `// Website 2 (Backend) - Fast Update & AI triggers Express route
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { updateGoogleSheet } from './googleSheetsService';

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/sessions/:id/recalibrate', async (req, res) => {
  const { id } = req.params;
  const { sliderValues } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: \`Categorize rating: \${JSON.stringify(sliderValues)}\`
    });

    const archetype = response.text || 'Cosmic Visionary';

    await updateGoogleSheet(id, { sliderValues, archetype, updatedAt: Date.now() });
    res.json({ status: 'success', archetype });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`,
  security_rules: `// Google Sheets & OAuth access guidance
# Use OAuth 2.0 scopes to restrict access to the target spreadsheet
# Only the signed-in user or service account should have write permissions.
# Avoid exposing full drive access by limiting scopes to sheets.readonly or sheets.
`
};

export const BlueprintTab: React.FC = () => {
  // Sim parameters
  const [slider1, setSlider1] = useState(50);
  const [slider2, setSlider2] = useState(30);
  const [simLogs, setSimLogs] = useState<Array<{ id: string; time: string; msg: string; type: 'info' | 'success' | 'warn' | 'ai' }>>([
    { id: '1', time: 'SYSTEM START', msg: 'Real-time pipeline listener established on localhost:3000.', type: 'info' }
  ]);
  const [simulating, setSimulating] = useState(false);
  const [latency, setLatency] = useState(0);
  const [archetypeResult, setArchetypeResult] = useState<string>("Verbinding status: Stand-by");

  // Code visualizer state
  const [activeSnippet, setActiveSnippet] = useState<keyof typeof CODE_SNIPPETS>('frontend_sync');
  const [copied, setCopied] = useState(false);

  // General tab states
  const [viewMode, setViewMode] = useState<'simulator' | 'diagram' | 'code' | 'roadmap'>('simulator');

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'ai') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(Date.now() % 1000).padStart(3, '0');
    setSimLogs(prev => [
      { id: Math.random().toString(), time: timestamp, msg, type },
      ...prev.slice(0, 15) // Keep last 15
    ]);
  };

  const handleSimulateSync = async () => {
    if (simulating) return;
    setSimulating(true);
    setLatency(0);
    setArchetypeResult("Gegevens worden overgedragen...");
    
    const startTime = Date.now();
    addLog(`[WEBSITE 1] User changed input: Saturation=${slider1}%, Vibe=${slider2}%`, 'info');
    
    // Step 1: Push user input
    await new Promise(r => setTimeout(r, 120));
    addLog(`[WS OUT] Streamed package to shared DB context (sessions/SIM_SESSION_99)`, 'success');
    
    // Step 2: Database triggers backend snapshot
    await new Promise(r => setTimeout(r, 80));
    addLog(`[WEBSITE 2] Database snapshot listener in Website 2 caught payload: { slider1: ${slider1}, slider2: ${slider2} }`, 'info');
    
    // Step 3: Trigger backend processing & simulator logic
    await new Promise(r => setTimeout(r, 150));
    const score = slider1 + slider2;
    let archetype = "Futuristisch Geluidssysteem";
    if (score > 140) archetype = "Neo-Synth Audioguide Gids";
    else if (score < 60) archetype = "Ambience Rustzoeker Element";
    
    addLog(`[AI PROCESSOR] Gemini Analyser suggests brand archetype based on calibration: "${archetype}"`, 'ai');
    
    // Step 4: Write back & Sync downstream
    await new Promise(r => setTimeout(r, 100));
    addLog(`[WS IN] Database successfully updated on document node sessions/SIM_SESSION_99`, 'success');
    
    // Step 5: Web 1 receives live update
    await new Promise(r => setTimeout(r, 70));
    const totalLatency = Date.now() - startTime;
    setLatency(totalLatency);
    setArchetypeResult(archetype);
    addLog(`[WEBSITE 1] Instant view calibration executed. Synced in ${totalLatency}ms.`, 'success');
    
    setSimulating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12">
      {/* Banner introduction card */}
      <div className="relative bg-gradient-to-r from-brand/10 to-[#831843]/5 border border-white/10 rounded-[2.5rem] p-12 overflow-hidden group">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand/10 blur-[130px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 max-w-2xl">
            <span className="text-brand font-mono text-[9px] tracking-[0.4em] uppercase font-black bg-brand/10 px-4 py-1.5 rounded-full border border-brand/20">Development blueprints</span>
            <h2 className="text-4xl font-display font-bold uppercase tracking-tight text-white leading-tight">
              Gekoppelde Real-Time <span className="text-brand">Architectuur</span>
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Hieronder vind je de interactieve blueprints, codevoorbeelden en een live real-time simulator die laat zien hoe 
              **Website 1 (User Experience)** en **Website 2 (Dashboard & AI Processing)** als één vloeiend, ultrasnel systeem met elkaar communiceren.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a 
              href="#sim-box" 
              onClick={() => setViewMode('simulator')}
              className="px-6 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono uppercase tracking-widest font-bold text-white transition-all"
            >
              Start Simulator
            </a>
          </div>
        </div>
      </div>

      {/* Internal Navigation & Viewport Toggle */}
      <div className="flex flex-wrap gap-2 bg-white/[0.02] p-1.5 rounded-2xl border border-white/[0.04] w-fit">
        <button 
          onClick={() => setViewMode('simulator')}
          className={cn(
            "px-6 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] font-bold transition-all",
            viewMode === 'simulator' ? "bg-white/10 text-brand font-black" : "text-white/40 hover:text-white/70"
          )}
        >
          🔍 LIVE Sync Simulator
        </button>
        <button 
          onClick={() => setViewMode('diagram')}
          className={cn(
            "px-6 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] font-bold transition-all",
            viewMode === 'diagram' ? "bg-white/10 text-brand font-black" : "text-white/40 hover:text-white/70"
          )}
        >
          🗺️ Netwerk Blueprint
        </button>
        <button 
          onClick={() => setViewMode('code')}
          className={cn(
            "px-6 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] font-bold transition-all",
            viewMode === 'code' ? "bg-white/10 text-brand font-black" : "text-white/40 hover:text-white/70"
          )}
        >
          💻 Code Snippets
        </button>
        <button 
          onClick={() => setViewMode('roadmap')}
          className={cn(
            "px-6 py-3 rounded-xl text-[10px] font-mono uppercase tracking-[0.2em] font-bold transition-all",
            viewMode === 'roadmap' ? "bg-white/10 text-brand font-black" : "text-white/40 hover:text-white/70"
          )}
        >
          📋 Roadmap & Checklist
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
        >
          {viewMode === 'simulator' && (
            <div id="sim-box" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Side: Controller / User UI Simulator */}
              <div className="lg:col-span-5 bg-[#050505] border border-white/[0.04] rounded-[2.5rem] p-8 flex flex-col justify-between relative">
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-white/[0.05]">
                    <div>
                      <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">WEBSITE 1</span>
                      <h3 className="text-xl font-display font-semibold uppercase text-white">Interactieve Slider</h3>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  </div>

                  <p className="text-white/40 text-xs leading-relaxed">
                    Sleep aan onderstaande waarden om een gebruiker te simuleren die live parameters kalibreert op het hoofdflowpaneel.
                  </p>

                  <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono text-white/65">
                        <span>Frequentie Calibratie</span>
                        <span className="text-brand font-bold">{slider1}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={slider1} 
                        onChange={(e) => setSlider1(Number(e.target.value))}
                        className="w-full accent-brand bg-white/5 h-1.5 rounded-lg cursor-pointer"
                        disabled={simulating}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono text-white/65">
                        <span>Vibe Intensiteit</span>
                        <span className="text-brand font-bold">{slider2}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={slider2} 
                        onChange={(e) => setSlider2(Number(e.target.value))}
                        className="w-full accent-brand bg-white/5 h-1.5 rounded-lg cursor-pointer"
                        disabled={simulating}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-10 mt-10 border-t border-white/[0.05] space-y-4">
                  <InteractiveButton 
                    onClick={handleSimulateSync}
                    className="w-full py-4 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/20 hover:border-brand/40 rounded-xl font-mono uppercase tracking-widest text-xs font-black flex items-center justify-center gap-3 transition-all"
                  >
                    <Play className="w-4 h-4 shrink-0" /> {simulating ? "Versturen..." : "Start Sync Verzoek"}
                  </InteractiveButton>

                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex gap-3 items-center">
                    <Sparkles className="w-5 h-5 text-brand shrink-0" />
                    <div>
                      <span className="block text-[8px] font-mono text-white/20 uppercase tracking-widest">Feedback Archetype (WEBSITE 1)</span>
                      <span className="text-[11px] font-mono font-bold text-white/80">{archetypeResult}</span>
                      {latency > 0 && <span className="text-[9px] text-emerald-500 font-mono ml-3 font-bold">({latency}ms)</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Connection Indicator */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/[0.03] rounded-3xl">
                <div className="h-full flex flex-col items-center justify-center gap-4 py-8">
                  <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Gateway</span>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-black">
                      <Cpu className={cn("w-5 h-5 text-white/40", simulating && "animate-spin text-brand")} />
                    </div>
                    {simulating && (
                      <span className="absolute inset-0 rounded-full bg-brand/20 animate-ping" />
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/20 rotate-90 lg:rotate-0" />
                  <span className="text-[9px] font-mono text-emerald-500/80 uppercase font-black tracking-widest">Sheet Sync</span>
                </div>
              </div>

              {/* Right Side: Shared Database & Backend Observer Console */}
              <div className="lg:col-span-5 bg-[#050505] border border-white/[0.04] rounded-[2.5rem] p-8 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-4 border-b border-white/[0.05] mb-6">
                    <div>
                      <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">WEBSITE 2 (Cloud Workspace)</span>
                      <h3 className="text-xl font-display font-semibold uppercase text-white">Real-Time Sync Logs</h3>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <p className="text-white/40 text-xs leading-relaxed mb-4 font-sans">
                    Actuele overdracht monitoring. Elke actie van Website 1 wordt opgeslagen in lokale sessie-opslaan en gesynchroniseerd met Google Sheets.
                  </p>

                  <div className="bg-black border border-white/[0.05] rounded-2xl p-4 h-64 overflow-y-auto font-mono text-[10px] space-y-3 pr-2 scrollbar-thin">
                    {simLogs.map((log) => (
                      <div key={log.id} className="border-b border-white/[0.02] pb-2 last:border-0">
                        <div className="flex justify-between items-center opacity-40 mb-1">
                          <span>{log.time}</span>
                          <span className={cn(
                            "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase",
                            log.type === 'success' ? "bg-emerald-500/10 text-emerald-400" :
                            log.type === 'warn' ? "bg-amber-500/10 text-amber-400" :
                            log.type === 'ai' ? "bg-brand/10 text-brand" : "bg-white/10 text-white/60"
                          )}>
                            {log.type}
                          </span>
                        </div>
                        <p className={cn(
                          "leading-relaxed",
                          log.type === 'success' && "text-emerald-400",
                          log.type === 'ai' && "text-red-400",
                          log.type === 'warn' && "text-amber-400 font-bold",
                          log.type === 'info' && "text-white/80"
                        )}>
                          {log.msg}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.05] flex justify-between items-center text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
                  <span>Status: VERBONDEN</span>
                  <span>Port: HTTPS/443</span>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'diagram' && (
            <div className="bg-[#050505] border border-white/[0.04] rounded-[2.5rem] p-10 space-y-10">
              <div className="border-b border-white/[0.05] pb-6">
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mb-2">Netwerk Architectuur Kaart</h3>
                <p className="text-white/40 text-xs font-mono uppercase tracking-[0.2em]">Visualisatie van end-to-end signalen</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {/* Web 1 */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-8 relative flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold uppercase text-white font-display">Website 1: Experience</h4>
                  <ul className="space-y-2 text-xs text-white/50 font-mono">
                    <li>• React Client SPA</li>
                    <li>• Direct data streaming (listeners)</li>
                    <li>• Zustand State Machine</li>
                    <li>• Volledig offline-friendly</li>
                  </ul>
                  <div className="text-[10px] font-mono text-brand font-black tracking-widest mt-4">
                    EMITS INPUTS ➔
                  </div>
                </div>

                {/* Google Sheets Sync Layer */}
                <div className="bg-[#0b0c10] border border-brand/20 rounded-3xl p-8 relative flex flex-col gap-4 ring-2 ring-brand/10">
                  <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center text-white">
                    <Database className="w-5 h-5 text-brand" />
                  </div>
                  <h4 className="text-lg font-bold uppercase text-white font-display">Google Sheets Sync</h4>
                  <ul className="space-y-2 text-xs text-white/50 font-mono">
                    <li>• Central session spreadsheet</li>
                    <li>• Sheet-based data pipe</li>
                    <li>• OAuth-backed access control</li>
                    <li>• Row/column session records</li>
                  </ul>
                  <div className="text-[10px] font-mono text-emerald-500 font-black tracking-widest mt-4 uppercase">
                    👥 STREAMS UPDATES TO BOTH
                  </div>
                </div>

                {/* Web 2 */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-8 relative flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
                    <Server className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-bold uppercase text-white font-display">Website 2 / AI Engine</h4>
                  <ul className="space-y-2 text-xs text-white/50 font-mono">
                    <li>• Backend Dashboard / Portal</li>
                    <li>• Gemini LLM Processors</li>
                    <li>• Express Endpoint Gateway</li>
                    <li>• Node.js Admin Core</li>
                  </ul>
                  <div className="text-[10px] font-mono text-white/40 font-black tracking-widest mt-4">
                    ➔ MUTATES & BROADCASTS RESULTS
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'code' && (
            <div className="bg-[#050505] border border-white/[0.04] rounded-[2.5rem] overflow-hidden">
              <div className="p-8 border-b border-white/[0.05] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
                <div>
                  <h3 className="text-xl font-display font-bold uppercase text-white">Code Voorbeelden & Specificaties</h3>
                  <p className="text-xs text-white/30 font-mono tracking-widest uppercase mt-1">Direct te integreren in je codebases</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                  <button 
                    onClick={() => setActiveSnippet('frontend_sync')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all",
                      activeSnippet === 'frontend_sync' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                    )}
                  >
                    1. Frontend Listener
                  </button>
                  <button 
                    onClick={() => setActiveSnippet('backend_endpoint')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all",
                      activeSnippet === 'backend_endpoint' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                    )}
                  >
                    2. Express + AI API
                  </button>
                  <button 
                    onClick={() => setActiveSnippet('security_rules')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all",
                      activeSnippet === 'security_rules' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                    )}
                  >
                    3. Security Rules
                  </button>
                </div>
              </div>

              <div className="p-8 relative bg-black">
                <button 
                  onClick={() => copyToClipboard(CODE_SNIPPETS[activeSnippet])}
                  className="absolute top-6 right-6 px-4 py-2 bg-white/5 hover:bg-white/10 text-[9px] font-mono uppercase tracking-widest text-white/60 border border-white/10 rounded-lg transition-colors"
                >
                  {copied ? "Gekopieerd! ✓" : "Kopieer Code"}
                </button>
                <pre className="text-xs text-emerald-500/90 font-mono overflow-x-auto p-4 rounded-xl leading-relaxed max-h-96 scrollbar-thin">
                  <code>{CODE_SNIPPETS[activeSnippet]}</code>
                </pre>
              </div>
            </div>
          )}

          {viewMode === 'roadmap' && (
            <div className="bg-[#050505] border border-white/[0.04] rounded-[2.5rem] p-10 space-y-8">
              <div className="border-b border-white/[0.05] pb-6">
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white mb-2">Stappenplan voor Ontwikkelaars</h3>
                <p className="text-white/40 text-xs font-mono uppercase tracking-[0.2em]">Van een simpel concept naar een schaalbare productie</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* MVP Setup */}
                <div className="border border-white/5 bg-white/[0.01] p-8 rounded-3xl space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand">FASE A: MINIMAL VIABLE PRODUCT (MVP)</span>
                    <span className="text-[10px] px-2.5 py-1 bg-brand/10 text-brand rounded-full font-bold">1-2 DAGEN</span>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex gap-3 text-xs text-white/70">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <strong className="block text-white">Gedeelde Google Sheet</strong>
                        Gebruik één gedeelde spreadsheet als centraal sessielogboek met Google OAuth-beveiliging.
                      </div>
                    </li>
                    <li className="flex gap-3 text-xs text-white/70">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <strong className="block text-white">Zet client-side sync in</strong>
                        Gebruik lokale opslag en Google Sheets synchronisatie om sessiestatussen te delen tussen schermen.
                      </div>
                    </li>
                    <li className="flex gap-3 text-xs text-white/70">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <strong className="block text-white">Simuleer Handmatig feedback</strong>
                        Pas gegevens aan in Website 2 om te controleren of de interface van Website 1 direct en soepel reageert.
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Scalable Prod */}
                <div className="border border-white/5 bg-white/[0.01] p-8 rounded-3xl space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500">FASE B: SCALABLE PRODUCTION RELEASE</span>
                    <span className="text-[10px] px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-full font-bold">READY</span>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex gap-3 text-xs text-white/70">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong className="block text-white">Sluit Directe Client-Mutations Af</strong>
                        Voer alle database-mutaties vanaf dat moment uitsluitend uit via beveiligde REST-APIs op Website 2.
                      </div>
                    </li>
                    <li className="flex gap-3 text-xs text-white/70">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong className="block text-white">Beperk OAuth-toegang</strong>
                        Beperk Google Sheets-scope en maak alleen de specifieke spreadsheet schrijfbaar voor de app.
                      </div>
                    </li>
                    <li className="flex gap-3 text-xs text-white/70">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong className="block text-white">Configureer Schaalbaar Cloud-hostingsysteem</strong>
                        Deplooy Frontend SPA's op wereldwijde Edge CDN's (zoals Cloud Run/Vercel) en databases in geselecteerde Cloud Regions.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
