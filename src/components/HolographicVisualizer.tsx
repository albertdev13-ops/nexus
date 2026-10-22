import React, { useEffect, useRef } from 'react';
import { piperTTS, speechRecognizer } from '../services/piperTTS';

interface HolographicVisualizerProps {
  status: 'idle' | 'listening' | 'thinking' | 'speaking';
  theme?: 'cyan' | 'cobalt' | 'gold' | 'emerald';
  size?: number;
  className?: string;
  showDetails?: boolean;
}

export const HolographicVisualizer: React.FC<HolographicVisualizerProps> = ({
  status,
  theme = 'cyan',
  size = 220,
  className = '',
  showDetails = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const colorMap = {
    cyan: {
      primary: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.4)',
      accent: '#22d3ee',
      dark: '#083344',
      particle: '#67e8f9'
    },
    cobalt: {
      primary: '#3b82f6',
      glow: 'rgba(59, 130, 246, 0.4)',
      accent: '#60a5fa',
      dark: '#172554',
      particle: '#93c5fd'
    },
    gold: {
      primary: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      accent: '#fbbf24',
      dark: '#451a03',
      particle: '#fde68a'
    },
    emerald: {
      primary: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      accent: '#34d399',
      dark: '#064e3b',
      particle: '#a7f3d0'
    }
  };

  const currentTheme = colorMap[theme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle1 = 0;
    let angle2 = 0;
    let angle3 = 0;
    let pulseVal = 0;
    let pulseSpeed = 0.03;

    // Optimized particle count for 60fps mobile execution
    const particleCount = 18;
    const particles: { x: number; y: number; speed: number; radius: number; alpha: number; angle: number }[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: 0,
        y: 0,
        speed: 0.3 + Math.random() * 0.7,
        radius: 0.8 + Math.random() * 1.2,
        alpha: 0.3 + Math.random() * 0.6,
        angle: Math.random() * Math.PI * 2
      });
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.38;

      ctx.clearRect(0, 0, width, height);

      // Fetch live audio data from Piper TTS or active mic volume from Albert
      const audioData = piperTTS.getVisualizerData();
      let avgAudioLevel = 0;
      if (status === 'speaking' || piperTTS.getIsSpeaking()) {
        let sum = 0;
        for (let i = 0; i < 24; i++) sum += audioData[i] || 0;
        avgAudioLevel = (sum / 24) / 255;
      } else if (status === 'listening' || speechRecognizer.getIsListening()) {
        const micVol = speechRecognizer.getCurrentVolume();
        avgAudioLevel = Math.min(1.0, micVol / 60);
      }

      let rotSpeed1 = 0.009;
      let rotSpeed2 = -0.013;
      let rotSpeed3 = 0.005;

      if (status === 'thinking') {
        rotSpeed1 = 0.04;
        rotSpeed2 = -0.05;
        rotSpeed3 = 0.02;
        pulseSpeed = 0.07;
      } else if (status === 'speaking') {
        rotSpeed1 = 0.018 + avgAudioLevel * 0.02;
        rotSpeed2 = -0.022 - avgAudioLevel * 0.03;
        rotSpeed3 = 0.01 + avgAudioLevel * 0.015;
        pulseSpeed = 0.05 + avgAudioLevel * 0.08;
      } else if (status === 'listening') {
        rotSpeed1 = 0.018 + avgAudioLevel * 0.03;
        rotSpeed2 = -0.022 - avgAudioLevel * 0.03;
        rotSpeed3 = 0.01 + avgAudioLevel * 0.02;
        pulseSpeed = 0.05 + avgAudioLevel * 0.1;
      }

      angle1 += rotSpeed1;
      angle2 += rotSpeed2;
      angle3 += rotSpeed3;
      pulseVal += pulseSpeed;

      const dynamicRadius = baseRadius + (Math.sin(pulseVal) * 3) + (avgAudioLevel * 12);

      // 1. Central Core Glow (Lightweight radial gradient)
      const coreGradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, dynamicRadius * 0.65);
      coreGradient.addColorStop(0, currentTheme.accent);
      coreGradient.addColorStop(0.35, currentTheme.glow);
      coreGradient.addColorStop(0.85, 'rgba(0,0,0,0)');
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outer Frequency Waveform Spokes (Mobile-optimized to 40 spokes)
      const spokeCount = 40;
      const spokeRadius = dynamicRadius * 1.05;
      for (let i = 0; i < spokeCount; i++) {
        const theta = (i / spokeCount) * Math.PI * 2;
        let barHeight = 4;
        if (status === 'speaking' || piperTTS.getIsSpeaking()) {
          const sample = (audioData[i % audioData.length] || 0) / 255;
          barHeight = 4 + sample * 20;
        } else if (status === 'thinking') {
          barHeight = 5 + Math.sin(pulseVal * 3 + i) * 6;
        } else if (status === 'listening') {
          barHeight = 4 + Math.sin(pulseVal * 2 + i * 0.5) * 5;
        } else {
          barHeight = 3 + (i % 4 === 0 ? 2 : 0);
        }

        const x1 = cx + Math.cos(theta) * spokeRadius;
        const y1 = cy + Math.sin(theta) * spokeRadius;
        const x2 = cx + Math.cos(theta) * (spokeRadius + barHeight);
        const y2 = cy + Math.sin(theta) * (spokeRadius + barHeight);

        ctx.strokeStyle = (i % 6 === 0) ? currentTheme.accent : currentTheme.glow;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 3. Middle Segmented Gyroscope Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle1);
      ctx.strokeStyle = currentTheme.primary;
      ctx.lineWidth = 1.6;

      const segments = 6;
      for (let i = 0; i < segments; i++) {
        const startA = (i * (Math.PI * 2 / segments)) + 0.15;
        const endA = ((i + 1) * (Math.PI * 2 / segments)) - 0.25;
        ctx.beginPath();
        ctx.arc(0, 0, dynamicRadius * 0.82, startA, endA);
        ctx.stroke();

        const notchX = Math.cos(endA) * dynamicRadius * 0.82;
        const notchY = Math.sin(endA) * dynamicRadius * 0.82;
        ctx.fillStyle = currentTheme.accent;
        ctx.beginPath();
        ctx.arc(notchX, notchY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 4. Counter-rotating Dotted Inner Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle2);
      ctx.strokeStyle = currentTheme.accent;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, dynamicRadius * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 5. High-precision Tick Markers
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle3);
      const tickCount = 24;
      for (let i = 0; i < tickCount; i++) {
        const rad = (i / tickCount) * Math.PI * 2;
        const rInner = dynamicRadius * 0.44;
        const rOuter = dynamicRadius * (i % 2 === 0 ? 0.49 : 0.46);
        ctx.strokeStyle = i % 4 === 0 ? currentTheme.accent : currentTheme.glow;
        ctx.lineWidth = i % 4 === 0 ? 1.8 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rad) * rInner, Math.sin(rad) * rInner);
        ctx.lineTo(Math.cos(rad) * rOuter, Math.sin(rad) * rOuter);
        ctx.stroke();
      }
      ctx.restore();

      // 6. Central Reactor Hex Core
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle1 * 1.5);
      const hexRadius = dynamicRadius * 0.25 + (avgAudioLevel * 5);
      ctx.strokeStyle = currentTheme.accent;
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(7, 10, 16, 0.8)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = Math.cos(a) * hexRadius;
        const hy = Math.sin(a) * hexRadius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5 + avgAudioLevel * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 7. Ambient Particle Vortex (lightweight)
      particles.forEach((p, idx) => {
        p.angle += 0.005 * p.speed;
        const r = (dynamicRadius * 0.3) + ((idx / particles.length) * dynamicRadius * 0.75);
        const px = cx + Math.cos(p.angle) * r;
        const py = cy + Math.sin(p.angle) * r;

        ctx.fillStyle = currentTheme.particle;
        ctx.globalAlpha = p.alpha * (0.35 + avgAudioLevel * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [status, theme, size, currentTheme]);

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        style={{ width: size, height: size }}
        className="transition-transform duration-200"
      />

      {showDetails && (
        <div className="mt-1 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider uppercase">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'speaking'
                  ? 'bg-cyan-400 animate-ping'
                  : status === 'thinking'
                  ? 'bg-amber-400 animate-pulse'
                  : status === 'listening'
                  ? 'bg-rose-400 animate-bounce'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="text-slate-300 font-semibold">
              {status === 'speaking' && 'Voix Masculine Active'}
              {status === 'thinking' && 'Traitement Neuronal en cours'}
              {status === 'listening' && 'Microphone Ouvert'}
              {status === 'idle' && 'NEXIS / ALI Prêt'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
