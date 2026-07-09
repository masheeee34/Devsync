'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { setCookie, deleteCookie } from '@/lib/auth';
import { resetSupabaseClient } from '@/lib/supabase';

export default function ConfigDb() {
  const [dbMode, setDbMode] = useState<'local' | 'supabase'>('local');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [vercelToken, setVercelToken] = useState('');
  const [spotifyRefreshToken, setSpotifyRefreshToken] = useState('');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  useEffect(() => {
    // Read credentials
    const savedUrl = localStorage.getItem('devsync-supabase-url') || '';
    const savedKey = localStorage.getItem('devsync-supabase-key') || '';
    const modeOverride = localStorage.getItem('devsync-db-mode-override') || 'local';
    const vToken = localStorage.getItem('devsync-vercel-token') || '';
    const spRefresh = localStorage.getItem('devsync-spotify-refresh-token') || '';

    setUrl(savedUrl);
    setAnonKey(savedKey);
    setVercelToken(vToken);
    setSpotifyRefreshToken(spRefresh);
    setSpotifyConnected(!!spRefresh);

    if (savedUrl && savedKey && modeOverride === 'supabase') {
      setDbMode('supabase');
    } else {
      setDbMode('local');
    }

    // Check Spotify URL query params for callback returning
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify_connected') === 'true') {
      const spToken = params.get('refresh_token') || '';
      const accToken = params.get('access_token') || '';
      const expIn = params.get('expires_in') || '';

      if (spToken) {
        localStorage.setItem('devsync-spotify-refresh-token', spToken);
        localStorage.setItem('devsync-spotify-access-token', accToken);
        localStorage.setItem('devsync-spotify-token-expires', String(Date.now() + Number(expIn) * 1000));
        
        setSpotifyRefreshToken(spToken);
        setSpotifyConnected(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (params.get('error') === 'spotify_env_missing') {
      setTestResult({
        success: false,
        message: "Variables d'environnement Spotify manquantes. Renseignez SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET dans votre fichier .env et redémarrez le serveur."
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
      setTestResult({
        success: false,
        message: `Erreur Spotify : ${params.get('error')}`
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleToggleMode = (mode: 'local' | 'supabase') => {
    if (mode === 'supabase' && (!url || !anonKey)) {
      setTestResult({ success: false, message: 'Veuillez saisir vos identifiants ci-dessous avant d\'activer la synchronisation.' });
      return;
    }
    setDbMode(mode);
    localStorage.setItem('devsync-db-mode-override', mode);
    setCookie('devsync-db-mode', mode, 30);
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const tempClient = createClient(url.trim(), anonKey.trim());
      const { error } = await tempClient.from('ideas').select('id').limit(1);

      if (error && error.code !== 'PGRST116' && !error.message.includes('relation "ideas" does not exist')) {
        throw error;
      }

      setTestResult({
        success: true,
        message: 'Connexion établie avec succès. La synchronisation en temps réel est active.'
      });

      // Save locally and in cookies for Next Middleware
      localStorage.setItem('devsync-supabase-url', url.trim());
      localStorage.setItem('devsync-supabase-key', anonKey.trim());
      localStorage.setItem('devsync-db-mode-override', 'supabase');
      
      setCookie('devsync-db-mode', 'supabase', 30);
      setCookie('devsync-supabase-url', url.trim(), 30);
      setCookie('devsync-supabase-key', anonKey.trim(), 30);

      resetSupabaseClient();
      setDbMode('supabase');
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Échec de connexion : ${err.message || 'Vérifiez l\'URL et la clé anonyme.'}`
      });
      localStorage.setItem('devsync-db-mode-override', 'local');
      setCookie('devsync-db-mode', 'local', 30);
      setDbMode('local');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    
    localStorage.removeItem('devsync-supabase-url');
    localStorage.removeItem('devsync-supabase-key');
    localStorage.setItem('devsync-db-mode-override', 'local');
    
    setCookie('devsync-db-mode', 'local', 30);
    deleteCookie('devsync-supabase-url');
    deleteCookie('devsync-supabase-key');
    
    resetSupabaseClient();
    setDbMode('local');
  };

  const handleSaveVercel = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('devsync-vercel-token', vercelToken.trim());
    alert("Token Vercel sauvegardé !");
  };

  const handleConnectSpotify = () => {
    // Redirect to server-side Spotify login route
    window.location.href = '/api/spotify/login';
  };

  const handleDisconnectSpotify = () => {
    localStorage.removeItem('devsync-spotify-refresh-token');
    localStorage.removeItem('devsync-spotify-access-token');
    localStorage.removeItem('devsync-spotify-token-expires');
    setSpotifyRefreshToken('');
    setSpotifyConnected(false);
    alert("Spotify déconnecté.");
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full animate-in fade-in duration-200">
      <div>
        <h2 className="text-xs font-bold text-[#1B1B1B] uppercase tracking-wider font-mono">
          Configuration de la Base de Données
        </h2>
        <p className="text-[11px] text-[#8C8A85] mt-0.5 font-medium">
          Pilotez le mode de persistance de vos tickets et activez la collaboration en temps réel.
        </p>
      </div>

      {/* Mode selectors (Light panels) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleToggleMode('local')}
          className={`flex flex-col items-start text-left p-4.5 rounded-3xl border transition-all cursor-pointer ${
            dbMode === 'local'
              ? 'bg-white border-black text-[#1B1B1B] shadow-sm font-bold'
              : 'bg-white border-[#ECEAE3] text-[#8C8A85] hover:border-black'
          }`}
        >
          <span className="text-[10px] font-display uppercase tracking-wider font-bold">Stockage Local</span>
          <span className="text-[10px] mt-1 text-[#8C8A85] leading-relaxed font-semibold">
            Données stockées dans votre navigateur local. Parfait pour tester en solo sans installation.
          </span>
        </button>

        <button
          onClick={() => handleToggleMode('supabase')}
          className={`flex flex-col items-start text-left p-4.5 rounded-3xl border transition-all cursor-pointer ${
            dbMode === 'supabase'
              ? 'bg-white border-black text-[#1B1B1B] shadow-sm font-bold'
              : 'bg-white border-[#ECEAE3] text-[#8C8A85] hover:border-black'
          }`}
        >
          <span className="text-[10px] font-display uppercase tracking-wider font-bold">Supabase Realtime</span>
          <span className="text-[10px] mt-1 text-[#8C8A85] leading-relaxed font-semibold">
            Synchronisation instantanée sur le cloud. Permet à votre collaborateur de voir vos modifs en direct.
          </span>
        </button>
      </div>

      {/* Form configuration: EXACTLY ONE DARK CARD FOR CONTRAST */}
      <form onSubmit={handleTestConnection} className="card-dark rounded-3xl p-5 flex flex-col gap-4">
        <h3 className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
          Paramètres d&apos;accès Supabase
        </h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="url-input" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">URL du projet</label>
          <input
            id="url-input"
            type="url"
            placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="key-input" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Clé anonyme publique (Anon Key)</label>
          <input
            id="key-input"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isTesting}
            className="px-4 py-2 bg-white text-black font-bold text-xs rounded-full hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isTesting && (
              <svg className="w-3 h-3 animate-spin text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            <span>Enregistrer & Tester</span>
          </button>
          
          {(url || anonKey) && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-4 py-2 border border-zinc-800 text-zinc-350 hover:text-white font-bold text-xs rounded-full active:scale-95 transition-all cursor-pointer"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {testResult && (
          <div className={`mt-2 p-3 rounded border text-[10px] font-mono leading-normal flex items-start gap-2 ${
            testResult.success
              ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400'
              : 'bg-red-950/20 border-red-900/30 text-red-400'
          }`}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {testResult.success ? (
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </>
              )}
            </svg>
            <span>{testResult.message}</span>
          </div>
        )}
      </form>

      {/* Integrations panel (Light cards) */}
      <div className="card-light rounded-3xl p-5 flex flex-col gap-4">
        <h3 className="text-[10px] font-bold text-[#1B1B1B] uppercase tracking-widest font-mono border-b border-[#ECEAE3] pb-2">
          Intégrations Tiers
        </h3>

        {/* Vercel config */}
        <form onSubmit={handleSaveVercel} className="flex flex-col gap-3 pb-4 border-b border-[#ECEAE3]/50">
          <div className="flex flex-col gap-1">
            <label htmlFor="ver-token" className="text-[9.5px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">Jeton d&apos;accès Vercel</label>
            <input
              id="ver-token"
              type="password"
              placeholder="Jeton personnel Vercel..."
              value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
              className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#1B1B1B]"
            />
          </div>
          <button
            type="submit"
            className="px-4.5 py-2 bg-[#161616] text-white text-[10px] font-mono uppercase tracking-wider font-bold rounded-full hover:bg-black self-start"
          >
            Sauvegarder Vercel
          </button>
        </form>

        {/* Spotify Config */}
        <div className="flex flex-col gap-3 pt-1">
          <div>
            <h4 className="text-xs font-display font-semibold text-[#1B1B1B]">Lecteur Spotify &quot;En écoute&quot;</h4>
            <p className="text-[10px] text-[#8C8A85] leading-relaxed mt-0.5 font-medium">
              Synchronisez votre compte pour afficher le morceau en cours de lecture sur le tableau de bord de l&apos;équipe.
            </p>
          </div>

          {spotifyConnected ? (
            <div className="flex items-center justify-between p-3.5 bg-[#FBE7A1]/30 border border-[#ECEAE3] rounded-2xl">
              <span className="text-[10px] font-mono text-[#1B1B1B] font-bold">
                ✓ Spotify connecté
              </span>
              <button
                onClick={handleDisconnectSpotify}
                className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[9px] font-mono uppercase font-bold rounded-full cursor-pointer shadow-sm"
              >
                Déconnecter
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectSpotify}
              className="px-4.5 py-2.5 bg-[#F2C94C] text-[#1B1B1B] text-[10px] font-mono uppercase tracking-wider font-bold rounded-full hover:bg-amber-500 active:scale-95 transition-all self-start flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.892-.982-.336.076-.67-.135-.746-.47-.077-.337.135-.67.47-.747 3.856-.88 7.15-.506 9.815 1.13.295.18.387.563.207.862zm1.226-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.158-10.076-1.185-.412.125-.845-.107-.97-.52-.124-.412.108-.847.52-.972 3.667-1.11 8.243-.574 11.34 1.332.367.226.488.707.26 1.075v.01zm.106-2.833C14.382 8.783 9.4 8.618 6.518 9.493c-.482.146-.988-.128-1.134-.61-.147-.483.128-.99.61-1.136 3.32-.992 8.81-.8 12.835 1.58.435.258.577.82.318 1.256-.258.436-.82.578-1.256.32z"/>
              </svg>
              <span>Associer Spotify</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
