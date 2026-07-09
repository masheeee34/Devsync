'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';
import CommandPalette from '@/components/CommandPalette';
import { getActiveProfile, getDbMode, LocalProfile } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [dbMode, setDbMode] = useState<'local' | 'web'>('local');
  const [userProfile, setUserProfile] = useState<LocalProfile>({ name: 'Aymane', avatar: 'A' });
  const [onlineUsers, setOnlineUsers] = useState<string[]>(['Aymane']);

  useEffect(() => {
    // Read local active profile
    const updateShellState = () => {
      const mode = getDbMode();
      setDbMode(mode === 'supabase' ? 'web' : 'local');
      
      const profile = getActiveProfile();
      if (profile) {
        setUserProfile(profile);
      }
    };

    updateShellState();
    const interval = setInterval(updateShellState, 2000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime Presence hook
  useEffect(() => {
    const mode = getDbMode();
    if (mode !== 'supabase') {
      setOnlineUsers([userProfile.name]);
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    const channel = client.channel('presence-room', {
      config: {
        presence: { key: userProfile.name }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const active: string[] = [];
        for (const key in state) {
          active.push(key);
        }
        setOnlineUsers(active);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            onlineAt: new Date().toISOString(),
            page: pathname
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userProfile.name, pathname]);

  const handleToggleDbMode = (mode: 'local' | 'web') => {
    if (mode === 'web') {
      const url = localStorage.getItem('devsync-supabase-url');
      const key = localStorage.getItem('devsync-supabase-key');
      if (!url || !key) {
        router.push('/config');
        alert("Veuillez d'abord configurer vos identifiants Supabase dans la page 'Config DB'.");
        return;
      }
      localStorage.setItem('devsync-db-mode-override', 'supabase');
      document.cookie = "devsync-db-mode=supabase; path=/; SameSite=Lax";
    } else {
      localStorage.setItem('devsync-db-mode-override', 'local');
      document.cookie = "devsync-db-mode=local; path=/; SameSite=Lax";
    }
    setDbMode(mode);
    router.refresh();
  };

  const isUserOnline = (name: string) => {
    return onlineUsers.some(u => u.toLowerCase() === name.toLowerCase());
  };

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Accueil',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      href: '/idees',
      label: 'Idées',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
    {
      href: '/github',
      label: 'Sync GitHub',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      ),
    },
    {
      href: '/rappels',
      label: 'Rappels',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
        </svg>
      ),
    },
    {
      href: '/projets',
      label: 'Vitrine',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      href: '/boite-a-outils',
      label: 'Outils',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
      ),
    },
    {
      href: '/config',
      label: 'Config DB',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen relative z-10">
      
      {/* Command Palette search triggerable globally */}
      <CommandPalette />
      
      {/* Top Header Navigation - Desktop/Tablet */}
      <header className="sticky top-0 z-40 bg-[#F4F3F0]/90 backdrop-blur-md border-b border-[#ECEAE3] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Logo & Project Name */}
          <div className="flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#161616] text-[#F2C94C] flex items-center justify-center font-display font-extrabold text-sm tracking-tighter shadow-sm select-none">
              DS
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-bold text-sm text-[#1B1B1B] tracking-tight">DevSync</span>
              <span className="font-mono text-[7px] px-1.5 py-0.5 rounded-full bg-[#F7F5EF] border border-[#ECEAE3] text-[#8C8A85] tracking-widest font-semibold uppercase">
                v1.0.0
              </span>
            </div>
          </div>

          {/* Center: Navigation Pill (Desktop only) */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#F7F5EF] border border-[#ECEAE3] p-1 rounded-full">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#161616] text-white shadow-sm font-bold'
                      : 'text-[#8C8A85] hover:text-[#1B1B1B] hover:bg-white/40'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Toggle + Bells + Settings + Profile */}
          <div className="flex items-center gap-3">
            {/* Database Switcher */}
            <div className="flex p-0.5 bg-[#F7F5EF] border border-[#ECEAE3] rounded-full">
              <button
                onClick={() => handleToggleDbMode('local')}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider font-bold rounded-full transition-all cursor-pointer ${
                  dbMode === 'local'
                    ? 'bg-[#161616] text-white shadow-sm'
                    : 'text-[#8C8A85] hover:text-[#1B1B1B]'
                }`}
              >
                Local
              </button>
              <button
                onClick={() => handleToggleDbMode('web')}
                className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider font-bold rounded-full transition-all cursor-pointer ${
                  dbMode === 'web'
                    ? 'bg-[#161616] text-white shadow-sm'
                    : 'text-[#8C8A85] hover:text-[#1B1B1B]'
                }`}
              >
                Web
              </button>
            </div>

            {/* Notification bell (with yellow badge) */}
            <NotificationCenter />

            {/* Settings button */}
            <Link
              href="/config"
              className="w-8 h-8 rounded-full bg-white border border-[#ECEAE3] flex items-center justify-center text-[#8C8A85] hover:text-[#1B1B1B] hover:bg-[#F7F5EF] transition-all cursor-pointer shadow-sm"
              title="Paramètres"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>

            {/* Profile Avatar with online status */}
            <Link
              href="/account"
              className="relative w-8 h-8 rounded-full bg-[#161616] text-[#F2C94C] flex items-center justify-center text-xs font-bold font-mono border border-black/10 select-none shadow-sm cursor-pointer"
              title="Mon Profil"
            >
              {userProfile.avatar}
              {/* Online indicator dot (FEAT-1) */}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                isUserOnline(userProfile.name) ? 'bg-emerald-400' : 'bg-zinc-400'
              }`} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 pb-24 lg:pb-12 flex flex-col gap-6 relative z-10 animate-in fade-in duration-200">
        {children}
      </main>

      {/* Mobile Nav Bar - Mobile only with iPhone safe-area-inset-bottom support */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#ECEAE3] flex justify-around p-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-full transition-all cursor-pointer ${
                isActive ? 'text-[#1B1B1B] font-bold' : 'text-[#8C8A85]'
              }`}
            >
              <div className={`p-2 rounded-full transition-all ${
                isActive ? 'bg-[#161616] text-white shadow-sm' : 'text-[#8C8A85]'
              }`}>
                {item.icon}
              </div>
              <span className="text-[8px] font-semibold tracking-wider uppercase">
                {item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
