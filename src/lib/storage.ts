import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Idea, Reminder, AppNotification, RecentActivity } from '@/types';

export interface StorageAdapter {
  getItems(): Promise<Idea[]>;
  saveItem(idea: Idea): Promise<void>;
  deleteItem(id: string): Promise<void>;
  subscribe(callback: (items: Idea[]) => void): () => void;

  getReminders(): Promise<Reminder[]>;
  saveReminder(reminder: Reminder): Promise<void>;
  deleteReminder(id: string): Promise<void>;
  subscribeReminders(callback: (items: Reminder[]) => void): () => void;

  getNotifications(): Promise<AppNotification[]>;
  saveNotification(notification: AppNotification): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  subscribeNotifications(callback: (items: AppNotification[]) => void): () => void;

  getActivities(): Promise<RecentActivity[]>;
  saveActivity(activity: RecentActivity): Promise<void>;
  subscribeActivities(callback: (items: RecentActivity[]) => void): () => void;
}

// Helper to log activity
export async function logActivity(
  type: RecentActivity['type'],
  title: string,
  author: string
) {
  const activity: RecentActivity = {
    id: Date.now().toString(),
    type,
    title,
    author,
    timestamp: new Date().toISOString()
  };
  try {
    const adapter = getStorageAdapter();
    await adapter.saveActivity(activity);

    // Also push a notification in-app for collaborative events
    if (type !== 'idea_vote') {
      let notifType: AppNotification['type'] = 'idea_added';
      let notifTitle = '';
      let notifMessage = '';

      if (type === 'idea_create') {
        notifType = 'idea_added';
        notifTitle = 'Nouvelle idée publiée';
        notifMessage = `${author} a ajouté l'idée "${title}"`;
      } else if (type === 'idea_move') {
        notifType = 'idea_moved';
        notifTitle = 'Ticket déplacé';
        notifMessage = `${author} a déplacé "${title}"`;
      } else if (type === 'reminder_add') {
        notifType = 'reminder_due';
        notifTitle = 'Nouveau rappel programmé';
        notifMessage = `${author} a planifié le rappel "${title}"`;
      } else if (type === 'reminder_done') {
        notifType = 'reminder_due';
        notifTitle = 'Rappel terminé';
        notifMessage = `${author} a marqué "${title}" comme fait`;
      }

      await adapter.saveNotification({
        id: 'n_' + Date.now(),
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error('Failed to log activity/notification', e);
  }
}

// ----------------------------------------------------
// 1. LocalStorage Adapter
// ----------------------------------------------------
export class LocalAdapter implements StorageAdapter {
  private ideaListeners: Set<(items: Idea[]) => void> = new Set();
  private reminderListeners: Set<(items: Reminder[]) => void> = new Set();
  private notificationListeners: Set<(items: AppNotification[]) => void> = new Set();
  private activityListeners: Set<(items: RecentActivity[]) => void> = new Set();

  private keyIdeas = 'devsync-ideas';
  private keyReminders = 'devsync-reminders';
  private keyNotifications = 'devsync-notifications';
  private keyActivities = 'devsync-activities';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === this.keyIdeas) this.triggerIdeas();
        if (e.key === this.keyReminders) this.triggerReminders();
        if (e.key === this.keyNotifications) this.triggerNotifications();
        if (e.key === this.keyActivities) this.triggerActivities();
      });
    }
  }

  private triggerIdeas() {
    const val = this.getRaw<Idea>(this.keyIdeas);
    this.ideaListeners.forEach((cb) => cb(val));
  }
  private triggerReminders() {
    const val = this.getRaw<Reminder>(this.keyReminders);
    this.reminderListeners.forEach((cb) => cb(val));
  }
  private triggerNotifications() {
    const val = this.getRaw<AppNotification>(this.keyNotifications);
    this.notificationListeners.forEach((cb) => cb(val));
  }
  private triggerActivities() {
    const val = this.getRaw<RecentActivity>(this.keyActivities);
    this.activityListeners.forEach((cb) => cb(val));
  }

  private getRaw<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }

  private saveRaw<T>(key: string, items: T[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(items));
  }

  // Ideas Implementation
  async getItems(): Promise<Idea[]> {
    return this.getRaw<Idea>(this.keyIdeas);
  }
  async saveItem(idea: Idea): Promise<void> {
    const items = this.getRaw<Idea>(this.keyIdeas);
    const idx = items.findIndex((i) => i.id === idea.id);
    if (idx > -1) items[idx] = { ...idea, updatedAt: new Date().toISOString() };
    else items.unshift(idea);
    this.saveRaw(this.keyIdeas, items);
    this.triggerIdeas();
  }
  async deleteItem(id: string): Promise<void> {
    const items = this.getRaw<Idea>(this.keyIdeas);
    this.saveRaw(this.keyIdeas, items.filter((i) => i.id !== id));
    this.triggerIdeas();
  }
  subscribe(callback: (items: Idea[]) => void): () => void {
    this.ideaListeners.add(callback);
    callback(this.getRaw<Idea>(this.keyIdeas));
    return () => { this.ideaListeners.delete(callback); };
  }

  // Reminders Implementation
  async getReminders(): Promise<Reminder[]> {
    return this.getRaw<Reminder>(this.keyReminders);
  }
  async saveReminder(reminder: Reminder): Promise<void> {
    const items = this.getRaw<Reminder>(this.keyReminders);
    const idx = items.findIndex((i) => i.id === reminder.id);
    if (idx > -1) items[idx] = { ...reminder, updatedAt: new Date().toISOString() };
    else items.unshift(reminder);
    this.saveRaw(this.keyReminders, items);
    this.triggerReminders();
  }
  async deleteReminder(id: string): Promise<void> {
    const items = this.getRaw<Reminder>(this.keyReminders);
    this.saveRaw(this.keyReminders, items.filter((i) => i.id !== id));
    this.triggerReminders();
  }
  subscribeReminders(callback: (items: Reminder[]) => void): () => void {
    this.reminderListeners.add(callback);
    callback(this.getRaw<Reminder>(this.keyReminders));
    return () => { this.reminderListeners.delete(callback); };
  }

  // Notifications Implementation
  async getNotifications(): Promise<AppNotification[]> {
    return this.getRaw<AppNotification>(this.keyNotifications);
  }
  async saveNotification(notification: AppNotification): Promise<void> {
    const items = this.getRaw<AppNotification>(this.keyNotifications);
    const idx = items.findIndex((i) => i.id === notification.id);
    if (idx > -1) items[idx] = notification;
    else items.unshift(notification);
    // Limit to 50 notifications in cache
    if (items.length > 50) items.pop();
    this.saveRaw(this.keyNotifications, items);
    this.triggerNotifications();
  }
  async deleteNotification(id: string): Promise<void> {
    const items = this.getRaw<AppNotification>(this.keyNotifications);
    this.saveRaw(this.keyNotifications, items.filter((i) => i.id !== id));
    this.triggerNotifications();
  }
  subscribeNotifications(callback: (items: AppNotification[]) => void): () => void {
    this.notificationListeners.add(callback);
    callback(this.getRaw<AppNotification>(this.keyNotifications));
    return () => { this.notificationListeners.delete(callback); };
  }

  // Activities Implementation
  async getActivities(): Promise<RecentActivity[]> {
    return this.getRaw<RecentActivity>(this.keyActivities);
  }
  async saveActivity(activity: RecentActivity): Promise<void> {
    const items = this.getRaw<RecentActivity>(this.keyActivities);
    items.unshift(activity);
    if (items.length > 30) items.pop(); // Keep last 30 activities
    this.saveRaw(this.keyActivities, items);
    this.triggerActivities();
  }
  subscribeActivities(callback: (items: RecentActivity[]) => void): () => void {
    this.activityListeners.add(callback);
    callback(this.getRaw<RecentActivity>(this.keyActivities));
    return () => { this.activityListeners.delete(callback); };
  }
}

