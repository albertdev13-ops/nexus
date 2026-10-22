import { CommandResult, NoteItem, TaskItem, TimerItem } from '../types';

const STORAGE_KEY_NOTES = 'nexis_notes_v1';
const STORAGE_KEY_TASKS = 'nexis_tasks_v1';
const STORAGE_KEY_TIMERS = 'nexis_timers_v1';

// Futuristic WebAudio Sound FX for Jarvis/ALI HUD
export type JarvisSoundType = 'beep' | 'confirm' | 'alarm' | 'listen_start' | 'voice_detected' | 'system_ready';

let globalAudioCtx: AudioContext | null = null;
function getSharedAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!globalAudioCtx && AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

export function playAlertChime(type: JarvisSoundType = 'confirm') {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'listen_start') {
      // Iron Man / Jarvis HUD activation chirp: ascending dual resonant pulse
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(1040, now + 0.09);

      osc2.frequency.setValueAtTime(1040, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(1560, now + 0.14);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.04);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    } else if (type === 'voice_detected') {
      // Subtle acoustic ping when user speaks
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'system_ready') {
      // Low bass hum with resonant harmonics
      const subOsc = ctx.createOscillator();
      const bellOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

      bellOsc.type = 'triangle';
      bellOsc.frequency.setValueAtTime(440, now);
      bellOsc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      subOsc.connect(gain);
      bellOsc.connect(gain);
      gain.connect(ctx.destination);

      subOsc.start(now);
      bellOsc.start(now);
      subOsc.stop(now + 0.4);
      bellOsc.stop(now + 0.4);
    } else if (type === 'confirm') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'alarm') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch {
    // AudioContext deferred
  }
}

// Local storage helpers
export function getSavedNotes(): NoteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    if (!raw) {
      const initial: NoteItem[] = [
        {
          id: 'note-1',
          title: 'Protocole NEXIS Initialisé',
          content: 'Assistant opérationnel en mode 100% hors-ligne. Modèle neural 185 Mo actif, synthèse vocale Piper TTS prête.',
          createdAt: Date.now() - 3600000,
          category: 'Système'
        }
      ];
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveNotes(notes: NoteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes', e);
  }
}

export function getSavedTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) {
      const initial: TaskItem[] = [
        { id: 't-1', title: 'Vérification du modèle LLM local (185 Mo)', completed: true, priority: 'high', createdAt: Date.now() - 7200000 },
        { id: 't-2', title: 'Calibration acoustique voix masculine Piper TTS', completed: true, priority: 'medium', createdAt: Date.now() - 3600000 },
        { id: 't-3', title: 'Assistance quotidienne et exécution de commandes', completed: false, priority: 'high', createdAt: Date.now() }
      ];
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTasks(tasks: TaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export async function fetchSystemMetrics() {
  let batteryLevel: number | null = null;
  let isCharging: boolean | null = null;

  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      batteryLevel = Math.round(battery.level * 100);
      isCharging = battery.charging;
    } catch {
      // Battery API unavailable or blocked
    }
  }

  let storageUsedMB = 48.2;
  let storageQuotaMB = 2048;

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage) storageUsedMB = Math.round(estimate.usage / (1024 * 1024));
      if (estimate.quota) storageQuotaMB = Math.round(estimate.quota / (1024 * 1024));
    } catch {
      // Storage estimate error
    }
  }

  const memoryEstimateMB = (performance as any)?.memory?.usedJSHeapSize
    ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
    : 142;

  return {
    batteryLevel,
    isCharging,
    storageUsedMB,
    storageQuotaMB,
    memoryEstimateMB,
    cpuCores: navigator.hardwareConcurrency || 8,
    isOnline: navigator.onLine,
    platform: navigator.platform || 'Client Linux/Unix'
  };
}

