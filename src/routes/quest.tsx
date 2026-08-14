import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { 
  ArrowLeft,
  Flame, 
  Target, 
  BarChart3, 
  Swords, 
  ShieldAlert,
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  PhoneCall,
  RefreshCw
} from "lucide-react";
import { getQuestState } from "@/lib/quest.functions";

export const Route = createFileRoute("/quest")({
  component: QuestDashboard,
});

const REFRESH_INTERVAL_MS = 30_000; // 30 seconds

function QuestDashboard() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await getQuestState();
      setState(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => fetchData(), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin"></div>
          <p className="text-zinc-400 font-medium tracking-wide uppercase text-sm">Syncing Quest Data...</p>
        </div>
      </div>
    );
  }

  if (!state || state.error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Quest State</h2>
        <p className="text-zinc-400 max-w-md mb-8">We couldn't retrieve your latest quest data from the server. Please try again.</p>
        <Link to="/" className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Return to Base
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-6 md:p-12 font-sans selection:bg-orange-500/30">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wide uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Active Session
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500">
              REVORA VOICE QUEST
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base font-medium">
              <span className="flex items-center gap-1.5 text-blue-400 bg-blue-400/10 px-3 py-1 rounded-md">
                <Target className="w-4 h-4" /> Level {state.level}
              </span>
              <span className="flex items-center gap-1.5 text-fuchsia-400 bg-fuchsia-400/10 px-3 py-1 rounded-md">
                <Activity className="w-4 h-4" /> {state.xp} XP
              </span>
              <span className="flex items-center gap-1.5 text-orange-400 bg-orange-400/10 px-3 py-1 rounded-md">
                <Flame className="w-4 h-4" /> {state.streak} Day Streak
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              title={lastUpdated ? `Last updated at ${lastUpdated.toLocaleTimeString()}` : "Refresh Data"}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-sm font-medium text-zinc-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-orange-400" : ""}`} />
              {refreshing ? "Syncing..." : "Refresh"}
            </button>
            <Link 
              to="/" 
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-sm font-medium text-zinc-300"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
              Back Home
            </Link>
          </div>
        </header>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Call Analytics
            </h2>
            
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 shadow-inner">
                <PhoneCall className="w-5 h-5 text-zinc-500 mb-3" />
                <div className="text-3xl font-black text-white">{state.sessions.total}</div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-semibold">Total Calls</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 shadow-inner">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-3" />
                <div className="text-3xl font-black text-emerald-400">{state.sessions.successful}</div>
                <div className="text-xs text-emerald-600 mt-1 uppercase tracking-wider font-semibold">Successful</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-950/20 border border-red-900/30 shadow-inner">
                <XCircle className="w-5 h-5 text-red-500 mb-3" />
                <div className="text-3xl font-black text-red-400">{state.sessions.failed}</div>
                <div className="text-xs text-red-600 mt-1 uppercase tracking-wider font-semibold">Failed</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-6 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full" />
            <div className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-2 z-10">Success Rate</div>
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-emerald-600 z-10 drop-shadow-sm">
              {state.sessions.success_rate}%
            </div>
          </div>
        </div>

        {/* Lower Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Mastery Section */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-3xl">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Swords className="w-4 h-4" /> Mastery
            </h2>
            
            <div className="space-y-4">
              {state.mastery && state.mastery.length > 0 ? state.mastery.map((m: any, idx: number) => (
                <div key={idx} className="group flex items-center justify-between p-4 rounded-2xl bg-zinc-950/50 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700 transition-all">
                  <div>
                    <div className="text-white font-medium mb-1 group-hover:text-amber-400 transition-colors">
                      {m.subject} — {m.topic}
                    </div>
                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider bg-zinc-900 inline-block px-2 py-0.5 rounded-md">
                      {m.status}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xl font-bold text-zinc-300">
                      {m.mastery}%
                    </div>
                    <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full" 
                        style={{ width: `${m.mastery}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-zinc-500 bg-zinc-950/30 rounded-2xl border border-dashed border-zinc-800">
                  No mastery data available yet. Start your first quest!
                </div>
              )}
            </div>
          </div>

          {/* Weaknesses Section */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-3xl flex flex-col">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Weaknesses
            </h2>
            
            <div className="flex-1 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 p-5">
              {state.weaknesses && state.weaknesses.length > 0 ? (
                <ul className="space-y-3">
                  {state.weaknesses.map((w: any, idx: number) => {
                    const label = typeof w === "string" ? w : [w?.concept || w?.topic, w?.subject].filter(Boolean).join(" · ");
                    const acc = typeof w === "object" && w !== null && typeof w.accuracy === "number" ? `${w.accuracy}%` : null;
                    return (
                      <li key={idx} className="flex items-center gap-3 text-zinc-300 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="flex-1">{label || "Unknown concept"}</span>
                        {acc && <span className="text-xs text-zinc-500">{acc}</span>}
                      </li>
                    );
                  })}

                </ul>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="text-zinc-300 font-medium">You're doing great!</div>
                  <div className="text-sm text-zinc-500 mt-1">No weaknesses identified yet. Keep learning!</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Quest CTA */}
        {state.next_quest && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 to-amber-600 p-1 md:p-1.5">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            <div className="relative bg-[#0a0a0a] rounded-[1.3rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
              <div className="space-y-3 text-center md:text-left">
                <div className="text-orange-500 text-sm font-bold uppercase tracking-widest">Next Quest Available</div>
                <h3 className="text-2xl md:text-3xl font-bold text-white">{state.next_quest.title}</h3>
                <p className="text-zinc-400 max-w-lg">{state.next_quest.reason}</p>
              </div>
              
              <button className="group relative w-full md:w-auto overflow-hidden rounded-xl bg-orange-500 px-8 py-4 font-bold text-white transition-all hover:bg-orange-600 hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(249,115,22,0.5)]">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Level Up <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
