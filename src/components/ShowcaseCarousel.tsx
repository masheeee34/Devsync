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
        liveUrl: 'https://wasm-compiler-demo.vercel.app',
        repoUrl: 'https://github.com/demo/wasm-compiler-core',
        previewImage: 'linear-gradient(135deg, #161616 0%, #3a3a3a 100%)',
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
        liveUrl: 'https://nextjs-pwa-dashboard.vercel.app',
        repoUrl: 'https://github.com/demo/nextjs-pwa-dashboard',
        previewImage: 'linear-gradient(135deg, #F2C94C 0%, #FBE7A1 100%)',
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

        const res = await fetch(`https://api.github.com/users/${ghUser}/repos?sort=updated&per_page=12`, { headers });
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
          ? `https://image.thum.io/get/auth/21885-devsync/width/600/crop/800/${liveUrl}`
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
              className="w-[280px] h-[350px] shrink-0 snap-start snap-align-start relative rounded-3xl overflow-hidden shadow-md group border border-[#ECEAE3] flex flex-col justify-end bg-[#161616]"
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
    </div>
  );
}
