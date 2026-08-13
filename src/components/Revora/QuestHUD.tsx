import { useEffect, useState } from "react";
import { Flame, Shield, Swords, Target, Heart, Zap } from "lucide-react";
import { getQuestState } from "@/lib/quest.functions";

export function QuestHUD({ active }: { active: boolean }) {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    if (active) {
      getQuestState().then(setState).catch(console.error);
    }
  }, [active]);

  if (!active) return null;

  const level = state?.level || 1;
  const xp = state?.xp || 0;
  const streak = state?.streak || 0;
  // Faking a health bar for game-like feel, can be mapped to mastery or something later
  const health = 100;
  
  return (
    <div className="w-full flex items-center justify-between bg-black/60 backdrop-blur-md border border-orange-500/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(249,115,22,0.15)] animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4">
        {/* Player Avatar / Class */}
        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center border-2 border-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.4)]">
          <Swords className="w-6 h-6 text-white" />
          <div className="absolute -bottom-2 -right-2 bg-zinc-900 border border-orange-500 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            LVL {level}
          </div>
        </div>

        {/* Health & Mana/XP Bars */}
        <div className="flex flex-col gap-2 w-32 sm:w-48">
          {/* HP Bar */}
          <div className="flex items-center gap-2">
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-red-400" 
                style={{ width: `${health}%`, boxShadow: "0 0 10px rgba(239, 68, 68, 0.8)" }}
              />
            </div>
          </div>
          {/* XP Bar */}
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />
            <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400" 
                style={{ width: `${Math.min(100, (xp % 1000) / 10)}%`, boxShadow: "0 0 10px rgba(59, 130, 246, 0.8)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats/Badges */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-center justify-center px-3 py-1 bg-orange-950/40 border border-orange-500/20 rounded-lg">
          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Streak</span>
          <span className="text-sm font-black text-white flex items-center gap-1">
            {streak} <Flame className="w-3 h-3 text-orange-500" />
          </span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-1 bg-red-950/40 border border-red-500/20 rounded-lg">
          <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Enemy</span>
          <span className="text-sm font-black text-white flex items-center gap-1">
            BOSS <Target className="w-3 h-3 text-red-500" />
          </span>
        </div>
      </div>
    </div>
  );
}