// ----------------------------------------------------
// 2. Supabase Adapter (Real-time collaborative)
// ----------------------------------------------------
export class SupabaseAdapter implements StorageAdapter {
  private client: SupabaseClient | null = null;
  private ideaListeners: Set<(items: Idea[]) => void> = new Set();
  private reminderListeners: Set<(items: Reminder[]) => void> = new Set();
  private notificationListeners: Set<(items: AppNotification[]) => void> = new Set();
  private activityListeners: Set<(items: RecentActivity[]) => void> = new Set();

  private channelIdeas: any = null;
  private channelReminders: any = null;
  private channelNotifications: any = null;
  private channelActivities: any = null;

  constructor() {
    if (typeof window === 'undefined') return;
    const url = localStorage.getItem('devsync-supabase-url');
    const key = localStorage.getItem('devsync-supabase-key');
    if (url && key) {
      try {
        this.client = createClient(url, key);
      } catch (e) {
        console.error('Supabase init failed:', e);
      }
    }
  }

  private isReady(): boolean {
    return this.client !== null;
  }

  // Ideas
  async getItems(): Promise<Idea[]> {
    if (!this.isReady()) return [];
    const { data, error } = await this.client!.from('ideas').select('*').order('votes', { ascending: false });
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      column: row.column,
      author: row.author,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      votes: row.votes || 0,
    }));
  }
  async saveItem(idea: Idea): Promise<void> {
    if (!this.isReady()) return;
    await this.client!.from('ideas').upsert({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      column: idea.column,
      author: idea.author,
      updated_at: new Date().toISOString(),
      votes: idea.votes,
      created_at: idea.createdAt || new Date().toISOString()
    });
  }
  async deleteItem(id: string): Promise<void> {
    if (!this.isReady()) return;
    await this.client!.from('ideas').delete().eq('id', id);
  }
  subscribe(callback: (items: Idea[]) => void): () => void {
    if (!this.isReady()) { callback([]); return () => {}; }
    this.ideaListeners.add(callback);
    this.getItems().then(callback);

    if (!this.channelIdeas) {
      this.channelIdeas = this.client!
        .channel('realtime:ideas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, () => {
          this.getItems().then((items) => this.ideaListeners.forEach((cb) => cb(items)));
        })
        .subscribe();
    }
    return () => {
      this.ideaListeners.delete(callback);
      if (this.ideaListeners.size === 0 && this.channelIdeas) {
        this.client!.removeChannel(this.channelIdeas);
        this.channelIdeas = null;
      }
    };
  }

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    if (!this.isReady()) return [];
    const { data, error } = await this.client!.from('reminders').select('*').order('due_date', { ascending: true });
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      ideaId: row.idea_id,
      priority: row.priority,
      recurrence: row.recurrence,
      isDone: row.is_done,
      author: row.author,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  async saveReminder(reminder: Reminder): Promise<void> {
    if (!this.isReady()) return;
    await this.client!.from('reminders').upsert({
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
      due_date: reminder.dueDate,
      idea_id: reminder.ideaId,
      priority: reminder.priority,
      recurrence: reminder.recurrence,
      is_done: reminder.isDone,
      author: reminder.author,
      created_at: reminder.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  async deleteReminder(id: string): Promise<void> {
    if (!this.isReady()) return;
    await this.client!.from('reminders').delete().eq('id', id);
  }
  subscribeReminders(callback: (items: Reminder[]) => void): () => void {
    if (!this.isReady()) { callback([]); return () => {}; }
    this.reminderListeners.add(callback);
    this.getReminders().then(callback);

    if (!this.channelReminders) {
      this.channelReminders = this.client!
        .channel('realtime:reminders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
          this.getReminders().then((items) => this.reminderListeners.forEach((cb) => cb(items)));
        })
        .subscribe();
    }
    return () => {
      this.reminderListeners.delete(callback);
      if (this.reminderListeners.size === 0 && this.channelReminders) {
        this.client!.removeChannel(this.channelReminders);
        this.channelReminders = null;
      }
    };
  }

  // Notifications
  async getNotifications(): Promise<AppNotification[]> {
    if (!this.isReady()) return [];
    const { data, error } = await this.client!.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at,
    }));
  }
  async saveNotification(notification: AppNotification): Promise<void> {
    if (!this.isReady()) return;
    await this.client!.from('notifications').upsert({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.isRead,
      created_at: notification.createdAt || new Date().toISOString()
    });
  }
  async deleteNotification(id: string): Promise<void> {
    if (!this.isReady()) return;
    await this.client!.from('notifications').delete().eq('id', id);
  }
  subscribeNotifications(callback: (items: AppNotification[]) => void): () => void {
    if (!this.isReady()) { callback([]); return () => {}; }
    this.notificationListeners.add(callback);
    this.getNotifications().then(callback);

    if (!this.channelNotifications) {
      this.channelNotifications = this.client!
        .channel('realtime:notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          this.getNotifications().then((items) => this.notificationListeners.forEach((cb) => cb(items)));
        })
        .subscribe();
    }
    return () => {
      this.notificationListeners.delete(callback);
      if (this.notificationListeners.size === 0 && this.channelNotifications) {
        this.client!.removeChannel(this.channelNotifications);
        this.channelNotifications = null;
      }
    };
  }

  // Activities
  async getActivities(): Promise<RecentActivity[]> {
    if (!this.isReady()) return [];
    const { data, error } = await this.client!.from('activities').select('*').order('timestamp', { ascending: false }).limit(30);
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      author: row.author,
      timestamp: row.timestamp,
    }));
  }
  async saveActivity(activity: RecentActivity): Promise<void> {
    if (!this.isReady()) return;
    await this.client!.from('activities').insert({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      author: activity.author,
      timestamp: activity.timestamp || new Date().toISOString()
    });
  }
  subscribeActivities(callback: (items: RecentActivity[]) => void): () => void {
    if (!this.isReady()) { callback([]); return () => {}; }
    this.activityListeners.add(callback);
    this.getActivities().then(callback);

    if (!this.channelActivities) {
      this.channelActivities = this.client!
        .channel('realtime:activities')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
          this.getActivities().then((items) => this.activityListeners.forEach((cb) => cb(items)));
        })
        .subscribe();
    }
    return () => {
      this.activityListeners.delete(callback);
      if (this.activityListeners.size === 0 && this.channelActivities) {
        this.client!.removeChannel(this.channelActivities);
        this.channelActivities = null;
      }
    };
  }
}

// Dynamic Factory
export function getStorageAdapter(): StorageAdapter {
  if (typeof window === 'undefined') {
    return new LocalAdapter();
  }

  const url = localStorage.getItem('devsync-supabase-url');
  const key = localStorage.getItem('devsync-supabase-key');
  const modeOverride = localStorage.getItem('devsync-db-mode-override');

  if (url && key && modeOverride !== 'local') {
    return new SupabaseAdapter();
  }

  return new LocalAdapter();
}
