export type MessageSender = 'user' | 'nexis' | 'system';

export interface CommandResult {
  id: string;
  type: 'system' | 'timer' | 'calc' | 'note' | 'task' | 'code' | 'ui' | 'file' | 'weather';
  title: string;
  details: string;
  data?: any;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  commandResults?: CommandResult[];
  tokensCount?: number;
  durationMs?: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  category?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export interface TimerItem {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  createdAt: number;
}

export interface SystemTelemetry {
  isOnline: boolean;
  batteryLevel: number | null;
  isCharging: boolean | null;
  cpuCores: number;
  memoryEstimateMB: number | null;
  storageUsedMB: number;
  storageQuotaMB: number;
  platform: string;
  localModelName: string;
  localModelSizeMB: number;
  engineStatus: 'ready' | 'computing' | 'streaming' | 'offline_verified';
  activeTheme: 'cyan' | 'cobalt' | 'gold' | 'emerald';
}

export interface PiperVoiceConfig {
  enabled: boolean;
  engineMode: 'auto' | 'edge_online' | 'piper_offline';
  profileName: 'fr_male_piper_siwis' | 'en_male_piper_lessac' | 'fr_deep_jarvis';
  edgeVoice: 'fr-FR-HenriNeural' | 'fr-FR-AlainNeural' | 'fr-FR-ClaudeNeural' | 'fr-FR-MauriceNeural' | 'en-US-GuyNeural';
  pitch: number;
  rate: number;
  volume: number;
  formantResonance: boolean;
  autoSpeak: boolean;
  assistantName: 'NEXIS' | 'ALI';
  wakeWordEnabled: boolean;
  micNoiseGate: number;
  handsFreeMode: boolean; // Continuous voice listening without tapping
  forceStrictMaleVoice: boolean; // Strict exclusion of female voices + male pitch shift
}

export interface VoiceprintProfile {
  enrolled: boolean;
  ownerName: string; // 'Albert'
  enrolledDate: number;
  dominantPitchHz: number;
  spectralDistribution: number[];
  tolerance: number; // Verification sensitivity
  filterMode?: 'strict' | 'lenient' | 'disabled';
}

export interface SecurityLockState {
  isLocked: boolean;
  passcode: string;
  attempts: number;
  isEnrollingVoice: boolean;
}


