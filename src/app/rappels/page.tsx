'use client';

import { useState, useEffect } from 'react';
import { Reminder, Idea } from '@/types';
import { getStorageAdapter, logActivity } from '@/lib/storage';
import { useIsMobile } from '@/lib/useIsMobile';
import BottomSheet from '@/components/BottomSheet';

export default function RemindersPage() {
  const isMobile = useIsMobile();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isDoneCollapsed, setIsDoneCollapsed] = useState(true);
  const [activeUser, setActiveUser] = useState<'Aymane' | 'Collaborateur'>('Aymane');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Reminder['priority']>('medium');
  const [recurrence, setRecurrence] = useState<Reminder['recurrence']>('none');
  const [ideaId, setIdeaId] = useState('');

  // Subscribe to storage & FAB click event
  useEffect(() => {
    const adapter = getStorageAdapter();
    const unsubReminders = adapter.subscribeReminders((items) => setReminders(items));
    const unsubIdeas = adapter.subscribe((items) => setIdeas(items));

    const savedUser = sessionStorage.getItem('devsync-active-user') as any;
    if (savedUser) {
      setActiveUser(savedUser);
    }

    const handleFAB = () => {
      handleOpenAdd();
    };
    window.addEventListener('devsync-fab-click', handleFAB);

    return () => {
      unsubReminders();
      unsubIdeas();
      window.removeEventListener('devsync-fab-click', handleFAB);
    };
  }, [reminders, activeUser]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setDueDate(tomorrow.toISOString().slice(0, 16));
    setPriority('medium');
    setRecurrence('none');
    setIdeaId('');
    setShowForm(true);
  };

  const handleOpenEdit = (rem: Reminder) => {
    setEditingId(rem.id);
    setTitle(rem.title);
    setDescription(rem.description);
    const localDate = new Date(rem.dueDate);
    const tzOffset = localDate.getTimezoneOffset() * 60000;
    const formatted = new Date(localDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setDueDate(formatted);
    setPriority(rem.priority);
    setRecurrence(rem.recurrence);
    setIdeaId(rem.ideaId || '');
    setShowForm(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const targetDate = new Date(dueDate).toISOString();
    const adapter = getStorageAdapter();

    if (editingId) {
      const existing = reminders.find((r) => r.id === editingId);
      if (existing) {
        const updated: Reminder = {
          ...existing,
          title: title.trim(),
          description: description.trim(),
          dueDate: targetDate,
          priority,
          recurrence,
          ideaId: ideaId || undefined,
          updatedAt: new Date().toISOString()
        };
        await adapter.saveReminder(updated);
      }
    } else {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        dueDate: targetDate,
        priority,
        recurrence,
        isDone: false,
        author: activeUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (ideaId) newReminder.ideaId = ideaId;

      await adapter.saveReminder(newReminder);
      await logActivity('reminder_add', title.trim(), activeUser);
      
      // Schedule system notification if due soon
      if ('Notification' in window && Notification.permission === 'granted') {
        const msUntilDue = new Date(targetDate).getTime() - Date.now();
        if (msUntilDue > 0 && msUntilDue < 3600000) {
          setTimeout(() => {
            new Notification("Rappel échéant : " + title.trim(), {
              body: description.trim() || "Le rappel est arrivé à son terme.",
              icon: "/icon-512x512.png"
            });
          }, msUntilDue);
        }
      }
    }

    setShowForm(false);
  };

  const handleToggleDone = async (rem: Reminder) => {
    const updated: Reminder = {
      ...rem,
      isDone: !rem.isDone,
      updatedAt: new Date().toISOString()
    };
    const adapter = getStorageAdapter();
    await adapter.saveReminder(updated);
    if (updated.isDone) {
      await logActivity('reminder_done', rem.title, activeUser);
    }
  };

  const handleDelete = async (id: string) => {
    const conf = confirm("Supprimer ce rappel ?");
    if (conf) {
      const adapter = getStorageAdapter();
      await adapter.deleteReminder(id);
    }
  };

  const nowTime = Date.now();
  const overdueReminders = reminders.filter(
    (r) => !r.isDone && new Date(r.dueDate).getTime() < nowTime
  );
  const upcomingReminders = reminders.filter(
    (r) => !r.isDone && new Date(r.dueDate).getTime() >= nowTime
  );
  const doneReminders = reminders.filter((r) => r.isDone);

  const getRelativeStr = (isoString: string) => {
    const diff = new Date(isoString).getTime() - Date.now();
    const seconds = Math.floor(diff / 1000);
    const absSeconds = Math.abs(seconds);
    const minutes = Math.floor(absSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 0) {
      if (minutes < 60) return `en retard de ${minutes} min`;
      if (hours < 24) return `en retard de ${hours} h`;
      return `en retard de ${days} j`;
    } else {
      if (minutes < 60) return `dans ${minutes} min`;
      if (hours < 24) return `dans ${hours} h`;
      return `dans ${days} j`;
    }
  };

  const getAbsoluteStr = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const renderReminderCard = (rem: Reminder, isOverdue = false) => {
    const linkedIdea = ideas.find((i) => i.id === rem.ideaId);
    
    return (
      <div 
        key={rem.id}
        className={`bg-white border rounded-3xl p-4.5 shadow-sm flex flex-col gap-3.5 transition-all duration-200 ${
          isOverdue 
            ? 'border-red-200 bg-red-50/20'
            : 'border-[#ECEAE3]'
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`text-xs font-display font-bold ${rem.isDone ? 'line-through text-[#8C8A85]' : 'text-[#1B1B1B]'}`}>
                {rem.title}
              </h4>
              {linkedIdea && (
                <span className="text-[8px] font-mono uppercase tracking-wider text-[#8C8A85] bg-[#F7F5EF] px-2 py-0.5 rounded-full border border-[#ECEAE3] font-semibold">
                  {linkedIdea.title}
                </span>
              )}
            </div>
            {rem.description && (
              <p className="text-[11px] text-[#8C8A85] leading-relaxed">
                {rem.description}
              </p>
            )}
          </div>

          <button 
            onClick={() => handleToggleDone(rem)}
            className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
              rem.isDone 
                ? 'bg-[#161616] border-[#161616] text-white shadow-sm' 
                : 'border-[#ECEAE3] hover:border-black'
            }`}
            aria-label={rem.isDone ? "Marquer comme non fait" : "Marquer comme fait"}
          >
            {rem.isDone && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </button>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-[#ECEAE3] text-[9.5px] font-mono">
          <div className="flex items-center gap-3 text-[#8C8A85] flex-wrap font-semibold">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {getAbsoluteStr(rem.dueDate)} ({getRelativeStr(rem.dueDate)})
            </span>
            <span className="flex items-center gap-1 uppercase">
              <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {rem.author}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border tracking-wider ${
              rem.priority === 'high' 
                ? 'bg-red-50 border-red-200 text-red-500' 
                : rem.priority === 'medium'
                ? 'bg-amber-50 border-amber-200 text-amber-500'
                : 'bg-[#F7F5EF] border-transparent text-[#8C8A85]'
            }`}>
              {rem.priority}
            </span>

            {!rem.isDone && (
              <button 
                onClick={() => handleOpenEdit(rem)}
                className="p-1 rounded bg-[#F7F5EF] border border-[#ECEAE3] text-[#8C8A85] hover:text-[#1B1B1B] transition-colors cursor-pointer"
                aria-label="Modifier le rappel"
              >
                ✏️
              </button>
            )}

            <button 
              onClick={() => handleDelete(rem.id)}
              className="p-1 text-[#8C8A85] hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
              aria-label="Supprimer le rappel"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFormFields = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rem-title" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Titre</label>
        <input
          id="rem-title"
          type="text"
          placeholder="Ex: Corriger le bug Safari iOS"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2.5 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rem-desc" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Description</label>
        <textarea
          id="rem-desc"
          placeholder="Notes optionnelles..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2.5 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rem-due" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Échéance</label>
          <input
            id="rem-due"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2.5 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] transition-colors font-mono cursor-pointer"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rem-priority" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Priorité</label>
          <select
            id="rem-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2.5 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] transition-colors appearance-none cursor-pointer"
          >
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Élevée</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rem-recurrence" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Récurrence</label>
          <select
            id="rem-recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as any)}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2.5 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] transition-colors appearance-none cursor-pointer"
          >
            <option value="none">Aucune</option>
            <option value="daily">Quotidienne</option>
            <option value="weekly">Hebdomadaire</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rem-idea" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Idée liée</label>
          <select
            id="rem-idea"
            value={ideaId}
            onChange={(e) => setIdeaId(e.target.value)}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2.5 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] transition-colors appearance-none cursor-pointer"
          >
            <option value="">Aucune</option>
            {ideas.map((idea) => (
              <option key={idea.id} value={idea.id}>
                {idea.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleSave()}
        className="w-full mt-2 py-3 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all cursor-pointer"
      >
        Enregistrer le rappel
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title */}
      <div className="flex justify-between items-center pb-3 border-b border-[#ECEAE3]">
        <div>
          <h2 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase font-mono">Rappels de Projet</h2>
          <p className="text-[11px] text-[#8C8A85] mt-0.5 font-medium">Planifiez des échéances et restez notifié.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="hidden md:flex items-center gap-1.5 px-4.5 py-2 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all shadow-md cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-[#F2C94C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>Nouveau Rappel</span>
        </button>
      </div>

      {/* Form handling (Mobile Bottom Sheet vs Desktop Modal) */}
      {showForm && (
        isMobile ? (
          <BottomSheet 
            isOpen={showForm} 
            onClose={() => setShowForm(false)} 
            title={editingId ? 'Modifier le rappel' : 'Planifier un rappel'}
          >
            {renderFormFields()}
          </BottomSheet>
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
            <div className="bg-white border border-[#ECEAE3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
              <button 
                onClick={() => setShowForm(false)}
                className="absolute top-4.5 right-4.5 text-[#8C8A85] p-1 cursor-pointer"
                aria-label="Fermer"
              >
                ✕
              </button>
              <h3 className="text-xs font-bold text-[#1B1B1B] uppercase tracking-wider font-mono mb-4">
                {editingId ? 'Modifier le rappel' : 'Planifier un rappel'}
              </h3>
              <form onSubmit={handleSave}>
                {renderFormFields()}
              </form>
            </div>
          </div>
        )
      )}

      {/* Summary Stats Panel */}
      <div className="card-dark rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[8.5px] font-mono uppercase tracking-widest text-zinc-400 font-bold">Console de contrôle</span>
          <h3 className="text-base font-display font-bold text-white mt-1">Vos échéances</h3>
          <p className="text-xs text-zinc-300 mt-1 font-medium">
            Vous avez {upcomingReminders.length} échéances à venir et {overdueReminders.length} alertes en retard.
          </p>
        </div>
        <div className="flex gap-3 text-xs font-mono shrink-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-center min-w-[70px]">
            <div className="text-base font-extrabold text-[#F2C94C]">{overdueReminders.length}</div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-500 mt-0.5 font-bold">Retard</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-center min-w-[70px]">
            <div className="text-base font-extrabold text-white">{upcomingReminders.length}</div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-500 mt-0.5 font-bold">Imminent</div>
          </div>
        </div>
      </div>

      {/* Overdue alerts */}
      {overdueReminders.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[9.5px] font-bold text-red-500 uppercase tracking-widest font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            En retard
          </h3>
          <div className="flex flex-col gap-3">
            {overdueReminders.map((rem) => renderReminderCard(rem, true))}
          </div>
        </div>
      )}

      {/* Upcoming tasks */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[9.5px] font-bold text-[#1B1B1B] uppercase tracking-widest font-mono">
          À venir ({upcomingReminders.length})
        </h3>
        
        {upcomingReminders.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#ECEAE3] rounded-3xl bg-white/30">
            <p className="text-[9.5px] font-mono uppercase tracking-wider text-[#8C8A85]">Aucun rappel imminent</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingReminders.map((rem) => renderReminderCard(rem, false))}
          </div>
        )}
      </div>

      {/* Completed tasks folder */}
      {doneReminders.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setIsDoneCollapsed(!isDoneCollapsed)}
            className="w-full flex items-center justify-between py-2 border-b border-[#ECEAE3] text-[9.5px] font-bold uppercase tracking-widest font-mono text-[#8C8A85] hover:text-[#1B1B1B] cursor-pointer"
          >
            <span>Rappels terminés ({doneReminders.length})</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${isDoneCollapsed ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          
          {!isDoneCollapsed && (
            <div className="flex flex-col gap-3 mt-2 animate-in fade-in duration-200">
              {doneReminders.map((rem) => renderReminderCard(rem, false))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
