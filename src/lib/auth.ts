'use client';

export interface LocalProfile {
  name: string;
  avatar: string;
}

export function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
}

// Session Sync Utilities
export function getDbMode(): 'local' | 'supabase' {
  if (typeof window === 'undefined') return 'local';
  const mode = getCookie('devsync-db-mode') || localStorage.getItem('devsync-db-mode-override') || 'local';
  return mode === 'supabase' ? 'supabase' : 'local';
}

export function getActiveProfile(): LocalProfile | null {
  const profileJson = getCookie('devsync-local-profile');
  if (profileJson) {
    try {
      return JSON.parse(profileJson);
    } catch (e) {
      return null;
    }
  }
  
  if (typeof window !== 'undefined') {
    const localUser = sessionStorage.getItem('devsync-active-user') || 'Aymane';
    return { name: localUser, avatar: localUser.charAt(0) };
  }
  
  return null;
}

export function saveLocalProfile(profile: LocalProfile) {
  const json = JSON.stringify(profile);
  setCookie('devsync-local-profile', json, 30);
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('devsync-active-user', profile.name);
  }
}

export function logOut() {
  deleteCookie('devsync-session-token');
  deleteCookie('devsync-local-profile');
  if (typeof window !== 'undefined') {
    localStorage.removeItem('devsync-supabase-url');
    localStorage.removeItem('devsync-supabase-key');
    sessionStorage.removeItem('devsync-active-user');
  }
}
