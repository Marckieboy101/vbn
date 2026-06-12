import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  Sparkles,
  Link2,
  Database
} from "lucide-react";
import { 
  loginWithGoogleSheets, 
  logoutGoogleSheets, 
  getCachedToken, 
  getGoogleUser,
  getSheetFirstTabTitle,
  writeHeaders,
  syncSessionsToSpreadsheet,
  SpreadsheetInfo,
  createSpreadsheet
} from "../services/googleSheetsService";
import { getSavedSessions } from "../lib/sessionStorage";
import { cn } from "../lib/utils";

export const GoogleSheetsIntegration: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [sheetInput, setSheetInput] = useState<string>(
    "https://docs.google.com/spreadsheets/d/1Av8iGTwbTCvoDY3-JrFFAf73Rc5w2EDt614D6PUicKM/edit?gid=0#gid=0"
  );
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<SpreadsheetInfo | null>(null);
  
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [syncsCount, setSyncsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [syncSteps, setSyncSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);

  // Load saved configuration from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vb_spreadsheet");
    if (saved) {
      try {
        const info = JSON.parse(saved);
        setCurrentSpreadsheet(info);
        setSheetInput(info.spreadsheetUrl || info.spreadsheetId);
      } catch (e) {
        console.warn("Could not load vb_spreadsheet from storage", e);
      }
    }
  }, []);

  // Update authorizations state based on cached credentials
  const refreshAuthState = () => {
    const token = getCachedToken();
    const user = getGoogleUser();
    if (token && user) {
      setAuthorized(true);
      setUserEmail(user.email);
    } else {
      setAuthorized(false);
      setUserEmail(null);
    }
  };

  useEffect(() => {
    refreshAuthState();
  }, [isOpen]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setStatusMsg({ text: "Inloggen bij Google...", type: "info" });
    try {
      const res = await loginWithGoogleSheets();
      if (res) {
        setAuthorized(true);
        setUserEmail(res.user.email);
        setStatusMsg({ text: `Succesvol ingelogd als ${res.user.email}`, type: "success" });

        const savedSpreadsheet = localStorage.getItem("vb_spreadsheet");
        if (!savedSpreadsheet && !currentSpreadsheet) {
          setStatusMsg({ text: "Nieuwe spreadsheet wordt automatisch aangemaakt...", type: "info" });
          const info = await createSpreadsheet("Filmvibe Feedback Sessiedata");
          const sheetName = await getSheetFirstTabTitle(info.spreadsheetId);
          await writeHeaders(info.spreadsheetId, sheetName);

          setCurrentSpreadsheet(info);
          setSheetInput(info.spreadsheetUrl);
          localStorage.setItem("vb_spreadsheet", JSON.stringify(info));
          setStatusMsg({
            text: `Nieuwe spreadsheet automatisch aangemaakt en gekoppeld: ${info.title}`,
            type: "success",
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: `Inloggen geannuleerd of mislukt: ${err.message || err}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutGoogleSheets();
    setAuthorized(false);
    setUserEmail(null);
    setStatusMsg({ text: "Google-sessie afgemeld.", type: "info" });
  };

  // Extract pure ID from a Google Sheet URL
  const extractId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    
    // Check if it's a full Google Sheets URL
    const urlPattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = trimmed.match(urlPattern);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const handleLinkSpreadsheet = async () => {
    if (!authorized) {
      setStatusMsg({ text: "Autoriseer eerst met Google om een spreadsheet te koppelen.", type: "error" });
      return;
    }

    const targetId = extractId(sheetInput);
    if (!targetId) {
      setStatusMsg({ text: "Voer a.u.b. een geldige Google Sheets link of ID in.", type: "error" });
      return;
    }

    setLoading(true);
    setStatusMsg({ text: "Eigenschappen van spreadsheet ophalen...", type: "info" });
    setSyncSteps(["Verbinding maken met spreadsheet...", "Eerste tabblad ID verifiëren..."]);
    setCurrentStepIndex(0);

    try {
      const sheetName = await getSheetFirstTabTitle(targetId);
      setCurrentStepIndex(1);
      
      const spreadsheet: SpreadsheetInfo = {
        spreadsheetId: targetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetId}/edit`,
        title: `Gekoppelde Spreadsheet (${sheetName})`
      };

      setCurrentSpreadsheet(spreadsheet);
      localStorage.setItem("vb_spreadsheet", JSON.stringify(spreadsheet));
      
      setStatusMsg({ 
        text: `Succesvol verbonden met spreadsheet tab: "${sheetName}"`, 
        type: "success" 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ 
        text: `Koppelen mislukt. Controleer de link of deelinstellingen: ${err.message || err}`, 
        type: "error" 
      });
    } finally {
      setLoading(false);
      setSyncSteps([]);
      setCurrentStepIndex(-1);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!authorized) {
      setStatusMsg({ text: "Autoriseer eerst met Google om een spreadsheet aan te maken.", type: "error" });
      return;
    }

    setLoading(true);
    setStatusMsg({ text: "Nieuwe spreadsheet aanmaken...", type: "info" });
    setSyncSteps(["Spreadsheet bestand aanmaken in uw Google Drive...", "Kolomindelingen schrijven..."]);
    setCurrentStepIndex(0);

    try {
      const info = await createSpreadsheet("Filmvibe Feedback Sessiedata");
      setCurrentStepIndex(1);
      
      const sheetName = await getSheetFirstTabTitle(info.spreadsheetId);
      await writeHeaders(info.spreadsheetId, sheetName);

      setCurrentSpreadsheet(info);
      setSheetInput(info.spreadsheetUrl);
      localStorage.setItem("vb_spreadsheet", JSON.stringify(info));

      setStatusMsg({ 
        text: `Nieuwe spreadsheet "${info.title}" succesvol aangemaakt!`, 
        type: "success" 
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ 
        text: `Aanmaken mislukt. Controleer uw app-rechten: ${err.message || err}`, 
        type: "error" 
      });
    } finally {
      setLoading(false);
      setSyncSteps([]);
      setCurrentStepIndex(-1);
    }
  };

  const handleDisconnect = () => {
    setCurrentSpreadsheet(null);
    localStorage.removeItem("vb_spreadsheet");
    setStatusMsg({ text: "Spreadsheet ontkoppeld.", type: "info" });
  };

  const handleSyncData = async () => {
    if (!authorized || !currentSpreadsheet) {
      setStatusMsg({ text: "Zorg dat u bent ingelogd en een spreadsheet is gekoppeld.", type: "error" });
      return;
    }

    setLoading(true);
    setStatusMsg({ text: "Sessiegegevens synchroniseren...", type: "info" });
    
    const steps = [
      "1/4 Sessies laden uit lokale opslag...",
      "2/4 Doelgroep tabblad opvragen...",
      "3/4 Kolomkoppen (headers) schrijven...",
      "4/4 Gegevens uploaden naar spreadsheet..."
    ];
    setSyncSteps(steps);
    setCurrentStepIndex(0);

    try {
      const sessions = getSavedSessions();

      // Sort sessions by timestamp descending (newest on top)
      sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setCurrentStepIndex(1);
      const sheetName = await getSheetFirstTabTitle(currentSpreadsheet.spreadsheetId);
      
      setCurrentStepIndex(2);
      await writeHeaders(currentSpreadsheet.spreadsheetId, sheetName);
      
      setCurrentStepIndex(3);
      await syncSessionsToSpreadsheet(currentSpreadsheet.spreadsheetId, sheetName, sessions);
      
      setStatusMsg({ 
        text: `Synchronisatie geslaagd! ${sessions.length} sessies geüpload naar de spreadsheet.`, 
        type: "success" 
      });
      setSyncsCount(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ 
        text: `Synchronisatie mislukt: ${err.message || err}`, 
        type: "error" 
      });
    } finally {
      setLoading(false);
      setSyncSteps([]);
      setCurrentStepIndex(-1);
    }
  };

  return (
    <>
      {/* Floating Control Button next to Sound Toggle */}
      <button
        id="sheets-sync-trigger"
        onClick={() => setIsOpen(true)}
        className="fixed top-8 right-24 z-[100] p-3 glass rounded-full border-white/5 hover:bg-white/10 transition-colors group flex items-center justify-center"
        title="Google Sheets Synchronisatie"
      >
        <FileSpreadsheet className="w-5 h-5 text-white/40 group-hover:text-emerald-400 transition-colors" />
      </button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!loading) setIsOpen(false); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-black/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8"
            >
              {/* Close Button */}
              <button
                disabled={loading}
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10 disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">
                    Google Sheets Sync
                  </h3>
                  <p className="text-xs text-white/40 font-mono">EXPORTEER RESULTERENDE SESSIEREGISTERS</p>
                </div>
              </div>

              {/* Status Message */}
              {statusMsg && (
                <div className={`p-4 rounded-xl mb-6 border text-xs font-mono flex items-center gap-3 ${
                  statusMsg.type === "success" 
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                    : statusMsg.type === "error"
                    ? "bg-red-500/5 border-red-500/20 text-red-400"
                    : "bg-white/5 border-white/10 text-white/75"
                }`}>
                  {statusMsg.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {statusMsg.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
                  {statusMsg.type === "info" && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* Step 1: Google Authentication */}
              <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01] mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] font-bold">
                    Stap 1: Google Verificatie
                  </span>
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    authorized ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {authorized ? "GEAUTORISEERD" : "STAND-BY"}
                  </span>
                </div>

                {!authorized ? (
                  <div>
                    <p className="text-xs text-white/50 mb-3 leading-relaxed">
                      Machtig deze app tijdelijk om te kunnen schrijven naar je eigen Google Spreadsheets.
                    </p>
                    <button
                      disabled={loading}
                      onClick={handleGoogleLogin}
                      className="w-full py-2.5 bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-colors font-sans text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Database className="w-4 h-4" />
                      Inloggen met Google
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/80 font-mono font-medium">{userEmail}</p>
                      <p className="text-[10px] text-emerald-400/60 font-mono">Toegang tot spreadsheets is actief</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-[10px] uppercase tracking-wider text-red-400/60 hover:text-red-400 font-mono underline cursor-pointer"
                    >
                      Afmelden
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Spreadsheet Linking */}
              <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01] mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] font-bold">
                    Stap 2: Spreadsheet Koppelen
                  </span>
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    currentSpreadsheet ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/20"
                  }`}>
                    {currentSpreadsheet ? "GEKOPPELD" : "GEEN KOPPELING"}
                  </span>
                </div>

                {currentSpreadsheet ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/15">
                      <p className="text-xs font-mono text-emerald-400 font-bold mb-1 truncate">
                        {currentSpreadsheet.title}
                      </p>
                      <p className="text-[9px] font-mono text-white/20 truncate">
                        ID: {currentSpreadsheet.spreadsheetId}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={currentSpreadsheet.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 border border-white/10 hover:bg-white/5 transition-colors text-[10px] uppercase font-mono tracking-wider rounded-md text-center inline-flex items-center justify-center gap-1.5 text-white/70 hover:text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open spreadsheet
                      </a>
                      <button
                        onClick={handleDisconnect}
                        className="px-4 py-1.5 text-[10px] uppercase font-mono tracking-wider rounded-md border border-red-500/15 hover:bg-red-500/5 text-red-400/80 transition-colors hover:text-red-400 cursor-pointer"
                      >
                        Ontkoppelen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-white/50 leading-relaxed">
                      Plak het adres of de ID van uw Google Spreadsheet om deze te koppelen en te updaten met de sessiedata:
                    </p>
                    
                    <div className="relative">
                      <input
                        type="text"
                        value={sheetInput}
                        onChange={(e) => setSheetInput(e.target.value)}
                        placeholder="Plak Google Spreadsheet URL..."
                        disabled={loading || !authorized}
                        className="w-full text-xs font-mono bg-black border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white rounded-lg px-3.5 py-2.5 pr-10 focus:outline-none disabled:opacity-40"
                      />
                      <Link2 className="absolute right-3.5 top-3 w-4 h-4 text-white/30" />
                    </div>

                    <button
                      disabled={loading || !authorized || !sheetInput.trim()}
                      onClick={handleLinkSpreadsheet}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:hover:bg-emerald-500"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      Koppel deze spreadsheet
                    </button>

                    <div className="flex items-center gap-2 my-1">
                      <div className="h-[1px] bg-white/5 flex-1" />
                      <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest shrink-0">OF GEMAKKELIJKER</span>
                      <div className="h-[1px] bg-white/5 flex-1" />
                    </div>

                    <button
                      type="button"
                      disabled={loading || !authorized}
                      onClick={handleCreateNewSheet}
                      className="w-full py-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      Maak automatisch een nieuwe spreadsheet aan
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Run Synchronisation */}
              {currentSpreadsheet && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      disabled={loading}
                      onClick={handleSyncData}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-display font-black uppercase tracking-wider text-xs rounded-xl transition-all duration-300 shadow-[0_4px_15px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:hover:from-emerald-600/40 cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                      Gegevens Synchroniseren
                    </button>
                  </div>

                  {/* Sync progress steps */}
                  {syncSteps.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 font-mono text-[10px] space-y-2 text-white/60">
                      {syncSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            currentStepIndex === idx 
                              ? "bg-emerald-400 animate-pulse" 
                              : currentStepIndex > idx 
                              ? "bg-emerald-400" 
                              : "bg-white/10"
                          }`} />
                          <span className={cn(
                            currentStepIndex === idx && "text-emerald-400 font-bold",
                            currentStepIndex > idx && "text-white/40 line-through"
                          )}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] font-mono text-white/30 text-center leading-relaxed">
                    Tip: Zorg dat u de spreadsheet bewerkingstoegang heeft gegeven op uw Google-account voor een vlekkeloze synchronisatie.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