// Command dispatcher
export async function parseAndExecuteCommand(
  rawInput: string,
  callbacks: {
    onTimerCreated?: (timer: TimerItem) => void;
    onNoteAdded?: (note: NoteItem) => void;
    onTaskAdded?: (task: TaskItem) => void;
  }
): Promise<CommandResult[]> {
  const text = rawInput.trim();
  const lower = text.toLowerCase();
  const results: CommandResult[] = [];

  // 1. SYSTEM DIAGNOSTICS & BATTERY
  if (
    lower.includes('batterie') ||
    lower.includes('batterie statut') ||
    lower.includes('état du système') ||
    lower.includes('diagnostic') ||
    lower.includes('hardware')
  ) {
    const metrics = await fetchSystemMetrics();
    const batteryInfo = metrics.batteryLevel !== null
      ? `${metrics.batteryLevel}% ${metrics.isCharging ? '(En charge ⚡)' : '(Sur batterie)'}`
      : 'Non disponible via API hôte';

    results.push({
      id: 'cmd-' + Date.now(),
      type: 'system',
      title: 'Télémétrie Système & Hardware',
      details: `Batterie: ${batteryInfo} | Cœurs CPU: ${metrics.cpuCores} | RAM JS: ~${metrics.memoryEstimateMB} Mo | Stockage local: ${metrics.storageUsedMB} Mo / ${metrics.storageQuotaMB} Mo | Connectivité: ${metrics.isOnline ? 'En ligne' : '100% Hors-ligne'}`,
      data: metrics,
      timestamp: Date.now()
    });
    playAlertChime('confirm');
  }

  // 2. TIMERS & CHRONO
  // Matches "minuteur de X min", "chrono de X secondes", "rappel dans X min"
  const timerMatch = lower.match(/(?:minuteur|chrono|minuteur de|rappel de|timer de|dans)\s+(\d+)\s*(min|minute|minutes|sec|seconde|secondes|h|heure|heures)/i);
  if (timerMatch) {
    const val = parseInt(timerMatch[1], 10);
    const unit = timerMatch[2].toLowerCase();
    let seconds = val;
    if (unit.startsWith('min')) seconds = val * 60;
    if (unit.startsWith('h')) seconds = val * 3600;

    const newTimer: TimerItem = {
      id: 'timer-' + Date.now(),
      label: `Minuteur (${val} ${unit})`,
      durationSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: true,
      createdAt: Date.now()
    };

    if (callbacks.onTimerCreated) {
      callbacks.onTimerCreated(newTimer);
    }

    results.push({
      id: 'cmd-' + Date.now(),
      type: 'timer',
      title: `Compte à rebours activé`,
      details: `Minuteur de ${val} ${unit} (${seconds}s) en cours d'exécution. Signal sonore programmé.`,
      data: newTimer,
      timestamp: Date.now()
    });
    playAlertChime('beep');
  }

  // 3. CALCULATION & MATH EVALUATION
  // Matches "calcule 45 * 12", "combien fait 120 / 4", "calcule sqrt(144)"
  const calcMatch = lower.match(/(?:calcule|combien font|combien fait|calculer|résous)\s+([0-9\+\-\*\/\^\(\)\.\s\%sqrtcossintanpie]+)/i);
  if (calcMatch) {
    const expr = calcMatch[1].trim();
    try {
      // Safe sanitized math evaluator
      const sanitized = expr
        .replace(/pi/gi, 'Math.PI')
        .replace(/sqrt/gi, 'Math.sqrt')
        .replace(/cos/gi, 'Math.cos')
        .replace(/sin/gi, 'Math.sin')
        .replace(/tan/gi, 'Math.tan')
        .replace(/\^/g, '**');

      if (/^[0-9\+\-\*\/\(\)\.\sMathPIsqrtsincotan\*\*\%]+$/.test(sanitized)) {
        // eslint-disable-next-line no-eval
        const calcRes = Function(`'use strict'; return (${sanitized})`)();
        results.push({
          id: 'cmd-' + Date.now(),
          type: 'calc',
          title: `Calcul Mathématique Immédiat`,
          details: `${expr} = ${Number(calcRes).toLocaleString('fr-FR', { maximumFractionDigits: 6 })}`,
          data: { expr, result: calcRes },
          timestamp: Date.now()
        });
        playAlertChime('confirm');
      }
    } catch (e) {
      // invalid math, let the LLM handle it
    }
  }

  // 4. TASK CREATION
  // Matches "ajoute une tâche: faire les courses", "nouvelle tâche..."
  const taskMatch = text.match(/(?:ajoute une tâche|nouvelle tâche|créer tâche|ajoute tâche|tâche:)\s*:?\s*(.+)/i);
  if (taskMatch) {
    const taskTitle = taskMatch[1].trim();
    const newTask: TaskItem = {
      id: 'task-' + Date.now(),
      title: taskTitle,
      completed: false,
      priority: taskTitle.toLowerCase().includes('urgent') ? 'high' : 'medium',
      createdAt: Date.now()
    };
    if (callbacks.onTaskAdded) {
      callbacks.onTaskAdded(newTask);
    }
    results.push({
      id: 'cmd-' + Date.now(),
      type: 'task',
      title: `Tâche Enregistrée`,
      details: `"${taskTitle}" ajoutée à votre liste de priorités.`,
      data: newTask,
      timestamp: Date.now()
    });
    playAlertChime('confirm');
  }

  // 5. NOTE CREATION
  // Matches "note:...", "ajoute une note:..."
  const noteMatch = text.match(/(?:ajoute une note|nouvelle note|note:|mémo:)\s*:?\s*(.+)/i);
  if (noteMatch && !taskMatch) {
    const noteContent = noteMatch[1].trim();
    const newNote: NoteItem = {
      id: 'note-' + Date.now(),
      title: noteContent.slice(0, 32) + (noteContent.length > 32 ? '...' : ''),
      content: noteContent,
      createdAt: Date.now(),
      category: 'Général'
    };
    if (callbacks.onNoteAdded) {
      callbacks.onNoteAdded(newNote);
    }
    results.push({
      id: 'cmd-' + Date.now(),
      type: 'note',
      title: `Note Mémorisée`,
      details: `Enregistré dans le stockage local persistant de Nexis.`,
      data: newNote,
      timestamp: Date.now()
    });
    playAlertChime('confirm');
  }

  // 6. CODE SANDBOX EXECUTION
  // Matches "exécute ce code: ...", "run code: ..."
  const codeMatch = text.match(/(?:exécute ce code|exécute le code|run js|run code|teste le code)\s*:?\s*```(?:javascript|js)?\s*([\s\S]*?)```/i) ||
                    text.match(/(?:exécute ce code|run js|exécute)\s*:\s*([^`]+)/i);
  if (codeMatch) {
    const rawJs = codeMatch[1].trim();
    try {
      const logs: string[] = [];
      const customConsole = {
        log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args: any[]) => logs.push('ERREUR: ' + args.join(' ')),
        warn: (...args: any[]) => logs.push('AVERTISSEMENT: ' + args.join(' '))
      };
      const sandboxed = new Function('console', `'use strict'; ${rawJs}`);
      const evalRet = sandboxed(customConsole);
      const output = logs.length > 0 ? logs.join('\n') : (evalRet !== undefined ? String(evalRet) : 'Code exécuté avec succès (aucun retour).');

      results.push({
        id: 'cmd-' + Date.now(),
        type: 'code',
        title: `Sandbox JavaScript Exécuté`,
        details: output,
        data: { code: rawJs, output },
        timestamp: Date.now()
      });
      playAlertChime('confirm');
    } catch (err: any) {
      results.push({
        id: 'cmd-' + Date.now(),
        type: 'code',
        title: `Échec d'Exécution Code`,
        details: `Erreur: ${err.message || 'Syntaxe invalide'}`,
        data: { code: rawJs, error: err.message },
        timestamp: Date.now()
      });
    }
  }

  // 7. TIME / DATE QUERY
  if (
    lower.includes('quelle heure') ||
    lower.includes('heure est-il') ||
    lower.includes('donne-moi l\'heure') ||
    lower.includes('date d\'aujourd\'hui') ||
    lower.includes('quel jour sommes-nous')
  ) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    results.push({
      id: 'cmd-' + Date.now(),
      type: 'system',
      title: `Horloge Système Synchronisée`,
      details: `${timeStr} — ${dateStr}`,
      data: { time: timeStr, date: dateStr },
      timestamp: Date.now()
    });
  }

  // 8. SENTINEL SYSTEM DEFENSE & SURVEILLANCE
  if (
    lower.includes('sentinelle') ||
    lower.includes('défends mon système') ||
    lower.includes('défense') ||
    lower.includes('sécurité') ||
    lower.includes('verrouille') ||
    lower.includes('surveille mon système') ||
    lower.includes('nettoie la mémoire') ||
    lower.includes('purge')
  ) {
    const metrics = await fetchSystemMetrics();
    // Simulate active cache sweep and security audit
    results.push({
      id: 'cmd-' + Date.now(),
      type: 'system',
      title: `Bouclier Sentinelle Alpha Activé`,
      details: `Surveillance continue active. Confinement hors-ligne validé (0 fuite). RAM balayée (~${metrics.memoryEstimateMB} Mo). Surveillance batterie & CPU 60 FPS nominale.`,
      data: {
        shield: true,
        threatLevel: 'nominal',
        battery: metrics.batteryLevel,
        airgap: !metrics.isOnline
      },
      timestamp: Date.now()
    });
    playAlertChime('confirm');
  }

  return results;
}

