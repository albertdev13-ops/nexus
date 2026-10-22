/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ChatConsole } from './components/ChatConsole';
import { LiveVoiceOverlay } from './components/LiveVoiceOverlay';
import { SentinelDefensePanel } from './components/SentinelDefensePanel';
import { TasksNotesPanel } from './components/TasksNotesPanel';
import { PiperTTSPanel } from './components/PiperTTSPanel';
import { SecurityLockscreen } from './components/SecurityLockscreen';
import { HolographicVisualizer } from './components/HolographicVisualizer';
import { AudioWaveformBar } from './components/AudioWaveformBar';
import { ChatMessage, CommandResult, NoteItem, TaskItem, TimerItem } from './types';
import { streamLocalLLMResponse } from './services/localLLM';
import { piperTTS, speechRecognizer } from './services/piperTTS';
import {
  getSavedNotes,
  getSavedTasks,
  fetchSystemMetrics,
  playAlertChime
} from './services/commandSystem';
import {
  ShieldAlert,
  Shield,
  CheckSquare,
  Clock,
  Fingerprint,
  KeyRound,
  ChevronRight
} from 'lucide-react';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg-welcome',
  sender: 'nexis',
  text: `Bonjour, Monsieur Albert. Je suis **ALI**, votre assistant personnel.

Mon système est calibré sur votre empreinte vocale biométrique unique. Aucune voix étrangère n'est autorisée à m'adresser des ordres.

Vos modules de surveillance, vos calculs et vos commandes sont prêts. À vos ordres, Albert.`,
  timestamp: Date.now() - 60000
};

