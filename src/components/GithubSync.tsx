'use client';

import { useState, useEffect } from 'react';
import { GitHubRepo, GitHubCommit } from '@/types';

// Demo datasets
const MOCK_REPOS: GitHubRepo[] = [
  {
    id: 101,
    name: 'wasm-compiler-core',
    description: 'Un compilateur expérimental WebAssembly écrit en Rust pour optimiser les calculs matriciels complexes dans le navigateur.',
    html_url: 'https://github.com/demo/wasm-compiler-core',
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    stargazers_count: 142,
    forks_count: 18,
    language: 'Rust',
    open_issues_count: 3
  },
  {
    id: 102,
    name: 'nextjs-pwa-dashboard',
    description: 'Template de dashboard PWA Next.js hautement optimisé pour iOS et Android avec synchronisation temps réel.',
    html_url: 'https://github.com/demo/nextjs-pwa-dashboard',
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    stargazers_count: 89,
    forks_count: 12,
    language: 'TypeScript',
    open_issues_count: 0
  },
  {
    id: 103,
    name: 'vector-db-indexer',
    description: 'Indexeur de documents léger et rapide pour bases de données de vecteurs. Supporte la recherche de similarité cosinus.',
    html_url: 'https://github.com/demo/vector-db-indexer',
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    stargazers_count: 53,
    forks_count: 5,
    language: 'Go',
    open_issues_count: 2
  }
];

const MOCK_COMMITS: Record<number, GitHubCommit[]> = {
  101: [
    {
      sha: 'a8f9c1b',
      commit: {
        author: { name: 'Aymane', date: new Date(Date.now() - 2 * 3600000).toISOString() },
        message: 'refactor: optimiser la boucle d\'exécution JIT et réduire l\'empreinte mémoire'
      },
      html_url: '#'
    },
    {
      sha: 'f4d3e2b',
      commit: {
        author: { name: 'Collaborateur', date: new Date(Date.now() - 6 * 3600000).toISOString() },
        message: 'feat: ajouter le support des instructions SIMD v128'
      },
      html_url: '#'
    }
  ],
  102: [
    {
      sha: 'e5a4d3c',
      commit: {
        author: { name: 'Aymane', date: new Date(Date.now() - 24 * 3600000).toISOString() },
        message: 'fix: résoudre le bug de défilement horizontal sur iOS Safari'
      },
      html_url: '#'
    }
  ],
  103: [
    {
      sha: '9c8b7a6',
      commit: {
        author: { name: 'Collaborateur', date: new Date(Date.now() - 3 * 86400005).toISOString() },
        message: 'feat: implémenter la recherche de similarité cosinus multi-threadée'
      },
      html_url: '#'
    }
  ]
};

const MOCK_READMES: Record<number, string> = {
  101: `# WASM Compiler Core\n\nUn compilateur expérimental WebAssembly écrit en **Rust** pour optimiser le traitement de données lourdes directement dans le navigateur.\n\n## Fonctionnalités\n- Compilation rapide vers le bytecode WASM.\n- Optimisation des calculs matriciels.\n- Interface JavaScript bidirectionnelle sans latence.\n\n## Installation\n\`\`\`bash\ncargo build --release\n\`\`\`\n\n---\n*Projet interne de recherche pour notre suite d'outils collaboratifs.*`,
  102: `# Next.js PWA Dashboard\n\nUn template haut de gamme pour créer des applications web progressives (PWA) de type tableau de bord.\n\n## Points Forts\n- **iOS Standalone Ready** : Support parfait des encoches et du zoom mobile.\n- **Service Worker personnalisé** : Gestion avancée du cache hors-ligne.\n- **Tailwind CSS v4** : Structure CSS ultra-moderne et performante.\n\n## Utilisation\n\`\`\`bash\nnpm run dev\n\`\`\`\n`,
  103: `# Vector DB Indexer\n\nUn indexeur ultra-léger et rapide pour la recherche vectorielle écrit en **Go**.\n\n## Caractéristiques\n- Recherche par similarité cosinus optimisée.\n- Faible consommation RAM.\n- API REST native intégrée.\n`
};

