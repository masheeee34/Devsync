'use client';

import { useState, useEffect, useRef } from 'react';
import { getStorageAdapter } from '@/lib/storage';

export interface Project {
  name: string;
  description: string;
  stack: string;
  liveUrl: string;
  repoUrl: string;
  previewImage: string;
  updatedAt: string;
  deployStatus?: 'READY' | 'BUILDING' | 'ERROR' | 'OFFLINE';
  branch?: string;
  commitMsg?: string;
  commitAuthor?: string;
}

export default function ShowcaseCarousel({ limit }: { limit?: number }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [vercelToken, setVercelToken] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<string | null>(null);
  const [selectedProjectForPreview, setSelectedProjectForPreview] = useState<Project | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // Drag scrolling state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vToken = localStorage.getItem('devsync-vercel-token');
    const ghUser = localStorage.getItem('devsync-gh-username');
    setVercelToken(vToken);
    setGithubUser(ghUser);

    fetchShowcaseData(vToken, ghUser);
  }, []);

  const fetchShowcaseData = async (vToken: string | null, ghUser: string | null) => {
    setLoading(true);
    
    // Demo datasets (as requested: "Mode Démo par défaut si aucun token")
    const demoProjects: Project[] = [
      {
        name: 'wasm-compiler-core',
        description: 'Un compilateur expérimental WebAssembly écrit en Rust pour optimiser les calculs matriciels complexes dans le navigateur.',
        stack: 'Rust / WASM',
        liveUrl: 'https://www.rust-lang.org',
        repoUrl: 'https://github.com/demo/wasm-compiler-core',
        previewImage: 'https://image.thum.io/get/width/1280/crop/800/https://www.rust-lang.org',
        updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        deployStatus: 'READY',
        branch: 'main',
        commitMsg: 'refactor: optimiser la boucle d\'exécution JIT',
        commitAuthor: 'Aymane'
      },
      {
        name: 'nextjs-pwa-dashboard',
        description: 'Template de dashboard PWA Next.js hautement optimisé pour iOS et Android avec synchronisation temps réel.',
        stack: 'TypeScript / Next.js',
        liveUrl: 'https://nextjs.org',
        repoUrl: 'https://github.com/demo/nextjs-pwa-dashboard',
        previewImage: 'https://image.thum.io/get/width/1280/crop/800/https://nextjs.org',
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        deployStatus: 'BUILDING',
        branch: 'feat/spotify',
        commitMsg: 'feat: intégrer l\'API de lecture Spotify',
        commitAuthor: 'Collaborateur'
      },
      {
        name: 'vector-db-indexer',
        description: 'Indexeur de documents léger et rapide pour bases de données de vecteurs. Supporte la recherche de similarité cosinus.',
        stack: 'Go / VectorDB',
        liveUrl: '',
        repoUrl: 'https://github.com/demo/vector-db-indexer',
        previewImage: 'linear-gradient(135deg, #8C8A85 0%, #ECEAE3 100%)',
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        deployStatus: 'OFFLINE',
        branch: 'main',
        commitMsg: 'feat: implémenter la recherche de similarité cosinus',
        commitAuthor: 'Collaborateur'
      }
    ];

    if (!vToken && (!ghUser || ghUser === 'Démo')) {
      setProjects(demoProjects);
      setLoading(false);
      return;
    }

    try {
      let ghRepos: any[] = [];
      let vercelProjs: any[] = [];

      // 1. Fetch GitHub Repositories
      if (ghUser && ghUser !== 'Démo') {
        const token = localStorage.getItem('devsync-gh-token') || '';
        const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `token ${token}`;

        const apiUrl = token 
          ? 'https://api.github.com/user/repos?sort=updated&per_page=12'
          : `https://api.github.com/users/${ghUser}/repos?sort=updated&per_page=12`;

        const res = await fetch(apiUrl, { headers });
        if (res.ok) {
          ghRepos = await res.json();
        }
      }

      // 2. Fetch Vercel Projects
      if (vToken) {
        const res = await fetch('https://api.vercel.com/v9/projects', {
          headers: { Authorization: `Bearer ${vToken}` }
        });
        if (res.ok) {
          const vData = await res.json();
          vercelProjs = vData.projects || [];
        }
      }

      // 3. Map both datasets
      const mapped: Project[] = ghRepos.map((repo: any) => {
        // Try to match a Vercel project by name
        const matchedVercel = vercelProjs.find(
          (vp: any) => vp.name.toLowerCase() === repo.name.toLowerCase() || 
                       (vp.link?.repoName && vp.link.repoName.toLowerCase() === repo.name.toLowerCase())
        );

        let liveUrl = repo.homepage || '';
        let deployStatus: Project['deployStatus'] = 'OFFLINE';
        let branch = repo.default_branch || 'main';
        let commitMsg = '';
        let commitAuthor = '';

        if (matchedVercel) {
          if (matchedVercel.targets?.production?.url) {
            liveUrl = `https://${matchedVercel.targets.production.url}`;
          }
          
          const vStatus = matchedVercel.targets?.production?.readyState || '';
          if (vStatus === 'READY') deployStatus = 'READY';
          else if (vStatus === 'BUILDING') deployStatus = 'BUILDING';
          else if (vStatus === 'ERROR') deployStatus = 'ERROR';
          
          // Get metadata if possible
          const lastMeta = matchedVercel.targets?.production?.meta;
          if (lastMeta) {
            commitMsg = lastMeta.githubCommitMessage || '';
            commitAuthor = lastMeta.githubCommitAuthorName || '';
            branch = lastMeta.githubCommitRef || branch;
          }
        }

        // Preview images strategy:
        // Priority 1: Live site og:image (using general query) or Screenshot URL
        // Priority 2: Fallback color gradient
        const previewUrl = liveUrl 
          ? `https://image.thum.io/get/width/1280/crop/800/${liveUrl}`
          : `linear-gradient(135deg, #1B1B1B 0%, #8C8A85 100%)`;

        return {
          name: repo.name,
          description: repo.description || 'Aucune description fournie.',
          stack: repo.language || 'Code',
          liveUrl,
          repoUrl: repo.html_url,
          previewImage: previewUrl,
          updatedAt: repo.updated_at,
          deployStatus,
          branch,
          commitMsg,
          commitAuthor
        };
      });

      // Filter or fallback if empty
      if (mapped.length === 0) {
        setProjects(demoProjects);
      } else {
        setProjects(mapped);
      }
    } catch (e) {
      setProjects(demoProjects);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeploy = async (project: Project) => {
    if (!vercelToken) {
      alert("Veuillez d'abord configurer votre token Vercel dans l'onglet de configuration.");
      return;
    }

    const conf = confirm(`Voulez-vous déclencher manuellement un nouveau déploiement pour "${project.name}" ?`);
    if (!conf) return;

    try {
      // Find the project ID first
      const projRes = await fetch(`https://api.vercel.com/v9/projects/${project.name}`, {
        headers: { Authorization: `Bearer ${vercelToken}` }
      });
      if (!projRes.ok) throw new Error("Impossible de trouver le projet Vercel.");

      const projData = await projRes.json();
      const projId = projData.id;

      // Trigger build
      const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vercelToken}`
        },
        body: JSON.stringify({
          name: project.name,
          projectId: projId,
          gitSource: {
            type: 'github',
            repoId: projData.link?.repoId,
            ref: project.branch || 'main'
          }
        })
      });

      if (deployRes.ok) {
        alert("Déploiement déclenché avec succès !");
        fetchShowcaseData(vercelToken, githubUser);
      } else {
        const err = await deployRes.json();
        throw new Error(err.error?.message || "Erreur lors du déclenchement.");
      }
    } catch (e: any) {
      alert("Échec du déploiement : " + e.message);
    }
  };

  // Keyboard navigation helpers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const el = carouselRef.current!;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      el.scrollBy({ left: 320, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      el.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  // Mouse Drag to Scroll helpers
  const onMouseDown = (e: React.MouseEvent) => {
    const el = carouselRef.current!;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = carouselRef.current!;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeft - walk;
  };

  const onMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const displayList = limit ? projects.slice(0, limit) : projects;

  const renderExplorerModal = () => {
    if (!selectedProjectForPreview) return null;

    return (
      <>
        {/* Backdrop */}
        <div 
          onClick={() => setSelectedProjectForPreview(null)}
          className="fixed inset-0 z-[100] bg-[#161616]/75 backdrop-blur-xs animate-in fade-in duration-250"
        />

        {/* Modal Container */}
        <div className="fixed inset-4 sm:inset-6 md:inset-10 z-[110] bg-[#F4F3F0] border border-[#ECEAE3] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200 text-left">
          
          {/* Close Button */}
          <button 
            type="button"
            onClick={() => setSelectedProjectForPreview(null)}
            className="absolute top-4 right-4 z-40 w-8 h-8 rounded-full bg-white border border-[#ECEAE3] text-[#1B1B1B] hover:bg-[#F7F5EF] flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90"
            aria-label="Fermer l'explorateur"
          >
            ✕
          </button>

          {/* LEFT PANE: Interactive Iframe Browser Mock (65% width) */}
          <div className="flex-1 bg-zinc-950 flex flex-col min-h-[300px] md:min-h-0 relative">
            {selectedProjectForPreview.liveUrl ? (
              <>
                {/* Browser Mock top bar */}
                <div className="bg-[#161616] border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                  {/* Mock browser buttons */}
                  <div className="flex gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>

                  {/* Mock address bar */}
                  <div className="flex-1 max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1 text-[10px] font-mono text-zinc-400 text-center truncate select-all">
                    {selectedProjectForPreview.liveUrl}
                  </div>
                  
                  {/* Open outer link action */}
                  <a 
                    href={selectedProjectForPreview.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9.5px] font-mono text-[#F2C94C] hover:underline font-bold shrink-0 hidden sm:inline"
                  >
                    Ouvrir ↗
                  </a>
                </div>

                {/* Embedded live interactive website iframe */}
                <div className="flex-1 relative">
                  <iframe 
                    src={selectedProjectForPreview.liveUrl}
                    className="absolute inset-0 w-full h-full border-0 bg-white"
                    title={`Aperçu interactif de ${selectedProjectForPreview.name}`}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  
                  {/* Float helper overlay */}
                  <div className="absolute bottom-3 left-3 bg-[#161616]/90 border border-zinc-800 backdrop-blur text-[8.5px] font-mono font-bold text-zinc-300 px-3 py-1.5 rounded-xl pointer-events-none shadow-lg">
                    💡 Mode Interactif : Vous pouvez vous balader et tester le site ci-dessus !
                  </div>
                </div>
              </>
            ) : (
              // Visual mock developer view if no live preview URL is available
              <div className="flex-1 bg-gradient-to-br from-[#161616] to-[#3a3a3a] flex flex-col items-center justify-center p-8 text-center text-white relative">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#F2C94C] flex items-center justify-center text-3xl font-display font-extrabold mb-4 shadow-lg select-none">
                  DS
                </div>
                <h3 className="text-lg font-display font-bold mb-2">{selectedProjectForPreview.name}</h3>
                <p className="text-xs text-zinc-400 max-w-sm mb-6">
                  Aucun lien de démonstration en direct n'est configuré pour ce projet. Renseignez la propriété homepage dans GitHub pour charger l'explorateur interactif.
                </p>

                {/* Mock terminal code visual */}
                <div className="w-full max-w-md bg-black/40 border border-zinc-800/80 rounded-2xl p-4 text-left font-mono text-[9px] text-zinc-400 shadow-md">
                  <div className="flex gap-1.5 mb-2.5 pb-1 border-b border-zinc-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                    <span className="text-[7.5px] text-zinc-500 ml-1">terminal - git-status</span>
                  </div>
                  <p className="text-emerald-400">$ git status</p>
                  <p>On branch main</p>
                  <p>Your branch is up to date with 'origin/main'.</p>
                  <p className="mt-1">Changes not staged for commit:</p>
                  <p className="text-rose-400">  (use "git add &lt;file&gt;..." to update what will be committed)</p>
                  <p className="text-rose-400">  modified:   src/app/page.tsx (ideas queue)</p>
                  <p className="text-yellow-400 mt-2">$ npm run dev --loaded</p>
                  <p>▲ Ready in 12ms - devsync framework loaded successfully</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Details fiche (35% width) */}
          <div className="w-full md:w-[380px] shrink-0 border-t md:border-t-0 md:border-l border-[#ECEAE3] bg-white flex flex-col justify-between h-full text-left">
            
            {/* Scrollable details info */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-[#8C8A85] font-bold">Fiche Projet (Vitrine)</span>
                <h3 className="text-lg font-display font-bold text-[#1B1B1B] mt-1">
                  {selectedProjectForPreview.name}
                </h3>
              </div>

              {/* Properties Grid */}
              <div className="flex flex-col gap-3.5 border border-[#ECEAE3] bg-[#F7F5EF]/45 rounded-2xl p-4.5 text-xs">
                
                {/* Stack */}
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85]">Technologies</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#161616] text-[#F2C94C] font-mono text-[8px] uppercase tracking-wider font-bold">
                    {selectedProjectForPreview.stack}
                  </span>
                </div>

                {/* Status */}
                {selectedProjectForPreview.deployStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85]">Déploiement</span>
                    <span className="font-mono text-[10.5px] text-[#1B1B1B] font-bold uppercase">
                      {selectedProjectForPreview.deployStatus}
                    </span>
                  </div>
                )}

                {/* Branch */}
                {selectedProjectForPreview.branch && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85]">Branche</span>
                    <span className="font-mono text-[10.5px] text-zinc-500">
                      🌿 {selectedProjectForPreview.branch}
                    </span>
                  </div>
                )}

                {/* Commit Author */}
                {selectedProjectForPreview.commitAuthor && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85]">Auteur Git</span>
                    <span className="font-mono text-[10.5px] text-zinc-500">
                      👤 {selectedProjectForPreview.commitAuthor}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85]">Description</span>
                <p className="text-xs text-[#1B1B1B] leading-relaxed">
                  {selectedProjectForPreview.description}
                </p>
              </div>

              {/* Commit Message if any */}
              {selectedProjectForPreview.commitMsg && (
                <div className="flex flex-col gap-2 bg-[#F7F5EF]/30 border border-[#ECEAE3] rounded-2xl p-4">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85]">Dernier Commit</span>
                  <p className="text-[11px] font-mono text-zinc-600 leading-snug">
                    "{selectedProjectForPreview.commitMsg}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer with actions */}
            <div className="p-5 border-t border-[#ECEAE3] bg-[#F7F5EF]/60 flex flex-col gap-3">
              <div className="flex gap-2 w-full">
                {selectedProjectForPreview.liveUrl ? (
                  <a 
                    href={selectedProjectForPreview.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-[#161616] hover:bg-black text-[#F2C94C] hover:text-white font-bold text-[10px] font-mono uppercase rounded-full cursor-pointer transition-all active:scale-95 text-center shadow-md"
                  >
                    Visiter le site ↗
                  </a>
                ) : null}
                <a 
                  href={selectedProjectForPreview.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 bg-white border border-[#ECEAE3] text-[#1B1B1B] hover:bg-[#F7F5EF] font-bold text-[10px] font-mono uppercase rounded-full cursor-pointer transition-all active:scale-95 text-center shadow-sm"
                >
                  Code Source 📦
                </a>
              </div>

              {/* Back button */}
              <button 
                type="button"
                onClick={() => setSelectedProjectForPreview(null)}
                className="w-full py-1 text-[9.5px] font-mono uppercase tracking-wider text-zinc-500 hover:text-black font-bold text-center"
              >
                ← Retour à la vitrine
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8C8A85] gap-3">
        <svg className="w-8 h-8 animate-spin text-[#1B1B1B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="text-xs font-mono tracking-wider uppercase">Chargement de la vitrine...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Control row with refresh */}
      <div className="flex justify-between items-center px-1">
        <span className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
          Projets ({projects.length})
        </span>
        
        <button
          onClick={() => fetchShowcaseData(vercelToken, githubUser)}
          className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85] hover:text-[#1B1B1B] flex items-center gap-1 cursor-pointer"
        >
          <span>Rafraîchir ↻</span>
        </button>
      </div>

      {/* Swipeable Container */}
      <div
        ref={carouselRef}
        onKeyDown={handleKeyDown}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpOrLeave}
        onMouseLeave={onMouseUpOrLeave}
        tabIndex={0}
        aria-label="Carrousel de projets"
        className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none outline-none focus-visible:ring-2 focus-visible:ring-[#F2C94C] rounded-2xl cursor-grab active:cursor-grabbing select-none"
      >
        {displayList.map((project, idx) => {
          const isGradient = project.previewImage.startsWith('linear');
          
          return (
            <div
              key={idx}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a')) return;
                setSelectedProjectForPreview(project);
              }}
              className="w-full md:w-[280px] h-[65vh] md:h-[350px] shrink-0 snap-start snap-align-start relative rounded-3xl overflow-hidden shadow-md group border border-[#ECEAE3] flex flex-col justify-end bg-[#161616] cursor-pointer"
            >
              {/* Background preview */}
              {isGradient ? (
                <div 
                  className="absolute inset-0 z-0 opacity-80" 
                  style={{ background: project.previewImage }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={project.previewImage}
                  alt={`Aperçu de ${project.name}`}
                  className="absolute inset-0 w-full h-full object-cover z-0 opacity-85 group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              )}

              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />

              {/* Deployment badge status in top-right */}
              {project.deployStatus && (
                <div className="absolute top-4.5 right-4.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[8.5px] font-mono font-bold text-white shadow">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    project.deployStatus === 'READY' 
                      ? 'bg-emerald-400' 
                      : project.deployStatus === 'BUILDING'
                      ? 'bg-amber-400 animate-pulse'
                      : project.deployStatus === 'ERROR'
                      ? 'bg-red-500'
                      : 'bg-zinc-500'
                  }`} />
                  <span>
                    {project.deployStatus === 'READY' 
                      ? 'Live' 
                      : project.deployStatus === 'BUILDING'
                      ? 'Build...'
                      : project.deployStatus === 'ERROR'
                      ? 'Échec'
                      : 'Dépôt'}
                  </span>
                </div>
              )}

              {/* Content Panel */}
              <div className="p-5 flex flex-col gap-3 relative z-20">
                <div className="flex flex-col gap-1">
                  <h4 className="text-lg font-display font-bold text-white leading-tight truncate">
                    {project.name}
                  </h4>
                  <p className="text-[11px] text-zinc-300 font-sans line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                    {project.stack}
                  </span>

                  <div className="flex gap-2">
                    {/* Primary action : Live or Repo */}
                    <a
                      href={project.liveUrl || project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-white text-black text-[9px] font-mono uppercase tracking-wider font-bold rounded-full hover:bg-zinc-200 transition-colors shadow-sm"
                    >
                      {project.liveUrl ? 'Visiter ↗' : 'Dépôt'}
                    </a>

                    {/* Secondary action: Always Repo */}
                    {project.liveUrl && (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[9px] font-mono uppercase tracking-wider font-bold rounded-full hover:text-white transition-colors"
                      >
                        Code
                      </a>
                    )}
                  </div>
                </div>

                {/* Build redeploy option for owner (Vercel) */}
                {project.deployStatus && project.deployStatus !== 'OFFLINE' && vercelToken && (
                  <button
                    onClick={() => handleRedeploy(project)}
                    className="w-full mt-1.5 py-1.5 bg-zinc-950/80 border border-zinc-800 text-white text-[8.5px] font-mono uppercase font-bold rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    Redéployer ↺
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {renderExplorerModal()}
    </div>
  );
}
