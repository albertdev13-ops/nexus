import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Shield, Mic, CheckCircle2, AlertTriangle, Fingerprint, RefreshCw } from 'lucide-react';
import { getSavedPasscode, getSavedVoiceprint, enrollAlbertVoiceprint, savePasscode } from '../services/voiceprintAuth';
import { piperTTS, speechRecognizer } from '../services/piperTTS';
import { playAlertChime } from '../services/commandSystem';

interface SecurityLockscreenProps {
  onUnlocked: () => void;
}

export const SecurityLockscreen: React.FC<SecurityLockscreenProps> = ({ onUnlocked }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [step, setStep] = useState<'pin' | 'voiceprint'>('pin');
  const [isRecordingVoiceprint, setIsRecordingVoiceprint] = useState(false);
  const [voiceSamples, setVoiceSamples] = useState<Uint8Array[]>([]);
  const [enrollProgress, setEnrollProgress] = useState(0);

  const correctPin = getSavedPasscode();
  const voiceprint = getSavedVoiceprint();

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      playAlertChime('beep');
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          playAlertChime('confirm');
          // If Albert hasn't enrolled his voiceprint yet, proceed to voiceprint enrollment
          if (!voiceprint.enrolled) {
            piperTTS.speak("Code d'accès validé, Monsieur Albert. Veuillez enregistrer votre empreinte vocale biométrique.");
            setStep('voiceprint');
          } else {
            piperTTS.speak("Système déverrouillé. Bonjour Monsieur Albert, je suis à vos ordres.");
            onUnlocked();
          }
        } else {
          playAlertChime('alarm');
          setError(true);
          setErrorMessage('Code incorrect. Réessayez.');
          setTimeout(() => setPin(''), 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleStartVoiceprintEnrollment = async () => {
    setIsRecordingVoiceprint(true);
    setVoiceSamples([]);
    setEnrollProgress(10);
    playAlertChime('beep');

    piperTTS.speak("Prononcez distinctement : Moi, Albert, j'active Ali comme mon assistant personnel.");

    const samples: Uint8Array[] = [];

    // Capture frequency spectrum across 4 seconds
    const unsub = speechRecognizer.subscribeMicStream((vol, data) => {
      if (vol > 18) {
        samples.push(new Uint8Array(data));
      }
    });

    await speechRecognizer.start((text) => {
      // transcript
    });

    let currentProg = 10;
    const interval = setInterval(() => {
      currentProg += 20;
      setEnrollProgress(Math.min(95, currentProg));
      if (currentProg >= 95) {
        clearInterval(interval);
      }
    }, 800);

    setTimeout(() => {
      clearInterval(interval);
      unsub();
      speechRecognizer.stop();
      setIsRecordingVoiceprint(false);

      // Finalize Albert's Voiceprint
      enrollAlbertVoiceprint(samples);
      setEnrollProgress(100);
      playAlertChime('confirm');

      piperTTS.speak("Empreinte vocale d'Albert enregistrée et mémorisée avec succès. Accès accordé.", () => {
        onUnlocked();
      });
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06090f] flex flex-col justify-between p-6 select-none overflow-y-auto">
      {/* Background Holographic Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col items-center text-center pt-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.2)] mb-4">
          {step === 'pin' ? (
            <Lock className="w-8 h-8 text-cyan-400" />
          ) : (
            <Fingerprint className="w-8 h-8 text-cyan-400 animate-pulse" />
          )}
        </div>

        <h1 className="text-xl font-bold font-mono tracking-widest text-white uppercase">
          {step === 'pin' ? 'SYSTÈME ALI VERROUILLÉ' : 'CALIBRATION EMPREINTE VOCALE'}
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1 max-w-xs">
          {step === 'pin'
            ? 'Veuillez saisir votre code secret pour autoriser l\'accès à Ali'
            : 'Enregistrement de la signature biométrique vocale d\'Albert'}
        </p>
      </div>

      {/* Main Body: PIN Entry or Voiceprint Calibration */}
      <div className="relative z-10 max-w-xs mx-auto w-full my-auto py-4">
        {step === 'pin' ? (
          <div className="flex flex-col items-center">
            {/* 4-digit PIN Dots */}
            <div className="flex items-center gap-4 my-6">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    error
                      ? 'border-rose-500 bg-rose-500 animate-bounce'
                      : pin.length > idx
                      ? 'border-cyan-400 bg-cyan-400 shadow-[0_0_12px_#22d3ee]'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="text-xs font-mono text-rose-400 mb-4 animate-in fade-in">
                {errorMessage}
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeyPress(digit)}
                  className="h-14 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-xl font-mono font-semibold text-slate-100 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  {digit}
                </button>
              ))}

              <div />

              <button
                onClick={() => handleKeyPress('0')}
                className="h-14 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-xl font-mono font-semibold text-slate-100 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md"
              >
                0
              </button>

              <button
                onClick={handleBackspace}
                className="h-14 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm font-mono text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              >
                Effacer
              </button>
            </div>

            <p className="text-[11px] font-mono text-slate-500 mt-6 text-center">
              Code secret par défaut : <span className="text-cyan-400 font-bold">1234</span>
            </p>
          </div>
        ) : (
          /* Step 2: Voiceprint Enrollment */
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 w-full space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase">
                Phrase d'étalonnage pour Albert :
              </div>
              <div className="text-sm font-sans font-semibold text-cyan-300 italic p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                « Moi, Albert, j'active Ali comme mon assistant personnel. »
              </div>
            </div>

            {/* Calibration Progress Bar */}
            {enrollProgress > 0 && (
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Analyse spectrale vocale...</span>
                  <span className="text-cyan-400">{enrollProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${enrollProgress}%` }}
                    className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_10px_#22d3ee]"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleStartVoiceprintEnrollment}
              disabled={isRecordingVoiceprint}
              className={`w-full py-3.5 px-4 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isRecordingVoiceprint
                  ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>
                {isRecordingVoiceprint
                  ? 'Écoute & Enregistrement en cours...'
                  : 'Enregistrer mon empreinte vocale'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                enrollAlbertVoiceprint([]);
                onUnlocked();
              }}
              disabled={isRecordingVoiceprint}
              className="text-xs font-mono text-slate-400 hover:text-cyan-400 underline transition-colors cursor-pointer py-1"
            >
              Passer et calibrer plus tard dans les réglages
            </button>

            <p className="text-[10px] font-mono text-slate-500">
              Une fois enregistrée, Ali n'écoutera et ne répondra qu'à votre voix.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="relative z-10 text-center pb-4 text-[10px] font-mono text-slate-500">
        Assistant Exécutif ALI · Conçu pour Albert · Confinement 100% Local
      </div>
    </div>
  );
};
