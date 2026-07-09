'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setCookie, saveLocalProfile, getCookie } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'local' | 'supabase'>('local');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Local state
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('A');

  // Supabase state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  useEffect(() => {
    // Populate supabase credentials if exist
    const url = localStorage.getItem('devsync-supabase-url') || '';
    const key = localStorage.getItem('devsync-supabase-key') || '';
    setSupabaseUrl(url);
    setSupabaseKey(key);
    
    const dbMode = getCookie('devsync-db-mode');
    if (dbMode === 'supabase') {
      setTab('supabase');
    }
  }, []);

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Le nom d'affichage est obligatoire.");
      return;
    }

    setCookie('devsync-db-mode', 'local', 30);
    saveLocalProfile({
      name: displayName.trim(),
      avatar: selectedAvatar
    });

    router.push('/');
    router.refresh();
  };

  const handleSupabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Save credentials first if customized
    if (supabaseUrl.trim() && supabaseKey.trim()) {
      localStorage.setItem('devsync-supabase-url', supabaseUrl.trim());
      localStorage.setItem('devsync-supabase-key', supabaseKey.trim());
      setCookie('devsync-supabase-url', supabaseUrl.trim(), 30);
      setCookie('devsync-supabase-key', supabaseKey.trim(), 30);
    }

    const client = getSupabaseClient();
    if (!client) {
      setError("Clés Supabase manquantes. Veuillez remplir la section de configuration de votre projet.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        setCookie('devsync-db-mode', 'supabase', 30);
        setCookie('devsync-session-token', data.session.access_token, 7);
        
        // Save local active user session name too
        const user = data.user;
        const name = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilisateur';
        saveLocalProfile({ name, avatar: name.charAt(0).toUpperCase() });
        
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Identifiants de connexion incorrects.");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setError(null);
    
    // Save credentials if customized
    if (supabaseUrl.trim() && supabaseKey.trim()) {
      localStorage.setItem('devsync-supabase-url', supabaseUrl.trim());
      localStorage.setItem('devsync-supabase-key', supabaseKey.trim());
      setCookie('devsync-supabase-url', supabaseUrl.trim(), 30);
      setCookie('devsync-supabase-key', supabaseKey.trim(), 30);
    }

    const client = getSupabaseClient();
    if (!client) {
      setError("Clés Supabase manquantes. Veuillez remplir la section de configuration de votre projet.");
      return;
    }

    try {
      setCookie('devsync-db-mode', 'supabase', 30);
      const { error: oauthError } = await client.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || "Impossible de lancer la connexion GitHub.");
    }
  };

  const AVATARS = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md card-light rounded-3xl p-6 md:p-8 flex flex-col gap-6 bg-white shadow-2xl relative z-10 animate-in fade-in duration-200">
        
        {/* Title */}
        <div className="text-center">
          <div className="w-10 h-10 rounded-2xl bg-[#161616] text-[#F2C94C] flex items-center justify-center font-display font-extrabold text-base tracking-tighter mx-auto shadow-sm select-none">
            DS
          </div>
          <h2 className="text-[26px] font-display font-bold text-[#1B1B1B] tracking-tight mt-3">
            Connexion DevSync
          </h2>
          <p className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85] mt-1">
            Espace Collaboratif Développeurs
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border border-[#ECEAE3] bg-[#F7F5EF] p-1 rounded-full">
          <button
            onClick={() => { setTab('local'); setError(null); }}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              tab === 'local'
                ? 'bg-[#161616] text-white shadow-sm font-bold'
                : 'text-[#8C8A85] hover:text-[#1B1B1B]'
            }`}
          >
            Hors-ligne (Local)
          </button>
          <button
            onClick={() => { setTab('supabase'); setError(null); }}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              tab === 'supabase'
                ? 'bg-[#161616] text-white shadow-sm font-bold'
                : 'text-[#8C8A85] hover:text-[#1B1B1B]'
            }`}
          >
            Cloud (Supabase)
          </button>
        </div>

        {/* Error panel */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-[10.5px] font-mono text-red-500 flex items-start gap-2 leading-relaxed animate-in shake duration-150">
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {tab === 'local' ? (
          /* Local Form */
          <form onSubmit={handleLocalSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="local-name" className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
                Nom d&apos;affichage
              </label>
              <input
                id="local-name"
                type="text"
                placeholder="Ex: Aymane"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
                Choisissez votre avatar
              </label>
              <div className="flex justify-between items-center gap-2">
                {AVATARS.map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => setSelectedAvatar(char)}
                    className={`w-9 h-9 rounded-full font-display font-bold text-sm flex items-center justify-center border transition-all cursor-pointer ${
                      selectedAvatar === char
                        ? 'bg-[#161616] border-[#161616] text-[#F2C94C] shadow-md scale-105'
                        : 'bg-[#F7F5EF] border-[#ECEAE3] text-[#8C8A85] hover:border-zinc-400 hover:text-[#1B1B1B]'
                    }`}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all cursor-pointer shadow-md"
            >
              Créer mon profil local →
            </button>
          </form>
        ) : (
          /* Supabase Form */
          <form onSubmit={handleSupabaseSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cloud-email" className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
                Adresse Email
              </label>
              <input
                id="cloud-email"
                type="email"
                placeholder="developer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="cloud-password" className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
                  Mot de passe
                </label>
              </div>
              <input
                id="cloud-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
                required
              />
            </div>

            {/* Collapsible Supabase Project Config */}
            <div className="border-t border-[#ECEAE3]/50 pt-2">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[9.5px] font-mono text-[#8C8A85] hover:text-[#1B1B1B] flex items-center gap-1.5 cursor-pointer uppercase tracking-wider font-semibold"
              >
                <span>Configuration Projet Supabase</span>
                <svg className={`w-3 h-3 transition-transform ${showConfig ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
              
              {showConfig && (
                <div className="flex flex-col gap-3 mt-3 p-3.5 rounded-2xl bg-[#F7F5EF] border border-[#ECEAE3] animate-in slide-in-from-top-1 duration-150">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="proj-url" className="text-[8.5px] font-mono text-[#8C8A85] uppercase">URL du projet</label>
                    <input
                      id="proj-url"
                      type="url"
                      placeholder="https://xxxxxxxx.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="bg-white border border-[#ECEAE3] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-[#1B1B1B] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="proj-key" className="text-[8.5px] font-mono text-[#8C8A85] uppercase">Clé Anonyme Publique</label>
                    <input
                      id="proj-key"
                      type="password"
                      placeholder="eyJhbGci..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="bg-white border border-[#ECEAE3] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-[#1B1B1B] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2.5 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              {loading && (
                <svg className="w-3.5 h-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              <span>Se connecter</span>
            </button>

            {/* GitHub OAuth Button */}
            <button
              type="button"
              onClick={handleGithubLogin}
              className="w-full py-2.5 bg-white border border-[#ECEAE3] hover:bg-[#F7F5EF] text-[#1B1B1B] font-bold text-xs rounded-full active:scale-95 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              </svg>
              <span>Continuer avec GitHub</span>
            </button>

            {/* Register redirection */}
            <p className="text-center text-[11px] text-[#8C8A85] mt-1">
              Pas encore de compte Cloud ?{' '}
              <Link href="/signup" className="text-[#1B1B1B] font-bold hover:underline">
                Créer un compte
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
