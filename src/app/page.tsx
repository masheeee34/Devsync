'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Idea, Reminder, RecentActivity } from '@/types';
import { getStorageAdapter, logActivity } from '@/lib/storage';
import { getDbMode } from '@/lib/auth';
import ShowcaseCarousel from '@/components/ShowcaseCarousel';

// Type for Spotify Currently Playing response
interface SpotifyTrack {
  isPlaying: boolean;
  title?: string;
  artists?: string;
  albumArt?: string;
  trackUrl?: string;
  progressMs?: number;
  durationMs?: number;
}

const MOCK_PLAYLIST: SpotifyTrack[] = [
  {
    isPlaying: true,
    title: 'Starboy',
    artists: 'The Weeknd, Daft Punk',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b2734718dec409e58e3ca21224da',
    trackUrl: 'https://open.spotify.com/track/7MXV7vK0p5py2y0q655zG7',
    progressMs: 0,
    durationMs: 230000
  },
  {
    isPlaying: true,
    title: 'Instant Crush',
    artists: 'Daft Punk, Julian Casablancas',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b273ca37ee26a1ec244d2d4808c7',
    trackUrl: 'https://open.spotify.com/track/2oaK0JkH1fLz6qIq5zsiZ1',
    progressMs: 0,
    durationMs: 337000
  },
  {
    isPlaying: true,
    title: 'Comfort Chain',
    artists: 'Instupendo',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b27376c6d0426b31c4f58c7349ab',
    trackUrl: 'https://open.spotify.com/track/6U9gA7GqK2lE3uJkS6JocP',
    progressMs: 0,
    durationMs: 198000
  }
];