export default function GithubSync() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState<GitHubRepo[]>(MOCK_REPOS);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [readme, setReadme] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('devsync-gh-username');
    const savedToken = localStorage.getItem('devsync-gh-token');
    
    if (savedUser && savedUser !== 'Démo') {
      setUsername(savedUser);
      setIsDemoMode(false);
      fetchUserRepos(savedUser, savedToken || '');
    }
  }, []);

  const fetchUserRepos = async (user: string, tokenVal: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        Accept: 'application/vnd.github.v3+json',
      };

      if (tokenVal.trim()) {
        headers['Authorization'] = `token ${tokenVal.trim()}`;
      }

      const res = await fetch(`https://api.github.com/users/${user.trim()}/repos?sort=updated&per_page=15`, {
        headers,
      });

      if (!res.ok) {
        throw new Error(`GitHub API renvoie le code : ${res.status}`);
      }

      const data: GitHubRepo[] = await res.json();
      data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setRepos(data);
      setIsDemoMode(false);
      
      localStorage.setItem('devsync-gh-username', user.trim());
      if (tokenVal.trim()) {
        localStorage.setItem('devsync-gh-token', tokenVal.trim());
      } else {
        localStorage.removeItem('devsync-gh-token');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
      setRepos(MOCK_REPOS);
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setIsDemoMode(true);
      setRepos(MOCK_REPOS);
      localStorage.setItem('devsync-gh-username', 'Démo');
      localStorage.removeItem('devsync-gh-token');
      setSelectedRepo(null);
      return;
    }
    await fetchUserRepos(username, token);
  };

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setReadme('');
    setCommits([]);
    setIsLoadingDetails(true);

    if (isDemoMode) {
      setTimeout(() => {
        setReadme(MOCK_READMES[repo.id] || '# Aucun README disponible.');
        setCommits(MOCK_COMMITS[repo.id] || []);
        setIsLoadingDetails(false);
      }, 500);
      return;
    }

    try {
      const headers: HeadersInit = {
        Accept: 'application/vnd.github.v3+json',
      };
      const savedToken = localStorage.getItem('devsync-gh-token');
      if (savedToken) {
        headers['Authorization'] = `token ${savedToken}`;
      }

      // Fetch readme
      const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, { headers });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        const decoded = atob(readmeData.content);
        setReadme(decoded);
      } else {
        setReadme('# README.md non trouvé ou inaccessible.');
      }

      // Fetch commits
      const commitsRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/commits?per_page=5`, { headers });
      if (commitsRes.ok) {
        const commitsData = await commitsRes.json();
        setCommits(commitsData);
      }
    } catch (err) {
      setReadme('# Impossible de récupérer les données du dépôt.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-[#8C8A85] font-mono text-[10px]">README vide ou inexistant.</p>;
    
    const lines = text.split('\n');
    return (
      <div className="prose max-w-none text-xs leading-relaxed text-[#1B1B1B] font-sans flex flex-col gap-3">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="text-sm font-display font-bold text-[#1B1B1B] mt-4 border-b border-[#ECEAE3] pb-1">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-xs font-bold text-[#1B1B1B] mt-3">{line.slice(3)}</h2>;
          }
          if (line.startsWith('- ')) {
            return <li key={idx} className="list-disc pl-4 ml-2 text-[11.5px] text-[#8C8A85]">{line.slice(2)}</li>;
          }
          if (line.startsWith('```')) {
            return null; // Skip code fences
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx} className="text-[11.5px] leading-relaxed text-[#8C8A85]">{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {selectedRepo ? (
        /* Repository Detail Screen */
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Back button */}
          <button 
            onClick={() => setSelectedRepo(null)}
            className="self-start flex items-center gap-1.5 text-[10px] text-[#1B1B1B] hover:bg-[#F7F5EF] font-mono uppercase tracking-wider bg-white border border-[#ECEAE3] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer shadow-sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            <span>Retour aux dépôts</span>
          </button>

          {/* Repo Info Header: EXACTLY ONE DARK CARD FOR CONTRAST */}
          <div className="card-dark rounded-3xl p-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-[#F2C94C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                </svg>
                {selectedRepo.name}
              </h2>
              <a 
                href={selectedRepo.html_url} 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] text-zinc-400 hover:text-[#F2C94C] hover:underline font-mono"
              >
                Ouvrir sur GitHub ↗
              </a>
            </div>
            
            {selectedRepo.description && (
              <p className="text-xs text-zinc-300 leading-relaxed">
                {selectedRepo.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-[9px] font-mono text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C]"></span>
                {selectedRepo.language || 'Aucun'}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-[#F2C94C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {selectedRepo.stargazers_count}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M6 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M18 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M18 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v8a2 2 0 0 0-2 2H6" />
                </svg>
                {selectedRepo.forks_count}
              </span>
            </div>
          </div>

          {/* Details Row (Light elements) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* README */}
            <div className="lg:col-span-3 card-light rounded-3xl p-6 flex flex-col gap-4">
              <h3 className="text-[10px] font-bold text-[#1B1B1B] uppercase tracking-wider font-mono pb-2 border-b border-[#ECEAE3] flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#8C8A85]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                README.md
              </h3>
              
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#8C8A85] gap-2">
                  <svg className="w-6 h-6 animate-spin text-[#1B1B1B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span className="text-[10px] font-mono tracking-wider">Chargement...</span>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] pr-2">
                  {renderMarkdown(readme)}
                </div>
              )}
            </div>

            {/* COMMITS */}
            <div className="lg:col-span-2 card-cream rounded-3xl p-6 flex flex-col gap-4">
              <h3 className="text-[10px] font-bold text-[#1B1B1B] uppercase tracking-wider font-mono pb-2 border-b border-[#ECEAE3] flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#8C8A85]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Derniers Commits
              </h3>
              
              {isLoadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#8C8A85] gap-2">
                  <svg className="w-6 h-6 animate-spin text-[#1B1B1B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span className="text-[10px] font-mono tracking-wider">Chargement...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {commits.length === 0 ? (
                    <p className="text-[10px] text-[#8C8A85] py-6 text-center font-mono">Aucun commit trouvé.</p>
                  ) : (
                    commits.map((c, i) => (
                      <div key={i} className="flex flex-col gap-1.5 p-3.5 bg-white border border-[#ECEAE3] rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center text-[9px] font-mono text-[#8C8A85]">
                          <span className="text-[#1B1B1B] font-semibold">{c.commit.author.name}</span>
                          <span>{c.sha.slice(0, 7)}</span>
                        </div>
                        <p className="text-xs text-[#1B1B1B] font-medium leading-snug">
                          {c.commit.message}
                        </p>
                        <span className="text-[8px] text-[#8C8A85] font-mono self-end">
                          {new Date(c.commit.author.date).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Repository List Screen */
        <div className="flex flex-col gap-6">
          {/* GitHub Connection panel: EXACTLY ONE DARK CARD FOR CONTRAST */}
          <div className="card-dark rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F2C94C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  </svg>
                  Synchronisation de compte GitHub
                </h2>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Connectez un compte pour récupérer automatiquement les dépôts publics et privés.
                </p>
              </div>

              {isDemoMode ? (
                <span className="self-start md:self-auto text-[9px] font-mono px-2.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300 uppercase tracking-wider">
                  Démo mock
                </span>
              ) : (
                <span className="self-start md:self-auto text-[9px] font-mono px-2.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-[#F2C94C] uppercase tracking-wider font-semibold">
                  @{username}
                </span>
              )}
            </div>

            <form onSubmit={handleConnect} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="gh-username" className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Nom d&apos;utilisateur</label>
                <input
                  id="gh-username"
                  type="text"
                  placeholder="Ex: aymane-dev"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gh-token" className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Token d&apos;accès privé
                </label>
                <input
                  id="gh-token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-white text-black hover:bg-[#F7F5EF] font-mono uppercase tracking-wider text-[10px] font-bold rounded-full disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>Chargement...</span>
                  </>
                ) : (
                  <span>{username.trim() ? 'Mettre à jour' : 'Utiliser Démo'}</span>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded font-mono">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Repo list grid (Light elements) */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-semibold text-[#8C8A85] uppercase tracking-widest font-mono">
              Projets et Dépôts ({repos.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repos.map((repo) => (
                <div 
                  key={repo.id}
                  onClick={() => handleSelectRepo(repo)}
                  className="group bg-white border border-[#ECEAE3] hover:border-black rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-display font-bold text-[#1B1B1B] group-hover:text-black transition-colors truncate">
                        {repo.name}
                      </h4>
                      <svg className="w-4 h-4 text-[#8C8A85] group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-[#8C8A85] line-clamp-2 leading-relaxed">
                        {repo.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#8C8A85] font-mono pt-2 border-t border-[#ECEAE3]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C]"></span>
                      {repo.language || 'Autre'}
                    </span>
                    
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3.5 h-3.5 text-[#F2C94C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {repo.stargazers_count}
                      </span>
                      <span>
                        Mise à jour : {new Date(repo.updated_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
