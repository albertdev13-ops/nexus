import React from 'react';
import { LayoutDashboard, Terminal, Shield, CheckSquare, KeyRound, Mic, MicOff } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'all' | 'console' | 'defense' | 'tasks' | 'voice';
  setActiveTab: (tab: 'all' | 'console' | 'defense' | 'tasks' | 'voice') => void;
  onToggleMic: () => void;
  isSpeaking: boolean;
  isListening: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onToggleMic,
  isSpeaking,
  isListening
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#06090f]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1 select-none">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16">
        {/* Tab 1: Unified Principal Dashboard */}
        <button
          onClick={() => setActiveTab('all')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Écran Principal (Tout)"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-mono tracking-tight mt-1">Principal</span>
        </button>

        {/* Tab 2: Sentinel Defense */}
        <button
          onClick={() => setActiveTab('defense')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer ${
            activeTab === 'defense'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Sentinelle & Défense"
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px] font-mono tracking-tight mt-1">Défense</span>
        </button>

        {/* Tab 3: Center Mic Quick Trigger (Prominent Glow, No screen trap) */}
        <button
          onClick={onToggleMic}
          className="flex flex-col items-center justify-center -mt-3.5 group cursor-pointer"
          title={isListening ? 'Micro ouvert - Cliquez pour couper' : 'Parler au micro'}
        >
          <div
            className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${
              isListening
                ? 'bg-rose-500 text-white shadow-[0_0_22px_rgba(244,63,94,0.7)] animate-pulse'
                : isSpeaking
                ? 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            }`}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </div>
          <span className={`text-[9px] font-mono font-bold tracking-wider uppercase mt-1 ${isListening ? 'text-rose-400' : 'text-cyan-400'}`}>
            {isListening ? 'Écoute...' : 'Micro'}
          </span>
        </button>

        {/* Tab 4: Tasks & Notes */}
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Tâches & Minuteurs"
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[10px] font-mono tracking-tight mt-1">Tâches</span>
        </button>

        {/* Tab 5: Voiceprint & PIN Security */}
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer ${
            activeTab === 'voice'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Sécurité & Empreinte Vocale Albert"
        >
          <KeyRound className="w-5 h-5" />
          <span className="text-[10px] font-mono tracking-tight mt-1">Sécurité</span>
        </button>
      </div>
    </nav>
  );
};
