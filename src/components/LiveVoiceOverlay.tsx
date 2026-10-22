import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Send,
  SlidersHorizontal
} from 'lucide-react';
import { HolographicVisualizer } from './HolographicVisualizer';
import { piperTTS, speechRecognizer } from '../services/piperTTS';
import { streamLocalLLMResponse } from '../services/localLLM';
import { ChatMessage, CommandResult } from '../types';
import { playAlertChime } from '../services/commandSystem';
import { getBiometricFilterMode, setBiometricFilterMode } from '../services/voiceprintAuth';

interface LiveVoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onNewMessage: (msg: ChatMessage) => void;
  theme?: 'cyan' | 'cobalt' | 'gold' | 'emerald';
  isOnline: boolean;
}

export const LiveVoiceOverlay: React.FC<LiveVoiceOverlayProps> = ({
  isOpen,
  onClose,
  messages,
  onNewMessage,
  theme = 'cyan',
  isOnline
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [activeCommands, setActiveCommands] = useState<CommandResult[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [handsFree, setHandsFree] = useState(true);
  const [biometricMode, setBiometricModeState] = useState<'lenient' | 'strict' | 'disabled'>(() => getBiometricFilterMode());

  // Track speech synthesizer state
  useEffect(() => {
    const unsub = piperTTS.subscribeSpeakingState((speaking) => {
      setIsSpeaking(speaking);
      if (speaking) {
        setIsListening(false);
      }
    });
    return () => unsub();
  }, []);

  // Track mic audio level (dB)
  useEffect(() => {
    if (!isOpen || !isListening) {
      setMicLevel(0);
      return;
    }
    const unsub = speechRecognizer.subscribeMicStream((vol) => {
      setMicLevel(vol);
    });
    return () => unsub();
  }, [isOpen, isListening]);

  // Auto-start hands-free listening upon entering Live mode
  useEffect(() => {
    if (isOpen) {
      startAutoListening();
    } else {
      speechRecognizer.stop();
      setIsListening(false);
      piperTTS.stop();
      setStreamingResponse('');
      setLiveTranscript('');
    }
  }, [isOpen]);

  const startAutoListening = () => {
    if (isSpeaking) {
      piperTTS.stop();
    }
    setLiveTranscript('');
    setIsListening(true);
    playAlertChime('beep');

    speechRecognizer.start(
      (text, isFinal) => {
        setLiveTranscript(text);
        if (isFinal && text.trim().length > 1) {
          handleSendQuery(text.trim());
        }
      },
      (error) => {
        console.warn('Speech notice:', error);
      },
      true
    );
  };

  const handleManualToggleListening = () => {
    if (isListening) {
      if (liveTranscript.trim()) {
        handleSendQuery(liveTranscript.trim());
      } else {
        speechRecognizer.stop();
        setIsListening(false);
      }
    } else {
      startAutoListening();
    }
  };

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    speechRecognizer.setProcessingTurn(true);

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: queryText,
      timestamp: Date.now()
    };
    onNewMessage(userMsg);

    setIsThinking(true);
    setStreamingResponse('');
    setActiveCommands([]);
    setLiveTranscript('');

    const nexisMsgId = 'nexis-' + Date.now();
    let accumulatedText = '';
    const capturedCommands: CommandResult[] = [];

    try {
      await streamLocalLLMResponse({
        prompt: queryText,
        history: [...messages, userMsg],
        onToken: (token) => {
          setIsThinking(false);
          accumulatedText += token;
          setStreamingResponse(accumulatedText);
        },
        onCommandExecuted: (cmd) => {
          capturedCommands.push(cmd);
          setActiveCommands([...capturedCommands]);
        },
        onComplete: (full, cmds) => {
          setIsThinking(false);
          const nexisMsg: ChatMessage = {
            id: nexisMsgId,
            sender: 'nexis',
            text: full,
            timestamp: Date.now(),
            commandResults: cmds
          };
          onNewMessage(nexisMsg);

          // Safety auto-resume listening when TTS ends
          setTimeout(() => {
            if (!piperTTS.getIsSpeaking() && handsFree) {
              speechRecognizer.resumeHandsFreeListening();
              setIsListening(true);
            }
          }, 1000);
        }
      });
    } catch (err) {
      setIsThinking(false);
      setStreamingResponse("À vos ordres, Monsieur Albert.");
      if (handsFree) {
        speechRecognizer.resumeHandsFreeListening();
        setIsListening(true);
      }
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      piperTTS.setVoiceConfig({ volume: 1.0 });
      setIsMuted(false);
    } else {
      piperTTS.setVoiceConfig({ volume: 0 });
      piperTTS.stop();
      setIsMuted(true);
    }
  };

  const cycleBiometricMode = () => {
    const nextMode = biometricMode === 'lenient' ? 'strict' : biometricMode === 'strict' ? 'disabled' : 'lenient';
    setBiometricFilterMode(nextMode);
    setBiometricModeState(nextMode);
    playAlertChime('confirm');
  };

  const visualizerStatus = isSpeaking
    ? 'speaking'
    : isThinking
    ? 'thinking'
    : isListening
    ? 'listening'
    : 'idle';

  const sampleCommands = [
    'Ali, statut du système',
    'Minuteur 2 minutes',
    'Calcule 500 fois 1.2',
    'Active la défense sentinelle',
    'Nettoie la mémoire tampon'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#05080e]/98 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden animate-in fade-in duration-200">
      {/* Background Holographic Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Mobile Top Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
          <span className="text-sm font-bold font-mono tracking-wider text-white">
            ALI LIVE HUD
          </span>
          <span className="text-slate-600">·</span>
          <button
            onClick={cycleBiometricMode}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-800 bg-slate-900/80 hover:border-cyan-500/40 text-cyan-300 transition-colors cursor-pointer"
            title="Changer le niveau de filtrage biométrique"
          >
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>Filtre: {biometricMode === 'lenient' ? 'Tolérant' : biometricMode === 'strict' ? 'Strict Albert' : 'Désactivé'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            title={isMuted ? 'Activer la voix' : 'Couper la voix'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Mobile Stage: Arc Reactor Visualizer & Speech Card */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto max-w-sm mx-auto w-full">
        {/* Core Reactor */}
        <div className="my-2">
          <HolographicVisualizer
            status={visualizerStatus}
            theme={theme}
            size={190}
            showDetails={false}
          />
        </div>

        {/* Live Audio Status */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono tracking-wider uppercase">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking
                ? 'bg-cyan-400 animate-ping'
                : isThinking
                ? 'bg-amber-400 animate-pulse'
                : isListening
                ? 'bg-rose-400 animate-bounce'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-slate-200 font-semibold">
            {isSpeaking && 'Ali vous répond...'}
            {isThinking && 'Exécution de vos ordres...'}
            {isListening && `Micro à l'écoute (${micLevel} dB)`}
            {!isSpeaking && !isThinking && !isListening && 'Prêt · Parlez naturellement'}
          </span>
        </div>

        {/* Live Transcribed Speech Card with Instant Commit Action */}
        {liveTranscript && (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center justify-between gap-2 max-w-xs w-full shadow-[0_0_15px_rgba(34,211,238,0.2)] animate-in fade-in">
            <div className="flex items-center gap-2 truncate">
              <Mic className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
              <span className="truncate">« {liveTranscript} »</span>
            </div>
            <button
              onClick={() => handleSendQuery(liveTranscript)}
              className="px-2 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-[10px] font-bold uppercase shrink-0 transition-all cursor-pointer shadow flex items-center gap-1"
            >
              <span>Envoyer</span>
              <Send className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Streaming Answer Card - Synchronized with Voice */}
        {streamingResponse && (
          <div className="mt-3 w-full max-h-44 overflow-y-auto p-3 rounded-xl bg-slate-900/95 border border-cyan-500/30 shadow-xl text-slate-100 text-xs leading-relaxed font-sans backdrop-blur-md">
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 mb-1 border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                RÉPONSE EN COURS
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Voix synchronisée
              </span>
            </div>
            <p className="whitespace-pre-wrap">{streamingResponse}</p>
          </div>
        )}

        {/* Captured Command Badges */}
        {activeCommands.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
            {activeCommands.map(cmd => (
              <div
                key={cmd.id}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300"
              >
                <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="font-semibold">{cmd.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Hands-Free Controls */}
      <div className="relative z-10 flex flex-col items-center gap-2 max-w-sm mx-auto w-full pb-2">
        {/* Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full no-scrollbar pb-1">
          {sampleCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(cmd)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-300 whitespace-nowrap shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Big Touch Mic Trigger with dynamic pulse */}
        <button
          onClick={handleManualToggleListening}
          style={{
            transform: isListening ? `scale(${1 + Math.min(0.2, micLevel / 220)})` : 'scale(1)'
          }}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-90 ${
            isListening
              ? 'bg-rose-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.7)] animate-pulse'
              : 'bg-cyan-400 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.5)]'
          }`}
          title={isListening ? 'Micro actif - Cliquez pour valider' : 'Démarrer l\'écoute'}
        >
          {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7 text-slate-950" />}
        </button>

        <p className="text-[10px] font-mono text-slate-400 text-center">
          {isListening
            ? '✨ Écoute continue active : Parlez, Ali répond à la voix et réécoute automatiquement !'
            : 'Cliquez sur le micro pour parler à Ali'}
        </p>
      </div>
    </div>
  );
};
