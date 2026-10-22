import { PiperVoiceConfig } from '../types';
import { getSavedVoiceprint, verifyVoiceprintAcoustic, getBiometricFilterMode } from './voiceprintAuth';

const BANNED_FEMALE_KEYWORDS = [
  'hortense', 'julie', 'celine', 'denise', 'corinne', 'virginie', 'charlotte',
  'lea', 'amelie', 'female', 'femme', 'woman', 'zira', 'eva', 'elena', 'cosette',
  'mathilde', 'helene', 'siri', 'alice', 'audrey', 'marion', 'claire', 'elodie',
  'gabrielle', 'sylvie', 'manon', 'aurore', 'lucie', 'justine', 'camille', 'emma',
  'chloe', 'sarah', 'ines', 'zoe', 'lola', 'louise', 'jade', 'anna',
  'sophie', 'marie', 'jeanne', 'monique', 'fr-fr-wavenet-a', 'fr-fr-standard-a',
  'fr-fr-neural2-a', 'fr-fr-wavenet-c', 'fr-fr-standard-c', 'fr-fr-neural2-c'
];

const PREFERRED_MALE_KEYWORDS = [
  'henri', 'alain', 'claude', 'maurice', 'thomas', 'nicolas', 'paul', 'antoine',
  'mathieu', 'pierre', 'louis', 'male', 'homme', 'guy', 'david', 'george',
  'arthur', 'daniel', 'fred', 'alex', 'oliver', 'bernard', 'jacques', 'michel',
  'fr-fr-wavenet-b', 'fr-fr-standard-b', 'fr-fr-neural2-b', 'fr-fr-wavenet-d',
  'fr-fr-standard-d', 'fr-fr-neural2-d'
];

class PiperAudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isSpeaking: boolean = false;
  private speechQueue: string[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private synth: SpeechSynthesis | null = null;
  private listeners: Set<(isSpeaking: boolean) => void> = new Set();
  private visualizerData: Uint8Array = new Uint8Array(48);
  private animFrameId: number | null = null;
  private lastUsedEngine: 'edge_online' | 'piper_offline' = 'piper_offline';
  private lastUsedVoiceName: string = 'Voix Masculine Ali';
  private onFinishedSpeakingCallback: (() => void) | null = null;
  private streamingBuffer: string = '';
  private streamSessionActive: boolean = false;
  private isProcessingQueueItem: boolean = false;

  private voiceConfig: PiperVoiceConfig = {
    enabled: true,
    engineMode: 'auto',
    profileName: 'fr_male_piper_siwis',
    edgeVoice: 'fr-FR-HenriNeural',
    pitch: 0.74, // Deep baritone Jarvis timbre
    rate: 1.05,
    volume: 1.0,
    formantResonance: true,
    autoSpeak: true,
    assistantName: 'ALI',
    wakeWordEnabled: true,
    micNoiseGate: 15,
    handsFreeMode: true,
    forceStrictMaleVoice: true
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis || null;
      this.initAudioContext();
    }
  }

  private initAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && !this.audioCtx) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.7;
      }
    } catch {
      // AudioContext deferred
    }
  }

  public setVoiceConfig(newConfig: Partial<PiperVoiceConfig>) {
    this.voiceConfig = { ...this.voiceConfig, ...newConfig };
  }

  public getVoiceConfig(): PiperVoiceConfig {
    return { ...this.voiceConfig };
  }

  public setOnFinishedSpeaking(cb: (() => void) | null) {
    this.onFinishedSpeakingCallback = cb;
  }

  public subscribeSpeakingState(callback: (speaking: boolean) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifySpeakingState(state: boolean) {
    if (this.isSpeaking === state) return;
    this.isSpeaking = state;
    this.listeners.forEach(cb => cb(state));

    if (state) {
      this.startSynthesizedWaveform();
    } else {
      this.stopSynthesizedWaveform();
      // Notify hands-free loop to auto-resume listening when truly finished
      this.onFinishedSpeakingCallback?.();
    }
  }

  public getCurrentEngine(): 'edge_online' | 'piper_offline' {
    return this.lastUsedEngine;
  }

  public getActiveVoiceName(): string {
    return this.lastUsedVoiceName;
  }

  /**
   * Strictly resolves ONLY masculine voices, never female.
   */
  private resolveBestMaleVoice(): { voice: SpeechSynthesisVoice | null; engine: 'edge_online' | 'piper_offline'; name: string; pitchModifier: number } {
    if (!this.synth) {
      return { voice: null, engine: 'piper_offline', name: 'Synthèse Web', pitchModifier: 0.74 };
    }

    const rawVoices = this.synth.getVoices();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    const preferEdge = this.voiceConfig.engineMode === 'edge_online' || (this.voiceConfig.engineMode === 'auto' && isOnline);

    // Hard filter out any female voice names
    const filteredMaleVoices = rawVoices.filter(v => {
      const lower = v.name.toLowerCase();
      return !BANNED_FEMALE_KEYWORDS.some(banned => lower.includes(banned));
    });

    // 1. Online: Microsoft Edge Natural Male Voices (Henri, Alain, Claude, Maurice)
    if (preferEdge && isOnline && rawVoices.length > 0) {
      const edgeTarget = this.voiceConfig.edgeVoice.toLowerCase();
      const edgeSnippet = edgeTarget.replace('fr-fr-', '').replace('neural', '');

      const specificEdge = filteredMaleVoices.find(v => {
        const lower = v.name.toLowerCase();
        return (lower.includes('microsoft') || lower.includes('online')) &&
               lower.includes(edgeSnippet);
      });
      if (specificEdge) {
        return { voice: specificEdge, engine: 'edge_online', name: 'Voix Masculine Ali HD', pitchModifier: 0.88 };
      }

      const anyEdgeMale = filteredMaleVoices.find(v => {
        const lower = v.name.toLowerCase();
        const isFr = v.lang.toLowerCase().startsWith('fr') || lower.includes('french');
        const isMale = PREFERRED_MALE_KEYWORDS.some(k => lower.includes(k));
        return (lower.includes('microsoft') || lower.includes('online')) && isFr && isMale;
      });
      if (anyEdgeMale) {
        return { voice: anyEdgeMale, engine: 'edge_online', name: 'Voix Masculine Ali HD', pitchModifier: 0.88 };
      }
    }

    // 2. Offline / Local: Piper TTS Masculine Voice Selection
    const localMaleFr = filteredMaleVoices.find(v => {
      const lower = v.name.toLowerCase();
      const isFr = v.lang.toLowerCase().startsWith('fr');
      const isMale = PREFERRED_MALE_KEYWORDS.some(k => lower.includes(k));
      return isFr && isMale;
    });

    if (localMaleFr) {
      return { voice: localMaleFr, engine: 'piper_offline', name: 'Voix Masculine Ali', pitchModifier: 0.76 };
    }

    const anySafeFr = filteredMaleVoices.find(v => v.lang.toLowerCase().startsWith('fr'));
    if (anySafeFr) {
      return { voice: anySafeFr, engine: 'piper_offline', name: 'Voix Masculine Ali', pitchModifier: 0.72 };
    }

    // Deep pitch shift (0.68) so fallback voice sounds deep, masculine and robotized
    const fallbackVoice = rawVoices.find(v => !BANNED_FEMALE_KEYWORDS.some(b => v.name.toLowerCase().includes(b))) || rawVoices[0] || null;
    return {
      voice: fallbackVoice,
      engine: 'piper_offline',
      name: 'Voix Masculine Baryton',
      pitchModifier: 0.68
    };
  }

  /**
   * Initializes a new streaming speech turn.
   * Cancels prior speech once, resets queue, arms the engine.
   */
  public startSpeechSession() {
    this.speechQueue = [];
    this.streamingBuffer = '';
    this.streamSessionActive = true;
    this.isProcessingQueueItem = false;

    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Feed streaming tokens into the synchronizer.
   * Emits speech as soon as a natural breath clause is formed.
   */
  public feedStreamToken(token: string) {
    if (!this.voiceConfig.enabled || !this.voiceConfig.autoSpeak) return;

    this.streamingBuffer += token;

    // Detect natural spoken clauses: punctuation (. ! ? : \n) or comma if long enough
    const match = this.streamingBuffer.match(/([^\.!\?\n:;]+[\.!\?\n:;]+)\s*/);
    if (match) {
      const clause = match[1].trim();
      this.streamingBuffer = this.streamingBuffer.slice(match[0].length);
      if (clause.length > 2) {
        this.enqueueClause(clause);
      }
    } else {
      // If accumulated text is long (>= 10 words) without punctuation, split at word boundary for live flow
      const words = this.streamingBuffer.trim().split(/\s+/);
      if (words.length >= 10) {
        const clause = words.slice(0, 8).join(' ');
        this.streamingBuffer = words.slice(8).join(' ');
        this.enqueueClause(clause);
      }
    }
  }

  /**
   * Closes the streaming session and queues the final words.
   */
  public endStreamTokens() {
    this.streamSessionActive = false;
    if (this.streamingBuffer.trim()) {
      this.enqueueClause(this.streamingBuffer.trim());
      this.streamingBuffer = '';
    }

    if (this.speechQueue.length === 0 && !this.isProcessingQueueItem) {
      this.notifySpeakingState(false);
    }
  }

  private enqueueClause(clause: string) {
    const clean = clause
      .replace(/```[\s\S]*?```/g, '') // strip code blocks
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!clean) return;

    this.speechQueue.push(clean);
    this.notifySpeakingState(true);

    if (!this.isProcessingQueueItem) {
      this.processNextInQueue();
    }
  }

  private processNextInQueue() {
    if (this.speechQueue.length === 0) {
      this.isProcessingQueueItem = false;
      if (!this.streamSessionActive) {
        this.notifySpeakingState(false);
      }
      return;
    }

    const nextText = this.speechQueue.shift();
    if (!nextText || !this.synth) {
      this.isProcessingQueueItem = false;
      return;
    }

    this.isProcessingQueueItem = true;
    this.notifySpeakingState(true);

    const utterance = new SpeechSynthesisUtterance(nextText);
    utterance.lang = 'fr-FR';

    const { voice, engine, name, pitchModifier } = this.resolveBestMaleVoice();
    this.lastUsedEngine = engine;
    this.lastUsedVoiceName = name;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.pitch = Math.min(pitchModifier, this.voiceConfig.pitch);
    utterance.rate = this.voiceConfig.rate;
    utterance.volume = this.voiceConfig.volume;

    utterance.onend = () => {
      this.currentUtterance = null;
      // Do NOT notifySpeakingState(false) here if there are remaining clauses or session active!
      this.processNextInQueue();
    };

    utterance.onerror = (e) => {
      console.warn('Utterance playback error:', e);
      this.currentUtterance = null;
      this.processNextInQueue();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * Speak standalone complete sentence (e.g. for greetings or error alerts).
   */
  public speak(text: string, onEnd?: () => void): void {
    if (!this.synth || !this.voiceConfig.enabled) {
      onEnd?.();
      return;
    }

    this.startSpeechSession();
    this.enqueueClause(text);
    this.streamSessionActive = false;

    if (onEnd) {
      const prevCallback = this.onFinishedSpeakingCallback;
      this.setOnFinishedSpeaking(() => {
        onEnd();
        this.setOnFinishedSpeaking(prevCallback);
      });
    }
  }

  public stop(): void {
    this.speechQueue = [];
    this.streamingBuffer = '';
    this.streamSessionActive = false;
    this.isProcessingQueueItem = false;

    if (this.synth) {
      this.synth.cancel();
    }
    this.notifySpeakingState(false);
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  private startSynthesizedWaveform() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    let phase = 0;

    const renderLoop = () => {
      if (!this.isSpeaking) {
        this.visualizerData.fill(0);
        return;
      }
      phase += 0.18;
      for (let i = 0; i < this.visualizerData.length; i++) {
        const v1 = Math.sin(phase * 2.1 + i * 0.25);
        const v2 = Math.sin(phase * 1.1 + i * 0.42);
        const v3 = Math.cos(phase * 3.4 + i * 0.12);
        const combined = Math.abs(v1 * 0.5 + v2 * 0.35 + v3 * 0.15);
        this.visualizerData[i] = Math.min(255, Math.floor(combined * 190 + 35));
      }
      this.animFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }

  private stopSynthesizedWaveform() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.visualizerData.fill(0);
  }

  public getVisualizerData(): Uint8Array {
    return this.visualizerData;
  }
}

export const piperTTS = new PiperAudioEngine();

/**
/**
 * High-Resilience Hands-Free Continuous Speech Recognizer
 * Real-time interim streaming, instant acoustic responsiveness, and Albert biometric verification.
 */
export class NexisSpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private audioStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animId: number | null = null;
  private currentVolume: number = 0;
  private currentSpectrum: Uint8Array = new Uint8Array(32);

  private micLevelCallbacks: Set<(volume: number, spectrum: Uint8Array) => void> = new Set();
  private listeningListeners: Set<(isListening: boolean) => void> = new Set();
  private interimListeners: Set<(interimText: string) => void> = new Set();

  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onVoiceprintRejectedCallback: (() => void) | null = null;

  private handsFreeActive: boolean = false;
  private lastTranscribedText: string = '';
  private liveInterimText: string = '';
  private isProcessingTurn: boolean = false;
  private restartTimeout: any = null;
  private silenceAutoCommitTimeout: any = null;
  private speechDetectedSoundPlayed: boolean = false;

  // Active speech frames accumulator for biometric matching
  private activeSpeechFrames: Uint8Array[] = [];

  constructor() {
    this.initRecognition();

    // Auto-resume listening as soon as Ali finishes speaking
    piperTTS.setOnFinishedSpeaking(() => {
      if (this.handsFreeActive && !this.isProcessingTurn) {
        this.resumeHandsFreeListening();
      }
    });
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition API non supportée dans ce navigateur.');
      return;
    }

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {}
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'fr-FR';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.notifyListeningState(true);
      };

      this.recognition.onresult = (event: any) => {
        if (this.isProcessingTurn || piperTTS.getIsSpeaking()) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const candidateText = (finalTranscript || interimTranscript).trim();
        if (!candidateText) return;

        // Sound cue on first spoken words
        if (!this.speechDetectedSoundPlayed && candidateText.length >= 2) {
          this.speechDetectedSoundPlayed = true;
        }

        this.lastTranscribedText = candidateText;
        this.liveInterimText = candidateText;

        // Broadcast interim words to all listeners in real-time
        this.interimListeners.forEach(cb => cb(candidateText));
        this.onResultCallback?.(candidateText, false);

        // If engine marked final transcript, commit immediately!
        if (finalTranscript.trim()) {
          this.commitTranscript(finalTranscript.trim());
          return;
        }

        // Smart auto-commit: 1300ms pause after speaking commits automatically
        if (this.silenceAutoCommitTimeout) clearTimeout(this.silenceAutoCommitTimeout);
        this.silenceAutoCommitTimeout = setTimeout(() => {
          if (this.lastTranscribedText && !this.isProcessingTurn && !piperTTS.getIsSpeaking()) {
            this.commitTranscript(this.lastTranscribedText);
          }
        }, 1300);
      };

      this.recognition.onerror = (e: any) => {
        const errType = e?.error || 'unknown';
        console.warn('SpeechRecognition event:', errType);

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          this.onErrorCallback?.('Accès au microphone non autorisé. Veuillez cliquer sur l\'icône cadenas de votre navigateur pour autoriser le micro.');
          this.stop();
          return;
        }

        if (errType === 'no-speech') {
          // Normal pause in conversation; soft reschedule
          if (this.handsFreeActive && this.isListening && !piperTTS.getIsSpeaking()) {
            this.scheduleRestart();
          }
          return;
        }

        // Temporary network or audio-capture drop
        if (this.handsFreeActive && this.isListening && !piperTTS.getIsSpeaking()) {
          this.scheduleRestart();
        }
      };

      this.recognition.onend = () => {
        // Automatically restart speech recognition in hands-free continuous mode
        if (this.handsFreeActive && this.isListening && !piperTTS.getIsSpeaking() && !this.isProcessingTurn) {
          this.scheduleRestart();
        } else if (!this.handsFreeActive && !this.isProcessingTurn) {
          this.notifyListeningState(false);
        }
      };
    } catch (err) {
      console.warn('Erreur initialisation SpeechRecognition:', err);
    }
  }

  private commitTranscript(text: string) {
    if (this.silenceAutoCommitTimeout) {
      clearTimeout(this.silenceAutoCommitTimeout);
      this.silenceAutoCommitTimeout = null;
    }

    const clean = text.trim();
    if (!clean || clean.length < 2 || this.isProcessingTurn) return;

    // Biometric check for Albert
    const voiceprint = getSavedVoiceprint();
    const mode = getBiometricFilterMode();

    if (voiceprint.enrolled && mode === 'strict') {
      const auth = verifyVoiceprintAcoustic(this.activeSpeechFrames, voiceprint);
      if (!auth.isAlbert) {
        this.onVoiceprintRejectedCallback?.();
      }
    }

    this.activeSpeechFrames = [];
    this.speechDetectedSoundPlayed = false;
    this.isProcessingTurn = true;
    this.liveInterimText = '';
    this.interimListeners.forEach(cb => cb(''));

    this.onResultCallback?.(clean, true);
  }

  private scheduleRestart() {
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      if (this.handsFreeActive && this.isListening && !piperTTS.getIsSpeaking() && !this.isProcessingTurn) {
        try {
          if (!this.recognition) {
            this.initRecognition();
          }
          this.recognition?.start();
        } catch {
          // If start fails because already running or invalid state, re-init cleanly
          try {
            this.initRecognition();
            this.recognition?.start();
          } catch {}
        }
      }
    }, 200);
  }

  private notifyListeningState(listening: boolean) {
    if (this.isListening === listening) return;
    this.isListening = listening;
    this.listeningListeners.forEach(cb => cb(listening));
  }

  public subscribeListeningState(callback: (isListening: boolean) => void) {
    this.listeningListeners.add(callback);
    callback(this.isListening);
    return () => {
      this.listeningListeners.delete(callback);
    };
  }

  public subscribeInterimTranscript(callback: (interimText: string) => void) {
    this.interimListeners.add(callback);
    callback(this.liveInterimText);
    return () => {
      this.interimListeners.delete(callback);
    };
  }

  public subscribeMicStream(callback: (volume: number, spectrum: Uint8Array) => void) {
    this.micLevelCallbacks.add(callback);
    return () => {
      this.micLevelCallbacks.delete(callback);
    };
  }

  public setOnVoiceprintRejected(cb: (() => void) | null) {
    this.onVoiceprintRejectedCallback = cb;
  }

  public setProcessingTurn(processing: boolean) {
    this.isProcessingTurn = processing;
    if (processing && this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  public getCurrentVolume(): number {
    return this.currentVolume;
  }

  public getCurrentSpectrum(): Uint8Array {
    return this.currentSpectrum;
  }

  public getLiveInterimText(): string {
    return this.liveInterimText;
  }

  /**
   * Allows Albert to manually force-commit whatever text is in buffer right now
   */
  public forceCommit() {
    if (this.lastTranscribedText) {
      this.commitTranscript(this.lastTranscribedText);
    }
  }

  private async startMicrophoneHardware() {
    try {
      if (!this.audioStream) {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume();
        }

        const source = this.audioCtx.createMediaStreamSource(this.audioStream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.5;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const tick = () => {
          if (!this.isListening || !this.analyser) return;

          this.analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalizedVol = Math.min(100, Math.round((avg / 255) * 100));
          this.currentVolume = normalizedVol;
          this.currentSpectrum = new Uint8Array(dataArray);

          // If volume > 12 (speech active), accumulate frame for biometric authentication
          if (normalizedVol > 12 && !piperTTS.getIsSpeaking()) {
            this.activeSpeechFrames.push(new Uint8Array(dataArray));
            if (this.activeSpeechFrames.length > 50) {
              this.activeSpeechFrames.shift();
            }
          }

          this.micLevelCallbacks.forEach(cb => cb(normalizedVol, dataArray));
          this.animId = requestAnimationFrame(tick);
        };

        this.animId = requestAnimationFrame(tick);
      } else if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch (err: any) {
      console.warn('Microphone hardware init notice:', err);
    }
  }

  private stopMicrophoneHardware() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.currentVolume = 0;
    this.currentSpectrum = new Uint8Array(32);
    this.micLevelCallbacks.forEach(cb => cb(0, new Uint8Array(32)));
  }

  public async start(onResult: (text: string, isFinal: boolean) => void, onError?: (err: string) => void, handsFree = true) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError || null;
    this.handsFreeActive = handsFree;
    this.isProcessingTurn = false;
    this.lastTranscribedText = '';
    this.liveInterimText = '';
    this.activeSpeechFrames = [];
    this.speechDetectedSoundPlayed = false;

    this.notifyListeningState(true);

    await this.startMicrophoneHardware();

    try {
      this.initRecognition();
      if (this.recognition) {
        this.recognition.start();
      }
    } catch {
      // Already running
    }
  }

  public resumeHandsFreeListening() {
    if (!this.handsFreeActive) return;
    this.isProcessingTurn = false;
    this.lastTranscribedText = '';
    this.liveInterimText = '';
    this.activeSpeechFrames = [];
    this.speechDetectedSoundPlayed = false;
    this.notifyListeningState(true);

    this.scheduleRestart();
  }

  public stop() {
    this.notifyListeningState(false);
    this.handsFreeActive = false;
    this.liveInterimText = '';
    this.interimListeners.forEach(cb => cb(''));

    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    if (this.silenceAutoCommitTimeout) clearTimeout(this.silenceAutoCommitTimeout);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.stopMicrophoneHardware();
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechRecognizer = new NexisSpeechRecognizer();
