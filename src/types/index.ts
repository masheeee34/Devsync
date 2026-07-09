export type TaskColumn = 'ideas' | 'progress' | 'completed';

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: 'frontend' | 'backend' | 'ui-ux' | 'r-d' | 'devops';
  column: TaskColumn;
  author: 'Aymane' | 'Collaborateur';
  createdAt: string;
  updatedAt: string;
  githubRepoUrl?: string;
  votes: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  open_issues_count: number;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO datetime string
  ideaId?: string; // Optional linked project
  priority: 'low' | 'medium' | 'high';
  recurrence: 'none' | 'daily' | 'weekly';
  isDone: boolean;
  author: 'Aymane' | 'Collaborateur';
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'reminder_due' 
  | 'idea_added' 
  | 'idea_moved' 
  | 'idea_voted' 
  | 'commit_sync';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface RecentActivity {
  id: string;
  type: 'idea_create' | 'idea_move' | 'idea_vote' | 'reminder_add' | 'reminder_done';
  title: string;
  author: string;
  timestamp: string;
}
