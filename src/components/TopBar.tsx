import React from 'react';
import { Mic, Shield, Globe, Zap, Battery, Volume2 } from 'lucide-react';

interface TopBarProps {
  activeTab: 'all' | 'console' | 'defense' | 'tasks' | 'voice';
  setActiveTab: (tab: 'all' | 'console' | 'defense' | 'tasks' | 'voice') => void;
  onEnterLiveMode?: () => void;
  isSpeaking: boolean;
  isListening: boolean;
  isOnline: boolean;
  batteryLevel?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onEnterLiveMode,
  isSpeaking,
  isListening,
  isOnline,
  batteryLevel = 100
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#070a11]/95 backdrop-blur-md sticky top-0 z-30 h-14 px-4 flex items-center justify-between select-none">
      {/* Left Slot: Wordmark & Core status */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setActiveTab('all')}
          className="flex items-center gap-2 focus:outline-none cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <span className="text-base font-bold tracking-wider text-white font-mono">
            NEXIS / ALI
          </span>
        </button>

        <span className="text-xs text-slate-600">·</span>

        <span className="text-[11px] font-mono text-emerald-400 font-medium">
          {isOnline ? 'En Ligne' : 'Hors-Ligne'}
        </span>
      </div>

      {/* Right Slot: Sentinel Shield & Live HUD Trigger */}
      <div className="flex items-center gap-2">
        {/* Battery Indicator */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
          <Battery className="w-3 h-3 text-emerald-400" />
          <span>{batteryLevel}%</span>
        </div>

        {/* Sentinel Shield Status */}
        <button
          onClick={() => setActiveTab('defense')}
          className={`p-2 rounded-lg border transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
            activeTab === 'defense'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
          title="Système de Défense & Sentinelle"
        >
          <Shield className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Live Audio indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 px-2 py-1 rounded bg-cyan-950/80 border border-cyan-500/40">
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span className="hidden sm:inline">Vocal</span>
          </div>
        )}
      </div>
    </header>
  );
};