export default function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'console' | 'defense' | 'tasks' | 'voice'>('all');
  const [isLiveOverlayOpen, setIsLiveOverlayOpen] = useState(false);
  const [unauthorizedVoiceAlert, setUnauthorizedVoiceAlert] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('nexis_chat_history_v1');
      return saved ? JSON.parse(saved) : [INITIAL_WELCOME_MESSAGE];
    } catch {
      return [INITIAL_WELCOME_MESSAGE];
    }
  });

  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeCommands, setActiveCommands] = useState<CommandResult[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Shared state for tasks, notes, timers
  const [notes, setNotes] = useState<NoteItem[]>(() => getSavedNotes());
  const [tasks, setTasks] = useState<TaskItem[]>(() => getSavedTasks());
  const [timers, setTimers] = useState<TimerItem[]>([
    {
      id: 'timer-default',
      label: 'Surveillance Système',
      durationSeconds: 300,
      remainingSeconds: 300,
      isRunning: false,
      createdAt: Date.now()
    }
  ]);

  const [batteryLevel, setBatteryLevel] = useState<number>(100);

  // Track speech states, hardware & voiceprint rejection
  useEffect(() => {
    const unsub = piperTTS.subscribeSpeakingState((speaking) => {
      setIsSpeaking(speaking);
    });

    const unsubMic = speechRecognizer.subscribeListeningState((listening) => {
      setIsListening(listening);
    });

    // Voiceprint reject hook: if someone other than Albert speaks
    speechRecognizer.setOnVoiceprintRejected(() => {
      setUnauthorizedVoiceAlert(true);
      playAlertChime('alarm');
      setTimeout(() => setUnauthorizedVoiceAlert(false), 3500);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchSystemMetrics().then((m) => {
      setBatteryLevel(m.batteryLevel ?? 100);
    });

    return () => {
      unsub();
      unsubMic();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save chat history
  useEffect(() => {
    try {
      localStorage.setItem('nexis_chat_history_v1', JSON.stringify(messages.slice(-30)));
    } catch (e) {
      console.warn('Could not save history', e);
    }
  }, [messages]);

  // Handle user query submission
  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingText('');
    setActiveCommands([]);

    let accumulatedTokens = '';
    const turnCommands: CommandResult[] = [];

    try {
      await streamLocalLLMResponse({
        prompt: userText,
        history: [...messages, userMessage],
        onToken: (tok) => {
          accumulatedTokens += tok;
          setStreamingText(accumulatedTokens);
        },
        onCommandExecuted: (cmd) => {
          turnCommands.push(cmd);
          setActiveCommands([...turnCommands]);

          if (cmd.type === 'task' && cmd.data) {
            setTasks((t) => [cmd.data, ...t]);
          } else if (cmd.type === 'note' && cmd.data) {
            setNotes((n) => [cmd.data, ...n]);
          } else if (cmd.type === 'timer' && cmd.data) {
            setTimers((tm) => [cmd.data, ...tm]);
          }
        },
        onComplete: (fullText, cmds) => {
          setIsStreaming(false);
          setStreamingText('');
          setActiveCommands([]);

          const nexisMessage: ChatMessage = {
            id: 'nexis-' + Date.now(),
            sender: 'nexis',
            text: fullText,
            timestamp: Date.now(),
            commandResults: cmds
          };

          setMessages((prev) => [...prev, nexisMessage]);
        }
      });
    } catch (err) {
      setIsStreaming(false);
      const errorMessage: ChatMessage = {
        id: 'err-' + Date.now(),
        sender: 'nexis',
        text: "Désolé, Monsieur Albert. Une interruption est survenue.",
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleClearHistory = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    try {
      localStorage.removeItem('nexis_chat_history_v1');
    } catch {}
    playAlertChime('confirm');
  };

  // Direct hands-free mic toggle without opening any full-screen overlay
  const handleToggleMic = () => {
    if (isListening) {
      speechRecognizer.stop();
      setIsListening(false);
    } else {
      playAlertChime('beep');
      setIsListening(true);
      speechRecognizer.start(
        (transcript, isFinal) => {
          if (isFinal && transcript.trim()) {
            speechRecognizer.stop();
            setIsListening(false);
            handleSendMessage(transcript.trim());
          }
        },
        () => {
          setIsListening(false);
        }
      );
    }
  };

  const visualizerStatus = isSpeaking
    ? 'speaking'
    : isStreaming
    ? 'thinking'
    : isListening
    ? 'listening'
    : 'idle';

  // If locked, render the Secret PIN & Voiceprint Calibration Lockscreen!
  if (isLocked) {
    return <SecurityLockscreen onUnlocked={() => setIsLocked(false)} />;
  }

  return (
    <div className="h-[100dvh] w-full max-w-md md:max-w-xl mx-auto flex flex-col bg-[#06090f] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden shadow-2xl relative">
      {/* Unauthorized Voice Warning Banner */}
      {unauthorizedVoiceAlert && (
        <div className="absolute top-14 left-4 right-4 z-50 p-3 rounded-xl bg-rose-950/95 border border-rose-500/60 shadow-2xl text-xs font-mono text-rose-200 flex items-center gap-2.5 animate-in slide-in-from-top duration-200">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
          <div>
            <div className="font-bold text-white">Voix Non Autorisée Détectée</div>
            <div className="text-[11px] text-rose-300">
              Ali n'obéit qu'à l'empreinte vocale de son créateur Albert.
            </div>
          </div>
        </div>
      )}

      {/* Mobile Top App Bar (56px) */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onEnterLiveMode={() => setIsLiveOverlayOpen(true)}
        isSpeaking={isSpeaking}
        isListening={isListening}
        isOnline={isOnline}
        batteryLevel={batteryLevel}
      />

      {/* Main Viewport Content Area with smooth scrolling */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16">
        {/* VIEW 1: UNIFIED PRINCIPAL DASHBOARD (Écran principal avec tout) */}
        {activeTab === 'all' && (
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-4 pb-24 no-scrollbar">
            {/* 1. Holographic Arc Reactor Visualizer (Audio-Reactive) */}
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-[#0a101d] to-[#060910] border border-slate-800/80 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />
              <HolographicVisualizer
                status={visualizerStatus}
                theme="cyan"
                size={160}
                showDetails={true}
              />
            </div>

            {/* 2. Live Audio Waveform & Mic Spectrum Bar */}
            <AudioWaveformBar
              isListening={isListening}
              isOnline={isOnline}
            />

            {/* 3. Executive Chat Console */}
            <ChatConsole
              messages={messages}
              streamingText={streamingText}
              isStreaming={isStreaming}
              activeCommands={activeCommands}
              onSendMessage={handleSendMessage}
              onClearHistory={handleClearHistory}
              isSpeaking={isSpeaking}
              isOnline={isOnline}
              className="min-h-[440px] max-h-[580px]"
            />

            {/* 4. Quick Sentinel Defense Overview Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Défense Sentinelle du Système</span>
                </div>
                <button
                  onClick={() => setActiveTab('defense')}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Détails</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase">Protection</div>
                  <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active & Surveillance
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase">Autorité Vocale</div>
                  <div className="text-cyan-300 font-bold mt-0.5">
                    Albert Exclusif
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Quick Tasks & Timers Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                  <span>Tâches & Minuteurs Actifs</span>
                </div>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Gérer</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {timers.slice(0, 2).map((tm) => (
                  <div key={tm.id} className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{tm.label}</span>
                    </div>
                    <span className="text-amber-300 font-bold">
                      {Math.floor(tm.remainingSeconds / 60)}:{(tm.remainingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                ))}
                {tasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 truncate max-w-[200px]">{t.title}</span>
                    <span className="text-[10px] text-emerald-400">En cours</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Quick Biometrics & Passcode PIN Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>Empreinte Biométrique d'Albert</span>
                </div>
                <button
                  onClick={() => setActiveTab('voice')}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Paramètres</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300">Code PIN & Accès Sécurisé</span>
                </div>
                <span className="text-emerald-400 font-semibold">Protégé</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FOCUSED CONSOLE */}
        {activeTab === 'console' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ChatConsole
              messages={messages}
              streamingText={streamingText}
              isStreaming={isStreaming}
              activeCommands={activeCommands}
              onSendMessage={handleSendMessage}
              onClearHistory={handleClearHistory}
              isSpeaking={isSpeaking}
              isOnline={isOnline}
            />
          </div>
        )}

        {/* VIEW 3: SENTINEL DEFENSE */}
        {activeTab === 'defense' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 no-scrollbar">
            <SentinelDefensePanel isOnline={isOnline} />
          </div>
        )}

        {/* VIEW 4: TASKS & TIMERS */}
        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 no-scrollbar">
            <TasksNotesPanel
              timers={timers}
              setTimers={setTimers}
              notes={notes}
              setNotes={setNotes}
              tasks={tasks}
              setTasks={setTasks}
            />
          </div>
        )}

        {/* VIEW 5: BIOMETRIC VOICE & SECURITY SETTINGS */}
        {activeTab === 'voice' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 no-scrollbar">
            <PiperTTSPanel />
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar with direct Mic Toggle */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onToggleMic={handleToggleMic}
        isSpeaking={isSpeaking}
        isListening={isListening}
      />

      {/* Optional Fullscreen Mobile Live Voice HUD (Non-blocking) */}
      <LiveVoiceOverlay
        isOpen={isLiveOverlayOpen}
        onClose={() => setIsLiveOverlayOpen(false)}
        messages={messages}
        onNewMessage={(msg) => setMessages((prev) => [...prev, msg])}
        isOnline={isOnline}
      />
    </div>
  );
}
