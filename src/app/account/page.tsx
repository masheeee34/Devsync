'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveProfile, logOut, saveLocalProfile, getDbMode, getCookie } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export default function AccountPage() {
  const router = useRouter();
  const [dbMode, setDbMode] = useState<'local' | 'supabase'>('local');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('A');
  const [email, setEmail] = useState('');
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const mode = getDbMode();
    setDbMode(mode);

    const profile = getActiveProfile();
    if (profile) {
      setDisplayName(profile.name);
      setSelectedAvatar(profile.avatar);
    }

    if (mode === 'supabase') {
      const client = getSupabaseClient();
      if (client) {
        client.auth.getUser().then(({ data }) => {
          if (data?.user) {
            setEmail(data.user.email || '');
            if (data.user.user_metadata?.display_name) {
              setDisplayName(data.user.user_metadata.display_name);
              setSelectedAvatar(data.user.user_metadata.display_name.charAt(0).toUpperCase());
            }
          }
        });
      }
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!displayName.trim()) {
      setError("Le nom d'affichage ne peut pas être vide.");
      return;
    }

    setLoading(true);

    if (dbMode === 'supabase') {
      const client = getSupabaseClient();
      if (!client) {
        setError("Client Supabase introuvable.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: updateError } = await client.auth.updateUser({
          data: { display_name: displayName.trim() }
        });

        if (updateError) throw updateError;

        if (data.user) {
          saveLocalProfile({
            name: displayName.trim(),
            avatar: displayName.trim().charAt(0).toUpperCase()
          });
          setSuccess("Profil mis à jour avec succès sur le cloud.");
        }
      } catch (err: any) {
        setError(err.message || "Une erreur est survenue lors de la mise à jour.");
      } finally {
        setLoading(false);
      }
    } else {
      // Local profile update
      saveLocalProfile({
        name: displayName.trim(),
        avatar: selectedAvatar
      });
      setSuccess("Profil local mis à jour localement.");
      setLoading(false);
      
      // Delay refresh to show success
      setTimeout(() => {
        router.refresh();
      }, 1000);
    }
  };

  const handleSignOut = async () => {
    if (dbMode === 'supabase') {
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
    }
    logOut();
    router.push('/login');
    router.refresh();
  };

  const AVATARS = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto w-full">
      <div>
        <h2 className="text-xs font-bold text-[#1B1B1B] uppercase tracking-wider font-mono">
          Mon Compte
        </h2>
        <p className="text-[11px] text-[#8C8A85] mt-0.5 font-medium">
          Gérez votre profil utilisateur, vos avatars, et votre mode de connexion.
        </p>
      </div>

      {/* Success / Error alerts */}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-[10.5px] font-mono text-emerald-600 flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
          </svg>
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-[10.5px] font-mono text-red-500 flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Profile Form (White Card) */}
      <form onSubmit={handleUpdateProfile} className="card-light rounded-3xl p-6 flex flex-col gap-4 bg-white shadow-sm">
        <h3 className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#1B1B1B] border-b border-[#ECEAE3] pb-2">
          Informations du Profil
        </h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="acc-name" className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
            Nom d&apos;affichage
          </label>
          <input
            id="acc-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B]"
            required
          />
        </div>

        {dbMode === 'supabase' ? (
          /* Email - Readonly for Supabase */
          <div className="flex flex-col gap-1.5 opacity-60">
            <label className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
              Adresse Email (Cloud)
            </label>
            <input
              type="text"
              value={email}
              disabled
              className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#8C8A85] cursor-not-allowed font-mono"
            />
          </div>
        ) : (
          /* Avatar chooser for Local mode */
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
              Avatar (Mode Hors-ligne)
            </label>
            <div className="flex gap-2">
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
        )}

        <div className="flex gap-3 pt-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-[#161616] hover:bg-black text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            <span>Sauvegarder</span>
          </button>
        </div>
      </form>

      {/* Account Settings - EXACTLY ONE DARK CARD FOR CONTRAST */}
      <div className="card-dark rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[8.5px] font-mono uppercase tracking-widest text-zinc-400 font-bold">Sécurité & Session</span>
          <h3 className="text-base font-display font-bold text-white mt-1">Actions de déconnexion</h3>
          <p className="text-xs text-zinc-300 mt-1">
            Mode actif : <span className="font-mono bg-zinc-800 text-[#F2C94C] px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{dbMode}</span>
          </p>
        </div>
        
        <button
          onClick={handleSignOut}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer shrink-0 shadow-md"
        >
          Déconnexion ⎋
        </button>
      </div>

    </div>
  );
}
