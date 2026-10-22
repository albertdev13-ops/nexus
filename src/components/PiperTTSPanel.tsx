import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Sliders,
  Radio,
  CheckCircle2,
  Sparkles,
  Mic,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { piperTTS, speechRecognizer } from '../services/piperTTS';
import { PiperVoiceConfig, VoiceprintProfile } from '../types';
import { getSavedVoiceprint, enrollAlbertVoiceprint, getSavedPasscode, savePasscode, saveVoiceprint } from '../services/voiceprintAuth';
import { playAlertChime } from '../services/commandSystem';

export const PiperTTSPanel: React.FC = () => {
  const [config, setConfig] = useState<PiperVoiceConfig>(piperTTS.getVoiceConfig());
  const [voiceprint, setVoiceprint] = useState<VoiceprintProfile>(getSavedVoiceprint());
  const [passcode, setPasscode] = useState(getSavedPasscode());
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeSaved, setPasscodeSaved] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibProgress, setCalibProgress] = useState(0);

  const [testPhrase, setTestPhrase] = useState(
    'Initialisation terminée, Monsieur Albert. Je ne réponds qu\'à votre voix masculine. À vos ordres.'
  );
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [micTestStatus, setMicTestStatus] = useState<string | null>(null);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [liveMicVol, setLiveMicVol] = useState(0);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    if (isMicTesting || isCalibrating) {
      unsub = speechRecognizer.subscribeMicStream((vol) => {
        setLiveMicVol(vol);
      });
    } else {
      setLiveMicVol(0);
    }
    return () => {
      unsub?.();
    };
  }, [isMicTesting, isCalibrating]);

  const handleUpdateConfig = (newValues: Partial<PiperVoiceConfig>) => {
    const updated = { ...config, ...newValues };
    setConfig(updated);
    piperTTS.setVoiceConfig(updated);
  };

  const handlePlayTest = () => {
    if (isPlayingTest) {
      piperTTS.stop();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    piperTTS.speak(testPhrase, () => {
      setIsPlayingTest(false);
    });
  };

  const handleSavePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscode.length === 4) {
      savePasscode(newPasscode);
      setPasscode(newPasscode);
      setNewPasscode('');
      setPasscodeSaved(true);
      playAlertChime('confirm');
      setTimeout(() => setPasscodeSaved(false), 2500);
    }
  };

  const handleRecalibrateVoiceprint = async () => {
    setIsCalibrating(true);
    setCalibProgress(10);
    playAlertChime('beep');

    piperTTS.speak("Albert, prononcez : Moi, Albert, j'active Ali comme mon assistant personnel.");

    const samples: Uint8Array[] = [];
    const unsub = speechRecognizer.subscribeMicStream((vol, data) => {
      if (vol > 15) samples.push(new Uint8Array(data));
    });

    await speechRecognizer.start(() => {});

    let p = 15;
    const interval = setInterval(() => {
      p += 20;
      setCalibProgress(Math.min(95, p));
      if (p >= 95) clearInterval(interval);
    }, 700);

    setTimeout(() => {
      clearInterval(interval);
      unsub();
      speechRecognizer.stop();
      setIsCalibrating(false);

      const enrolled = enrollAlbertVoiceprint(samples);
      setVoiceprint(enrolled);
      setCalibProgress(100);
      playAlertChime('confirm');

      piperTTS.speak("Empreinte vocale d'Albert mise à jour avec succès.");
    }, 4500);
  };

  const handleTestMic = async () => {
    if (isMicTesting) {
      speechRecognizer.stop();
      setIsMicTesting(false);
      return;
    }

    setIsMicTesting(true);
    setMicTestStatus('Écoute en direct...');

    await speechRecognizer.start(
      (text) => {
        setMicTestStatus(`Reconnu : « ${text} »`);
      },
      (err) => {
        setMicTestStatus(`Statut : ${err}`);
      }
    );
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto py-1 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            Paramètres Vocaux & Authentification
          </h2>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Calibrage biométrique exclusif pour Albert
          </p>
        </div>

        <button
          onClick={() => handleUpdateConfig({ enabled: !config.enabled })}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
            config.enabled
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border border-slate-800 text-slate-500'
          }`}
        >
          {config.enabled ? 'Vocal On' : 'Vocal Off'}
        </button>
      </div>

      {/* Card 1: Albert Voiceprint Biometric Status */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
            <Fingerprint className="w-4 h-4 text-cyan-400" />
            <span>Empreinte Vocale d'Albert</span>
          </div>

          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
            voiceprint.enrolled
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-amber-950 text-amber-300 border border-amber-800'
          }`}>
            {voiceprint.enrolled ? 'ENREGISTRÉE (ALBERT)' : 'NON CALIBRÉE'}
          </span>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          Ali n'exécute aucun ordre provenant d'une voix non reconnue. Seul Albert a l'autorité vocale.
        </p>

        {isCalibrating && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Calibrage en cours ({liveMicVol} dB)...</span>
              <span className="text-cyan-400">{calibProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                style={{ width: `${calibProgress}%` }}
                className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_#22d3ee]"
              />
            </div>
          </div>
        )}

        {/* Filter Mode Selector */}
        <div className="pt-2 border-t border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Mode de filtrage biométrique :</span>
            <span className="text-cyan-400 font-semibold uppercase">{voiceprint.filterMode || 'lenient'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'lenient', label: 'Tolérant', desc: 'Idéal au quotidien' },
              { id: 'strict', label: 'Strict Albert', desc: 'Sécurité maximale' },
              { id: 'disabled', label: 'Désactivé', desc: 'Micro toujours ouvert' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const updated = { ...voiceprint, filterMode: m.id as any };
                  setVoiceprint(updated);
                  saveVoiceprint(updated);
                  playAlertChime('confirm');
                }}
                className={`p-2 rounded-xl text-center text-xs font-mono transition-all cursor-pointer border ${
                  (voiceprint.filterMode || 'lenient') === m.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold">{m.label}</div>
                <div className="text-[9px] text-slate-500">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRecalibrateVoiceprint}
          disabled={isCalibrating}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            isCalibrating
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
          <span>
            {isCalibrating ? 'Enregistrement en cours...' : 'Ré-enregistrer l\'Empreinte Vocale'}
          </span>
        </button>
      </div>

      {/* Card 2: Security Passcode PIN Management */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Code Secret d'Ouverture</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Actuel : <strong className="text-cyan-400">{passcode}</strong>
          </span>
        </div>

        <form onSubmit={handleSavePasscode} className="flex gap-2">
          <input
            type="password"
            maxLength={4}
            value={newPasscode}
            onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
            placeholder="Nouveau PIN (4 chiffres)"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={newPasscode.length !== 4}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
              newPasscode.length === 4
                ? 'bg-cyan-400 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Changer
          </button>
        </form>

        {passcodeSaved && (
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Nouveau code secret enregistré avec succès.</span>
          </div>
        )}
      </div>

      {/* Card 3: Strict Male Voice Acoustic Modulation */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-white uppercase">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Garantie Voix Masculine Exécutive
          </span>
          <span className="text-emerald-400 text-[10px]">100% Masculin</span>
        </div>

        <p className="text-xs text-slate-300 font-sans">
          Filtre acoustique baryton forcé (pitch 0.74x) pour empêcher formellement toute voix féminine.
        </p>

        {/* Pitch Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Tonalité Grave (Baryton)</span>
            <span className="text-cyan-400 font-bold">{config.pitch.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.65"
            max="0.88"
            step="0.01"
            value={config.pitch}
            onChange={(e) => handleUpdateConfig({ pitch: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Speech Rate Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Vitesse de Réponse</span>
            <span className="text-cyan-400 font-bold">{config.rate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.85"
            max="1.3"
            step="0.05"
            value={config.rate}
            onChange={(e) => handleUpdateConfig({ rate: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Card 4: Audio Test Bench */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Test de la Voix d'Ali
        </div>

        <textarea
          value={testPhrase}
          onChange={(e) => setTestPhrase(e.target.value)}
          rows={2}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500 resize-none"
        />

        <button
          onClick={handlePlayTest}
          className="w-full py-2.5 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(34,211,238,0.3)] cursor-pointer flex items-center justify-center gap-2"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isPlayingTest ? 'Arrêter' : 'Écouter la Voix Masculine d\'Ali'}</span>
        </button>
      </div>
    </div>
  );
};
