import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Copy,
  Download,
  Search,
  Check,
  AlertCircle
} from 'lucide-react';
import { NoteItem, TaskItem, TimerItem } from '../types';
import {
  getSavedNotes,
  saveNotes,
  getSavedTasks,
  saveTasks,
  playAlertChime
} from '../services/commandSystem';

interface TasksNotesPanelProps {
  timers: TimerItem[];
  setTimers: React.Dispatch<React.SetStateAction<TimerItem[]>>;
  notes: NoteItem[];
  setNotes: React.Dispatch<React.SetStateAction<NoteItem[]>>;
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
}

export const TasksNotesPanel: React.FC<TasksNotesPanelProps> = ({
  timers,
  setTimers,
  notes,
  setNotes,
  tasks,
  setTasks
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'timers'>('tasks');

  // Task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Note form state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteSearch, setNoteSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Timer form state
  const [newTimerMin, setNewTimerMin] = useState(5);
  const [newTimerLabel, setNewTimerLabel] = useState('Session Travail');

  // Active Timer Countdown Interval
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((timer) => {
          if (!timer.isRunning) return timer;
          if (timer.remainingSeconds <= 1) {
            playAlertChime('alarm');
            return {
              ...timer,
              remainingSeconds: 0,
              isRunning: false
            };
          }
          return {
            ...timer,
            remainingSeconds: timer.remainingSeconds - 1
          };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [setTimers]);

  // Tasks actions
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: 'task-' + Date.now(),
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      createdAt: Date.now()
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveTasks(updated);
    setNewTaskTitle('');
    playAlertChime('confirm');
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    saveTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
  };

  // Notes actions
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const newNote: NoteItem = {
      id: 'note-' + Date.now(),
      title: newNoteContent.slice(0, 32) + (newNoteContent.length > 32 ? '...' : ''),
      content: newNoteContent.trim(),
      createdAt: Date.now(),
      category: 'Général'
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setNewNoteContent('');
    playAlertChime('confirm');
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
  };

  const handleCopyNote = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportNotes = () => {
    const markdown = `# Notes Persistantes NEXIS\nExporté le ${new Date().toLocaleString('fr-FR')}\n\n` +
      notes.map(n => `### ${n.title}\n*Créé le ${new Date(n.createdAt).toLocaleString('fr-FR')}*\n\n${n.content}\n\n---`).join('\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexis_notes_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Timer actions
  const handleCreateTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTimerMin <= 0) return;

    const seconds = Math.round(newTimerMin * 60);
    const newTimer: TimerItem = {
      id: 'timer-' + Date.now(),
      label: newTimerLabel.trim() || `Minuteur ${newTimerMin} min`,
      durationSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: true,
      createdAt: Date.now()
    };
    setTimers((prev) => [newTimer, ...prev]);
    playAlertChime('beep');
  };

  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleResetTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, remainingSeconds: t.durationSeconds, isRunning: false } : t))
    );
  };

  const handleDeleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
    n.content.toLowerCase().includes(noteSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            Poste Exécutif : Tâches, Notes & Chronomètres
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Géré par commandes vocales NEXIS ou saisie directe. Persistance 100% locale sécurisée.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
              activeTab === 'tasks'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tâches ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
              activeTab === 'notes'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab('timers')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
              activeTab === 'timers'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Minuteurs ({timers.length})
          </button>
        </div>
      </div>

      {/* TAB 1: TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Add Task Form */}
          <form
            onSubmit={handleAddTask}
            className="flex flex-col sm:flex-row gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Ex: Finaliser le rapport de propulsion Stark..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="low">Priorité Basse</option>
                <option value="medium">Priorité Moyenne</option>
                <option value="high">Priorité Haute</option>
              </select>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>
          </form>

          {/* Tasks List */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                Aucune tâche enregistrée. Dites à voix haute : « Nexis, ajoute une tâche: [intitulé] »
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors ${
                    task.completed ? 'bg-slate-950/40 opacity-60' : 'hover:bg-slate-850/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="text-cyan-400 hover:text-cyan-300 cursor-pointer shrink-0"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    <span
                      className={`text-sm truncate ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                        task.priority === 'high'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                          : task.priority === 'medium'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {task.priority}
                    </span>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Supprimer la tâche"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add Note & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="Rechercher dans les notes..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              onClick={handleExportNotes}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 transition-colors cursor-pointer whitespace-nowrap self-end sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exporter Markdown</span>
            </button>
          </div>

          <form
            onSubmit={handleAddNote}
            className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2"
          >
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Consignez une idée, une équation ou une directive stratégique..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer la note</span>
              </button>
            </div>
          </form>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-500 text-xs font-mono">
                Aucune note trouvée. Dites : « Nexis, ajoute une note: [votre mémo] »
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                      <span className="text-xs font-mono font-semibold text-cyan-300">
                        {note.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(note.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleCopyNote(note.content, note.id)}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Copier le texte"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Supprimer la note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TIMERS */}
      {activeTab === 'timers' && (
        <div className="space-y-4">
          {/* New Timer Form */}
          <form
            onSubmit={handleCreateTimer}
            className="flex flex-col sm:flex-row gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-800"
          >
            <input
              type="text"
              value={newTimerLabel}
              onChange={(e) => setNewTimerLabel(e.target.value)}
              placeholder="Libellé du compte à rebours..."
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={newTimerMin}
                onChange={(e) => setNewTimerMin(parseFloat(e.target.value) || 1)}
                className="w-24 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm font-mono text-cyan-300 focus:outline-none text-center"
              />
              <span className="text-xs font-mono text-slate-400">minutes</span>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Lancer</span>
              </button>
            </div>
          </form>

          {/* Timers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {timers.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-500 text-xs font-mono">
                Aucun compte à rebours actif. Dites : « Nexis, minuteur de 5 minutes »
              </div>
            ) : (
              timers.map((timer) => {
                const mins = Math.floor(timer.remainingSeconds / 60);
                const secs = timer.remainingSeconds % 60;
                const isFinished = timer.remainingSeconds === 0;

                return (
                  <div
                    key={timer.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isFinished
                        ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                        : timer.isRunning
                        ? 'bg-slate-900/90 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : 'bg-slate-900/60 border-slate-800 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                        <span className="truncate">{timer.label}</span>
                        {isFinished && (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            EXPIRÉ
                          </span>
                        )}
                      </div>

                      <div className="text-3xl font-bold font-mono tracking-wider text-center py-4 text-white">
                        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleTimer(timer.id)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                          title={timer.isRunning ? 'Pause' : 'Reprendre'}
                        >
                          {timer.isRunning ? (
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleResetTimer(timer.id)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Réinitialiser"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteTimer(timer.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
