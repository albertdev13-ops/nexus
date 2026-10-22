import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Terminal,
  Clock,
  Battery,
  Calculator,
  CheckCircle2,
  FileText,
  Trash2,
  Globe,
  Radio
} from 'lucide-react';
import { ChatMessage, CommandResult } from '../types';
import { piperTTS, speechRecognizer } from '../services/piperTTS';
import { playAlertChime } from '../services/commandSystem';
import { AudioWaveformBar } from './AudioWaveformBar';

interface ChatConsoleProps {
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  activeCommands: CommandResult[];
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  isSpeaking: boolean;
  isOnline: boolean;
  className?: string;
}

export const ChatConsole: React.FC<ChatConsoleProps> = ({
  messages,
  streamingText,
  isStreaming,
  activeCommands,
  onSendMessage,
  onClearHistory,
  isSpeaking,
  isOnline,
  className = 'h-full'
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, activeCommands]);

  // Synchronize microphone state & real-time transcripts across all UI buttons
  useEffect(() => {
    const unsubListen = speechRecognizer.subscribeListeningState((listening) => {
      setIsListening(listening);
      if (!listening) {
        setLiveTranscript('');
      }
    });

    const unsubInterim = speechRecognizer.subscribeInterimTranscript((interim) => {
      setLiveTranscript(interim);
      if (interim) {
        setInputText(interim);
      }
    });

    return () => {
      unsubListen();
      unsubInterim();
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setLiveTranscript('');
  };

  const handleToggleVoiceInput = () => {
    if (speechRecognizer.getIsListening()) {
      speechRecognizer.stop();
      if (inputText.trim()) {
        handleSubmit();
      }
    } else {
      playAlertChime('listen_start');
      speechRecognizer.start(
        (transcript, isFinal) => {
          if (transcript) {
            setInputText(transcript);
          }
          if (isFinal && transcript.trim()) {
            speechRecognizer.stop();
            onSendMessage(transcript.trim());
            setInputText('');
            setLiveTranscript('');
            playAlertChime('confirm');
          }
        },
        (err) => {
          console.warn('Microphone notice:', err);
        }
      );
    }
  };

  const handleSpeakMessage = (text: string) => {
    piperTTS.speak(text);
  };

  const quickPrompts = [
    { label: 'Statut du système', text: 'Ali, donne-moi le statut complet du système' },
    { label: 'Défense active', text: 'Ali, active la défense sentinelle' },
    { label: 'Minuteur 3m', text: 'Minuteur de 3 minutes' },
    { label: 'Calcule 1540 * 1.2', text: 'Calcule 1540 * 1.2' },
    { label: 'Nettoie la mémoire', text: 'Ali, nettoie la mémoire vive' }
  ];

  const currentEngine = piperTTS.getCurrentEngine();

  return (
    <div className={`flex flex-col bg-[#070b12] rounded-xl border border-slate-800/80 shadow-2xl overflow-hidden ${className}`}>
      {/* Console Subheader with dual status */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-[#090e18]/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
            Console Exécutive ALI
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">Albert Autorisé</span>
        </div>

        <div className="flex items-center gap-2">

          {isSpeaking && (
            <button
              onClick={() => piperTTS.stop()}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Couper voix</span>
            </button>
          )}

          <button
            onClick={onClearHistory}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Effacer l'historique"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Stream View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Sender Tag */}
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase">
                {msg.sender === 'user' ? 'Vous' : 'NEXIS / ALI'}
              </span>
              <span className="text-[10px] font-mono text-slate-600">
                {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-xl p-4 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tr-none'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800/90 shadow-lg rounded-tl-none'
              }`}
            >
              {/* Formatted Text */}
              <div className="whitespace-pre-wrap font-sans">
                {renderFormattedContent(msg.text)}
              </div>

              {/* Render Command Execution Cards if present */}
              {msg.commandResults && msg.commandResults.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  {msg.commandResults.map((cmd) => (
                    <CommandExecutionCard key={cmd.id} cmd={cmd} />
                  ))}
                </div>
              )}

              {/* Action buttons for Nexis bubble */}
              {msg.sender === 'nexis' && (
                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Sécurisé · À vos ordres</span>
                  </div>
                  <button
                    onClick={() => handleSpeakMessage(msg.text)}
                    className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Écouter la synthèse vocale"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Écouter</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Streaming Response Bubble */}
        {isStreaming && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[11px] font-mono text-cyan-400 uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                ALI (Réponse en direct avec voix)
              </span>
            </div>

            <div className="max-w-2xl rounded-xl p-4 text-sm leading-relaxed bg-slate-900/95 text-slate-100 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] rounded-tl-none">
              <div className="whitespace-pre-wrap font-sans">
                {renderFormattedContent(streamingText)}
                <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
              </div>

              {/* Real-time executed commands during streaming */}
              {activeCommands.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  {activeCommands.map((cmd) => (
                    <CommandExecutionCard key={cmd.id} cmd={cmd} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Live Microphone Spectrum VU-Meter Bar */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-[#080d16]/80">
        <AudioWaveformBar isListening={isListening} isOnline={isOnline} />
      </div>

      {/* Suggested Command Strip */}
      <div className="px-4 py-2 border-t border-slate-800/60 bg-[#080d16]/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap uppercase">
          Commandes rapides :
        </span>
        {quickPrompts.map((q, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(q.text)}
            className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300 text-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Live Voice Capture HUD Banner (Ultra-Realistic Jarvis Feedback) */}
      {isListening && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-cyan-950/90 via-slate-900/95 to-cyan-950/90 border-t border-cyan-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  Capture Vocale Active · Albert
                </span>
                <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-1.5 py-0.2 rounded font-semibold">
                  Hors-Ligne
                </span>
              </div>
              <p className="text-xs font-mono text-white truncate font-medium mt-0.5">
                {liveTranscript ? (
                  <span className="text-cyan-200">"{liveTranscript}"</span>
                ) : (
                  <span className="text-slate-400 italic">Parlez maintenant... Ali capte votre voix en direct.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {liveTranscript && (
              <button
                type="button"
                onClick={() => {
                  speechRecognizer.forceCommit();
                }}
                className="px-2.5 py-1 text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
              >
                Valider
              </button>
            )}
            <button
              type="button"
              onClick={() => speechRecognizer.stop()}
              className="p-1 rounded text-slate-400 hover:text-rose-300 transition-colors"
              title="Fermer micro"
            >
              <MicOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Input Field with Prominent High-Class Microphone Button */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border-slate-800 bg-[#090d16]"
      >
        <div className="flex items-center gap-2.5 bg-slate-900/90 rounded-xl border border-slate-800 focus-within:border-cyan-500/60 transition-colors p-2">
          {/* Prominent Glowing Microphone Control */}
          <button
            type="button"
            onClick={handleToggleVoiceInput}
            className={`relative p-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)]'
            }`}
            title={isListening ? 'Arrêter écoute' : 'Parler au micro (Fonctionne hors-ligne)'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isListening
                ? 'Écoute active en cours... Parlez clairement (avec ou sans internet).'
                : 'Posez une question, demandez un calcul, un minuteur ou dites "Ali"...'
            }
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none py-1.5"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className={`px-3.5 py-2.5 rounded-lg transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-mono font-semibold ${
              inputText.trim() && !isStreaming
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-600 bg-slate-800/40 cursor-not-allowed'
            }`}
          >
            <span>Envoyer</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

// Sub-component for rendering command execution badges/cards
function CommandExecutionCard({ cmd }: { cmd: CommandResult }) {
  if (cmd.type === 'calc') {
    return (
      <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-200 flex items-start gap-2.5">
        <Calculator className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-cyan-300">{cmd.title}</div>
          <div className="text-slate-200 mt-0.5 text-sm">{cmd.details}</div>
        </div>
      </div>
    );
  }

  if (cmd.type === 'timer') {
    return (
      <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs font-mono text-amber-200 flex items-start gap-2.5">
        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-spin" />
        <div>
          <div className="font-semibold text-amber-300">{cmd.title}</div>
          <div className="text-slate-200 mt-0.5">{cmd.details}</div>
        </div>
      </div>
    );
  }

  if (cmd.type === 'system') {
    return (
      <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 flex items-start gap-2.5">
        <Battery className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-emerald-400">{cmd.title}</div>
          <div className="text-slate-300 mt-0.5 leading-relaxed">{cmd.details}</div>
        </div>
      </div>
    );
  }

  if (cmd.type === 'task') {
    return (
      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs font-mono text-emerald-200 flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-emerald-300">{cmd.title}</div>
          <div className="text-slate-200 mt-0.5">{cmd.details}</div>
        </div>
      </div>
    );
  }

  if (cmd.type === 'note') {
    return (
      <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 text-xs font-mono text-blue-200 flex items-start gap-2.5">
        <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-blue-300">{cmd.title}</div>
          <div className="text-slate-200 mt-0.5">{cmd.details}</div>
        </div>
      </div>
    );
  }

  if (cmd.type === 'code') {
    return (
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200">
        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
          <Terminal className="w-3.5 h-3.5" />
          <span>{cmd.title}</span>
        </div>
        <pre className="p-2 rounded bg-black/60 text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
          {cmd.details}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-2.5 rounded bg-slate-800/80 text-xs font-mono text-slate-300 flex items-center gap-2">
      <Zap className="w-3.5 h-3.5 text-cyan-400" />
      <span>{cmd.details}</span>
    </div>
  );
}

// Markdown renderer helper for clean code blocks, bolding, and lists
function renderFormattedContent(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n');
      const lang = lines[0].trim();
      const code = (lang && !lang.includes(' ') && lines.length > 1) ? lines.slice(1).join('\n') : lines.join('\n');

      return (
        <div key={index} className="my-2.5 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
          {lang && (
            <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
              {lang}
            </div>
          )}
          <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    return (
      <span key={index}>
        {part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((sub, i) => {
          if (sub.startsWith('`') && sub.endsWith('`')) {
            return (
              <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-xs text-cyan-300">
                {sub.slice(1, -1)}
              </code>
            );
          }
          if (sub.startsWith('**') && sub.endsWith('**')) {
            return (
              <strong key={i} className="font-semibold text-white">
                {sub.slice(2, -2)}
              </strong>
            );
          }
          return sub;
        })}
      </span>
    );
  });
}
