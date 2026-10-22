import React, { useEffect, useState } from 'react';
import { Mic, Activity, Globe, Zap, Radio } from 'lucide-react';
import { speechRecognizer, piperTTS } from '../services/piperTTS';

interface AudioWaveformBarProps {
  isListening: boolean;
  className?: string;
  isOnline: boolean;
}

export const AudioWaveformBar: React.FC<AudioWaveformBarProps> = ({
  isListening,
  className = '',
  isOnline
}) => {
  const [micVolume, setMicVolume] = useState<number>(0);
  const [spectrum, setSpectrum] = useState<number[]>(new Array(28).fill(3));

  useEffect(() => {
    if (!isListening) {
      setMicVolume(0);
      setSpectrum(new Array(28).fill(3));
      return;
    }

    const unsub = speechRecognizer.subscribeMicStream((vol, data) => {
      setMicVolume(vol);
      // Sample 28 frequency points
      const bars: number[] = [];
      const step = Math.max(1, Math.floor(data.length / 28));
      for (let i = 0; i < 28; i++) {
        const val = data[i * step] || 0;
        // Normalize 4px to 28px
        const height = Math.max(4, Math.round((val / 255) * 26) + 4);
        bars.push(height);
      }
      setSpectrum(bars);
    });

    return () => {
      unsub();
    };
  }, [isListening]);

  const activeVoiceName = piperTTS.getActiveVoiceName();
  const currentEngine = piperTTS.getCurrentEngine();

  return (
    <div
      className={`rounded-xl bg-slate-950/80 border border-slate-800/90 p-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg select-none ${className}`}
    >
      {/* Left: Mic status & VU meter */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            isListening
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
              : 'bg-slate-900 text-slate-500 border border-slate-800'
          }`}
        >
          <Mic className="w-4 h-4" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wide">
              {isListening ? 'Micro Ouvert (Capture En Direct)' : 'Microphone En Veille'}
            </span>
            {isListening && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60">
                {micVolume} dB
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-slate-500">
            {isListening
              ? 'VAD & Reconnaissance vocale hybride (Fonctionne 100% hors-ligne)'
              : 'Cliquez sur le micro pour parler ou dicter une commande'}
          </p>
        </div>
      </div>

      {/* Center: Live 28-Band Audio Spectrum */}
      <div className="flex items-center gap-1 h-8 px-3 py-1 bg-slate-900/90 rounded-lg border border-slate-800/80">
        {spectrum.map((h, idx) => (
          <div
            key={idx}
            style={{ height: `${isListening ? h : 4}px` }}
            className={`w-1 rounded-full transition-all duration-75 ${
              isListening
                ? idx % 4 === 0
                  ? 'bg-rose-400 shadow-[0_0_6px_#fb7185]'
                  : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Right: Active Voice Engine Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 leading-none">Voix d'Ali</span>
            <span className="text-cyan-300 font-semibold text-xs leading-tight">
              Masculine Calibrée
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