export default function Dashboard() {
  const [activeUser, setActiveUser] = useState<'Aymane' | 'Collaborateur'>('Aymane');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  
  const mockTrackIndexRef = useRef(0);

  // Spotify integration states
  const [mySpotify, setMySpotify] = useState<SpotifyTrack>({ isPlaying: false });
  const [partnerSpotify, setPartnerSpotify] = useState<SpotifyTrack>({
    isPlaying: true,
    title: 'Comfort Chain',
    artists: 'Instupendo',
    albumArt: 'https://i.scdn.co/image/ab67616d0000b27376c6d0426b31c4f58c7349ab',
    trackUrl: 'https://open.spotify.com/track/6U9gA7GqK2lE3uJkS6JocP',
    progressMs: 64000,
    durationMs: 198000
  });

  // Focus Timer (Pomodoro FEAT-4) states
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60);
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [focusAssociatedTask, setFocusAssociatedTask] = useState('Focus libre');
  const [focusHoursThisWeek, setFocusHoursThisWeek] = useState(14.5);
  const [dailyActivityHeights, setDailyActivityHeights] = useState([35, 60, 45, 80, 50, 95, 30]);

  const focusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch Storage items
    const adapter = getStorageAdapter();
    const unsubIdeas = adapter.subscribe((items) => setIdeas(items));
    const unsubReminders = adapter.subscribeReminders((items) => setReminders(items));
    const unsubActivities = adapter.subscribeActivities((items) => setActivities(items));

    const savedUserSession = sessionStorage.getItem('devsync-active-user') as any;
    if (savedUserSession) {
      setActiveUser(savedUserSession);
    }

    // Load focus hours
    const savedHours = localStorage.getItem('devsync-focus-hours');
    if (savedHours) {
      setFocusHoursThisWeek(Number(savedHours));
    }

    return () => {
      unsubIdeas();
      unsubReminders();
      unsubActivities();
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    };
  }, []);

  // Spotify status poller with Page Visibility support
  useEffect(() => {
    let poller: NodeJS.Timeout;

    const querySpotify = async () => {
      const spRefresh = localStorage.getItem('devsync-spotify-refresh-token');
      if (!spRefresh) return;

      if (spRefresh === 'demo-refresh-token') {
        const index = mockTrackIndexRef.current;
        const track = MOCK_PLAYLIST[index];
        setMySpotify({
          ...track,
          progressMs: 0
        });
        mockTrackIndexRef.current = (index + 1) % MOCK_PLAYLIST.length;
        return;
      }

      let spAccess = localStorage.getItem('devsync-spotify-access-token');
      const spExpires = Number(localStorage.getItem('devsync-spotify-token-expires') || '0');

      // 1. Check expiration and refresh if necessary
      if (!spAccess || Date.now() >= spExpires) {
        try {
          const res = await fetch('/api/spotify/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: spRefresh })
          });
          if (res.ok) {
            const data = await res.json();
            spAccess = data.accessToken;
            localStorage.setItem('devsync-spotify-access-token', data.accessToken);
            localStorage.setItem('devsync-spotify-token-expires', String(Date.now() + data.expiresIn * 1000));
          }
        } catch (e) {
          return;
        }
      }

      if (!spAccess) return;

      // 2. Fetch track info
      try {
        const res = await fetch('/api/spotify/currently-playing', {
          headers: { Authorization: `Bearer ${spAccess}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMySpotify(data);
        }
      } catch (e) {}
    };

    // Polling triggers every 25 seconds
    querySpotify();
    poller = setInterval(() => {
      if (document.visibilityState === 'visible') {
        querySpotify();
      }
    }, 25000);

    // Listen to visibility change to query immediately when coming back
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        querySpotify();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(poller);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Spotify progress bar ticks simulator
  useEffect(() => {
    const progressTicker = setInterval(() => {
      if (mySpotify.isPlaying && mySpotify.progressMs && mySpotify.durationMs) {
        setMySpotify((prev) => ({
          ...prev,
          progressMs: Math.min(prev.progressMs! + 1000, prev.durationMs!)
        }));
      }
      if (partnerSpotify.isPlaying && partnerSpotify.progressMs && partnerSpotify.durationMs) {
        setPartnerSpotify((prev) => ({
          ...prev,
          progressMs: Math.min(prev.progressMs! + 1000, prev.durationMs!)
        }));
      }
    }, 1000);

    return () => clearInterval(progressTicker);
  }, [mySpotify.isPlaying, partnerSpotify.isPlaying]);

  // Pomodoro Focus Timer ticker
  useEffect(() => {
    if (isFocusRunning) {
      focusIntervalRef.current = setInterval(() => {
        setFocusTimeLeft((prev) => {
          if (prev <= 1) {
            // Session finished !
            setIsFocusRunning(false);
            if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
            handleFocusSessionComplete();
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    }

    return () => {
      if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
    };
  }, [isFocusRunning]);

  const handleFocusSessionComplete = async () => {
    // 1. Add 25 minutes (0.4 hours)
    const nextHours = Number((focusHoursThisWeek + 0.4).toFixed(1));
    setFocusHoursThisWeek(nextHours);
    localStorage.setItem('devsync-focus-hours', String(nextHours));

    // Increase today's vertical bar chart block height (index 4 = Friday, index 3 = Thursday depending on index)
    const today = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const mapDayIndex = today === 0 ? 6 : today - 1; // Map to L-D index
    setDailyActivityHeights((prev) => {
      const next = [...prev];
      next[mapDayIndex] = Math.min(next[mapDayIndex] + 12, 100);
      return next;
    });

    // 2. Browser local push notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("Focus complété !", {
        body: `Vous avez terminé une session de 25 minutes de focus sur : ${focusAssociatedTask}.`,
        icon: "/icon-512x512.png"
      });
    }

    // 3. Log collaborative activity
    await logActivity('reminder_done', `Focus complété (${focusAssociatedTask})`, activeUser);
  };

  const toggleFocusTimer = () => {
    setIsFocusRunning(!isFocusRunning);
  };

  const resetFocusTimer = () => {
    setIsFocusRunning(false);
    setFocusTimeLeft(25 * 60);
  };

  const handleSwitchUser = () => {
    const newUser = activeUser === 'Aymane' ? 'Collaborateur' : 'Aymane';
    setActiveUser(newUser);
    sessionStorage.setItem('devsync-active-user', newUser);
  };

  const handleToggleReminderDone = async (rem: Reminder) => {
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

  // Calculations for page items
  const totalIdeas = ideas.length || 1;
  const colIdeasCount = ideas.filter(i => i.column === 'ideas').length;
  const colProgressCount = ideas.filter(i => i.column === 'progress').length;
  const colCompletedCount = ideas.filter(i => i.column === 'completed').length;

  const pctIdeas = Math.round((colIdeasCount / totalIdeas) * 100);
  const pctProgress = Math.round((colProgressCount / totalIdeas) * 100);
  const pctCompleted = Math.round((colCompletedCount / totalIdeas) * 100);

  const activeReminders = reminders.slice(0, 5);
  const doneRemindersCount = reminders.filter(r => r.isDone).length;
  const totalRemindersCount = reminders.length;

  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "à l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    return `${date.toLocaleDateString()}`;
  };

  // Convert seconds to MM:SS format
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Calculate Spotify progress bar width percentage
  const getSpotifyProgressPct = (track: SpotifyTrack) => {
    if (!track.progressMs || !track.durationMs) return 0;
    return (track.progressMs / track.durationMs) * 100;
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
      
      {/* Title & Stats Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-[#ECEAE3]">
        <div className="flex flex-col gap-4.5">
          <h1 className="text-[40px] font-display font-semibold text-[#1B1B1B] tracking-tight leading-none">
            Bienvenue, {activeUser}
          </h1>
          
          <div className="flex flex-wrap items-center gap-5 text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
            <div className="flex flex-col gap-1 w-20">
              <div className="flex justify-between font-bold">
                <span>Idées</span>
                <span>{pctIdeas}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#ECEAE3] rounded-full overflow-hidden">
                <div className="h-full bg-[#161616] rounded-full" style={{ width: `${pctIdeas}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1 w-20">
              <div className="flex justify-between font-bold">
                <span>En cours</span>
                <span>{pctProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#ECEAE3] rounded-full overflow-hidden">
                <div className="h-full bg-[#F2C94C] rounded-full" style={{ width: `${pctProgress}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1 w-20">
              <div className="flex justify-between font-bold">
                <span>Terminé</span>
                <span>{pctCompleted}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#ECEAE3] rounded-full overflow-hidden">
                <div className="h-full bg-[#8C8A85] rounded-full" style={{ width: `${pctCompleted}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 md:gap-10 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F7F5EF] flex items-center justify-center text-[#1B1B1B]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div className="text-[32px] font-display font-bold text-[#1B1B1B] leading-none">2</div>
              <p className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85] mt-1">Membres</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FBE7A1]/40 flex items-center justify-center text-[#1B1B1B]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </div>
            <div>
              <div className="text-[32px] font-display font-bold text-[#1B1B1B] leading-none">{ideas.length}</div>
              <p className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85] mt-1">Projets</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F7F5EF] flex items-center justify-center text-[#1B1B1B]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <div className="text-[32px] font-display font-bold text-[#1B1B1B] leading-none">
                {reminders.filter(r => !r.isDone).length}
              </div>
              <p className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85] mt-1">Tâches</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Session User Profile */}
        <div className="card-light rounded-3xl p-6 flex flex-col justify-between gap-6 min-h-[220px]">
          <div>
            <span className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">Session Active</span>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-12 h-12 rounded-full bg-[#161616] text-[#F2C94C] flex items-center justify-center font-display font-bold text-lg select-none">
                {activeUser.charAt(0)}
              </div>
              <div>
                <h3 className="text-[18px] font-display font-semibold text-[#1B1B1B] leading-tight">
                  {activeUser}
                </h3>
                <p className="text-[11px] text-[#8C8A85] font-semibold mt-0.5">Binôme co-actif</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSwitchUser}
            className="w-full py-2.5 bg-[#F7F5EF] border border-[#ECEAE3] text-xs font-bold text-[#1B1B1B] rounded-full hover:bg-[#ECEAE3] transition-colors cursor-pointer text-center"
          >
            Changer de profil ⇆
          </button>
        </div>

        {/* Card 2: Pomodoro Focus Timer Widget (FEAT-4) */}
        <div className="card-light rounded-3xl p-6 flex flex-col justify-between gap-4 min-h-[220px]">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">Timer Focus (Pomodoro)</span>
              
              {/* Linked task select menu */}
              <select 
                value={focusAssociatedTask}
                onChange={(e) => setFocusAssociatedTask(e.target.value)}
                className="mt-1 bg-[#F7F5EF] border border-[#ECEAE3] rounded-lg px-2.5 py-1 text-[9.5px] font-semibold text-[#1B1B1B] focus:outline-none"
              >
                <option value="Focus libre">Focus libre</option>
                {ideas.map((idea) => (
                  <option key={idea.id} value={idea.title}>{idea.title}</option>
                ))}
              </select>
            </div>
            
            <div className="text-[10px] bg-[#FBE7A1] text-[#1B1B1B] px-2.5 py-0.5 rounded-full font-bold font-mono shadow-sm">
              {focusHoursThisWeek} h total
            </div>
          </div>

          {/* Time digits display */}
          <div className="flex items-baseline gap-2 justify-center my-1 select-none">
            <span className="text-[44px] font-display font-extrabold text-[#1B1B1B] tracking-tighter leading-none">
              {formatTime(focusTimeLeft)}
            </span>
            {isFocusRunning && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#F2C94C] animate-ping shrink-0 mb-2.5" />
            )}
          </div>
          
          {/* Controls button pills */}
          <div className="flex gap-2">
            <button
              onClick={toggleFocusTimer}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer text-center ${
                isFocusRunning 
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-[#161616] text-white hover:bg-black'
              }`}
            >
              {isFocusRunning ? 'Pause' : 'Démarrer'}
            </button>
            <button
              onClick={resetFocusTimer}
              className="px-4 py-1.5 bg-[#F7F5EF] border border-[#ECEAE3] text-xs font-bold text-[#1B1B1B] hover:bg-[#ECEAE3] rounded-full transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Card 3: Exact ONE Dark Task Card (Échéances à venir) */}
        <div className="card-dark rounded-3xl p-6 flex flex-col justify-between gap-5 min-h-[260px] md:row-span-2">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-white">
              Échéances à venir
            </h3>
            <span className="text-xs font-mono font-bold text-[#F2C94C]">
              {doneRemindersCount}/{totalRemindersCount}
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-3.5">
            {activeReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500 gap-1.5 flex-1">
                <p className="text-[10px] font-mono uppercase tracking-wider">Aucune tâche</p>
                <Link href="/rappels" className="text-[9px] text-[#F2C94C] hover:underline">Programmer →</Link>
              </div>
            ) : (
              activeReminders.map((rem) => (
                <div key={rem.id} className="flex items-center justify-between gap-3 text-[14px] leading-relaxed">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => handleToggleReminderDone(rem)}
                      className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                        rem.isDone 
                          ? 'bg-[#F2C94C] border-[#F2C94C] text-black' 
                          : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {rem.isDone && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                    <span className={`truncate leading-none ${rem.isDone ? 'line-through text-zinc-500 font-normal' : 'text-zinc-100 font-semibold font-sans'}`}>
                      {rem.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                    {getRelativeTime(rem.dueDate)}
                  </span>
                </div>
              ))
            )}
          </div>

          <Link
            href="/rappels"
            className="w-full py-2 bg-zinc-900 border border-zinc-800 text-xs font-bold text-center rounded-full hover:bg-zinc-800 text-[#F2C94C] transition-colors"
          >
            Gérer les rappels →
          </Link>
        </div>

        {/* Card 4: Daily Activity Chart Widget */}
        <div className="card-light rounded-3xl p-6 flex flex-col justify-between gap-4 min-h-[220px]">
          <div>
            <span className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">Activité de la semaine</span>
          </div>

          <div className="flex items-end justify-between h-24 px-2 select-none">
            {dailyActivityHeights.map((height, i) => {
              const isHighlight = i === new Date().getDay() - 1; // Highlight today's index (0-indexed L-D)
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div 
                    className={`w-4 rounded-t-sm transition-all duration-300 ${
                      isHighlight ? 'bg-[#F2C94C] shadow' : 'bg-[#161616]'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] font-mono font-semibold text-[#8C8A85]">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 5: Recent Activities / GitHub Feed (FEAT-6) */}
        <div className="card-light rounded-3xl p-6 flex flex-col gap-4 min-h-[220px]">
          <h3 className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#1B1B1B] pb-2 border-b border-[#ECEAE3]">
            Activités Récentes
          </h3>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[160px] pr-1">
            {activities.length === 0 ? (
              <div className="py-10 text-center text-[#8C8A85] uppercase tracking-wider text-[10px] font-mono">
                Aucune activité récente.
              </div>
            ) : (
              activities.slice(0, 4).map((act) => (
                <div key={act.id} className="flex justify-between items-center py-2 border-b border-[#ECEAE3]/50 text-[14px] leading-relaxed">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C] shrink-0"></span>
                    <span className="text-[#1B1B1B] font-semibold font-sans truncate">{act.title}</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#8C8A85] shrink-0 ml-1">
                    {getRelativeTime(act.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Spotify Live currently playing (Collaborative side-by-side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Your Spotify Player */}
        <div className="card-light rounded-3xl p-5 flex items-center justify-between gap-4 bg-white border border-[#ECEAE3]">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {mySpotify.isPlaying && mySpotify.albumArt ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={mySpotify.albumArt}
                alt="Spotify Album Art"
                className="w-14 h-14 rounded-2xl object-cover border border-[#ECEAE3] shadow"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#F7F5EF] flex items-center justify-center text-[#8C8A85] border border-[#ECEAE3]">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            )}

            <div className="flex flex-col min-w-0 flex-1 gap-1">
              <span className="text-[10px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85] flex items-center gap-1.5">
                {mySpotify.isPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
                Mon Spotify
              </span>
              
              {mySpotify.isPlaying ? (
                <div className="min-w-0">
                  <a
                    href={mySpotify.trackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-display font-bold text-[#1B1B1B] hover:underline truncate block leading-tight"
                  >
                    {mySpotify.title}
                  </a>
                  <span className="text-[11px] text-[#8C8A85] truncate block mt-0.5 font-medium leading-none">
                    {mySpotify.artists}
                  </span>
                </div>
              ) : (
                <span className="text-[11.5px] text-[#8C8A85] font-semibold">
                  Rien en écoute
                </span>
              )}

              {/* Progress bar */}
              {mySpotify.isPlaying && (
                <div className="w-full bg-[#ECEAE3] h-1 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-[#F2C94C] rounded-full" 
                    style={{ width: `${getSpotifyProgressPct(mySpotify)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <Link
            href="/config"
            className="w-8 h-8 rounded-full bg-[#F7F5EF] border border-[#ECEAE3] flex items-center justify-center text-[#8C8A85] hover:text-[#1B1B1B] hover:bg-[#ECEAE3] transition-all shrink-0 shadow-sm"
            title="Associer Spotify"
          >
            🔌
          </Link>
        </div>

        {/* Partner Spotify Player */}
        <div className="card-light rounded-3xl p-5 flex items-center justify-between gap-4 bg-white border border-[#ECEAE3]">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {partnerSpotify.isPlaying && partnerSpotify.albumArt ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={partnerSpotify.albumArt}
                alt="Partner Album Art"
                className="w-14 h-14 rounded-2xl object-cover border border-[#ECEAE3] shadow"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#F7F5EF] flex items-center justify-center text-[#8C8A85] border border-[#ECEAE3]">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            )}

            <div className="flex flex-col min-w-0 flex-1 gap-1">
              <span className="text-[10px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85] flex items-center gap-1.5">
                {partnerSpotify.isPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
                Spotify Co-Equipier
              </span>

              {partnerSpotify.isPlaying ? (
                <div className="min-w-0">
                  <a
                    href={partnerSpotify.trackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-display font-bold text-[#1B1B1B] hover:underline truncate block leading-tight"
                  >
                    {partnerSpotify.title}
                  </a>
                  <span className="text-[11px] text-[#8C8A85] truncate block mt-0.5 font-medium leading-none">
                    {partnerSpotify.artists}
                  </span>
                </div>
              ) : (
                <span className="text-[11.5px] text-[#8C8A85] font-semibold">
                  Rien en écoute
                </span>
              )}

              {/* Progress bar */}
              {partnerSpotify.isPlaying && (
                <div className="w-full bg-[#ECEAE3] h-1 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-[#F2C94C] rounded-full animate-pulse" 
                    style={{ width: `${getSpotifyProgressPct(partnerSpotify)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Projects Showcase section */}
      <div className="flex flex-col gap-4 mt-2">
        <h3 className="text-xs font-bold text-[#1B1B1B] uppercase tracking-wider font-mono">
          Vitrine de Projets
        </h3>
        <ShowcaseCarousel limit={3} />
        <Link 
          href="/projets"
          className="self-center mt-2 px-5 py-2.5 bg-[#161616] text-white hover:bg-black text-xs font-bold rounded-full shadow-md transition-all active:scale-95"
        >
          Voir toute la vitrine →
        </Link>
      </div>

    </div>
  );
}
