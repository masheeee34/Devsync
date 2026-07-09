'use client';

import { useState, useEffect } from 'react';
import ShowcaseCarousel from '@/components/ShowcaseCarousel';

export default function ProjetsPage() {
  const [vercelToken, setVercelToken] = useState('');
  const [githubUser, setGithubUser] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setVercelToken(localStorage.getItem('devsync-vercel-token') || '');
    setGithubUser(localStorage.getItem('devsync-gh-username') || '');
  }, []);

  const handleSaveTokens = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    
    if (typeof window === 'undefined') return;
    localStorage.setItem('devsync-vercel-token', vercelToken.trim());
    localStorage.setItem('devsync-gh-username', githubUser.trim());
    
    // Also save in cookies for middleware accessibility
    document.cookie = `devsync-gh-token=${encodeURIComponent(localStorage.getItem('devsync-gh-token') || '')}; path=/; SameSite=Lax`;

    setSuccess("Clés de déploiement enregistrées avec succès. Rafraîchissez la vitrine pour actualiser les données !");
    
    // Auto-clear success message
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Title */}
      <div className="flex justify-between items-center pb-3 border-b border-[#ECEAE3]">
        <div>
          <h2 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase font-mono">Vitrine de Projets</h2>
          <p className="text-[11px] text-[#8C8A85] mt-0.5 font-medium">Découvrez les déploiements actifs et les dépôts de l&apos;équipe.</p>
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-[10.5px] font-mono text-emerald-600 flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Showcase carousel widget */}
      <div className="w-full">
        <ShowcaseCarousel />
      </div>

      {/* EXACTLY ONE DARK CARD FOR CONTRAST - Credentials Config */}
      <form onSubmit={handleSaveTokens} className="card-dark rounded-3xl p-6 flex flex-col gap-4">
        <div>
          <span className="text-[8.5px] font-mono uppercase tracking-widest text-zinc-400 font-bold">Intégration API</span>
          <h3 className="text-base font-display font-bold text-white mt-1">Alimentation dynamique Vercel & GitHub</h3>
          <p className="text-xs text-zinc-300 mt-1">
            Renseignez votre jeton d&apos;accès Vercel pour afficher en direct les statuts de déploiement (Live / Build / Erreur) et pouvoir redéployer manuellement vos sites.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="proj-gh-user" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Compte GitHub</label>
            <input
              id="proj-gh-user"
              type="text"
              placeholder="Ex: aymane-dev"
              value={githubUser}
              onChange={(e) => setGithubUser(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="proj-ver-tok" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Token d&apos;accès Vercel</label>
            <input
              id="proj-ver-tok"
              type="password"
              placeholder="Vercel Token (ex: a1B2c3D4...)"
              value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer self-start shadow-md"
        >
          Enregistrer les jetons
        </button>
      </form>
    </div>
  );
}
