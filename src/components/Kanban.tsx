'use client';

import { useState, useEffect, useRef } from 'react';
import { Idea, TaskColumn } from '@/types';
import { getStorageAdapter } from '@/lib/storage';
import { useIsMobile } from '@/lib/useIsMobile';
import BottomSheet from '@/components/BottomSheet';
import { getActiveProfile } from '@/lib/auth';

export default function Kanban() {
  const isMobile = useIsMobile();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<TaskColumn>('ideas');
  const [showAddForm, setShowAddForm] = useState(false);
  const [votedIds, setVotedIds] = useState<string[]>([]);

  // Card swipe states
  const [swipeCardId, setSwipeCardId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const isSwiping = useRef(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Idea['category']>('frontend');
  const [author, setAuthor] = useState<Idea['author']>('Aymane');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [isPrivateForm, setIsPrivateForm] = useState(false);
  const [formColumn, setFormColumn] = useState<TaskColumn>('ideas');

  // Notion visual views & actions state
  const [viewMode, setViewMode] = useState<'board' | 'gallery' | 'table'>('board');
  const [selectedIdeaForPeek, setSelectedIdeaForPeek] = useState<Idea | null>(null);
  const [showGitHubImportModal, setShowGitHubImportModal] = useState(false);
  const [ghRepos, setGhRepos] = useState<any[]>([]);
  const [ghUser, setGhUser] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [isLoadingGh, setIsLoadingGh] = useState(false);

  // Subscribe to adapters & FAB event
  useEffect(() => {
    const adapter = getStorageAdapter();
    const unsubscribe = adapter.subscribe((items) => {
      // Process items to detect and clean [PRIVATE] suffix
      const processed = items.map(item => {
        const hasPrivateTag = (item.description || '').endsWith('\n\n[PRIVATE]');
        return {
          ...item,
          isPrivate: hasPrivateTag,
          description: hasPrivateTag 
            ? item.description.slice(0, -12) 
            : item.description
        };
      });

      // Filter out private ideas that belong to other authors
      const activeProfile = getActiveProfile();
      const currentUserName = activeProfile ? activeProfile.name : 'Aymane';

      const filtered = processed.filter(item => {
        if (item.id === 'showcase-projects-data') return false; // Filter out showcase projects record
        if (item.isPrivate) {
          return item.author === currentUserName;
        }
        return true;
      });

      setIdeas(filtered);
    });

    const savedVotes = localStorage.getItem('devsync-voted-ideas');
    if (savedVotes) {
      try {
        setVotedIds(JSON.parse(savedVotes));
      } catch (e) {}
    }

    // Load GitHub settings for import
    const savedUser = localStorage.getItem('devsync-gh-username') || '';
    const savedToken = localStorage.getItem('devsync-gh-token') || '';
    setGhUser(savedUser);
    setGhToken(savedToken);

    // Connect global FAB click event (decoupled action)
    const handleFAB = () => {
      setFormColumn('ideas');
      setShowAddForm(true);
    };
    window.addEventListener('devsync-fab-click', handleFAB);

    return () => {
      unsubscribe();
      window.removeEventListener('devsync-fab-click', handleFAB);
    };
  }, []);

  const saveIdeaHelper = async (idea: Idea) => {
    let desc = idea.description;
    const hasTag = desc.endsWith('\n\n[PRIVATE]');
    if (idea.isPrivate && !hasTag) {
      desc = `${desc}\n\n[PRIVATE]`;
    } else if (!idea.isPrivate && hasTag) {
      desc = desc.slice(0, -12);
    }
    
    const ideaToSave = {
      ...idea,
      description: desc
    };
    
    const adapter = getStorageAdapter();
    await adapter.saveItem(ideaToSave);
  };

  const handleAddIdea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const newIdea: Idea = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      category,
      column: formColumn,
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      votes: 0,
      githubRepoUrl: githubRepoUrl.trim() || undefined,
      projectUrl: projectUrl.trim() || undefined,
      isPrivate: isPrivateForm
    };

    await saveIdeaHelper(newIdea);

    // Reset Form
    setTitle('');
    setDescription('');
    setCategory('frontend');
    setGithubRepoUrl('');
    setProjectUrl('');
    setIsPrivateForm(false);
    setFormColumn('ideas');
    setShowAddForm(false);
  };

  const handleMove = async (id: string, direction: 'left' | 'right') => {
    const columns: TaskColumn[] = ['ideas', 'progress', 'completed'];
    const idea = ideas.find((item) => item.id === id);
    if (!idea) return;

    const currentIndex = columns.indexOf(idea.column);
    let nextIndex = currentIndex;
    if (direction === 'left' && currentIndex > 0) nextIndex--;
    if (direction === 'right' && currentIndex < 2) nextIndex++;

    if (nextIndex !== currentIndex) {
      const updatedIdea: Idea = {
        ...idea,
        column: columns[nextIndex],
        updatedAt: new Date().toISOString(),
      };
      await saveIdeaHelper(updatedIdea);
    }
  };

  const handleDelete = async (id: string) => {
    const conf = confirm("Supprimer cette idée ?");
    if (conf) {
      const adapter = getStorageAdapter();
      await adapter.deleteItem(id);
    }
  };

  const handleVote = async (id: string) => {
    const idea = ideas.find((item) => item.id === id);
    if (!idea) return;

    const isAlreadyVoted = votedIds.includes(id);
    const updatedIdea: Idea = {
      ...idea,
      votes: isAlreadyVoted ? Math.max(0, (idea.votes || 0) - 1) : (idea.votes || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    const nextVoted = isAlreadyVoted
      ? votedIds.filter((vId) => vId !== id)
      : [...votedIds, id];

    setVotedIds(nextVoted);
    localStorage.setItem('devsync-voted-ideas', JSON.stringify(nextVoted));

    // Optional haptic vibration on mobile
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(40);
    }

    await saveIdeaHelper(updatedIdea);
  };

  const fetchGitHubReposForImport = async () => {
    if (!ghUser || ghUser === 'Démo') return;
    setIsLoadingGh(true);
    try {
      const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
      if (ghToken) headers['Authorization'] = `token ${ghToken}`;

      const apiUrl = ghToken 
        ? 'https://api.github.com/user/repos?sort=updated&per_page=15'
        : `https://api.github.com/users/${ghUser.trim()}/repos?sort=updated&per_page=15`;

      const res = await fetch(apiUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        setGhRepos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGh(false);
    }
  };

  const handleOpenGitHubImport = () => {
    if (!ghUser || ghUser === 'Démo') {
      alert("Veuillez connecter votre compte GitHub dans l'onglet 'Sync GitHub' pour utiliser cette fonctionnalité.");
      return;
    }
    setShowGitHubImportModal(true);
    fetchGitHubReposForImport();
  };

  const handleImportRepo = async (repo: any) => {
    let guessedCategory: Idea['category'] = 'backend';
    const lang = (repo.language || '').toLowerCase();
    if (['typescript', 'javascript', 'html', 'css', 'vue'].includes(lang)) {
      guessedCategory = 'frontend';
    } else if (['design', 'figma'].includes(lang)) {
      guessedCategory = 'ui-ux';
    } else if (['devops', 'docker', 'terraform', 'yaml'].includes(lang)) {
      guessedCategory = 'devops';
    }

    const newIdea: Idea = {
      id: Date.now().toString(),
      title: repo.name,
      description: repo.description || 'Importé depuis le dépôt GitHub.',
      category: guessedCategory,
      column: 'ideas',
      author: 'Aymane',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      votes: 0,
      githubRepoUrl: repo.html_url
    };

    await saveIdeaHelper(newIdea);
    setShowGitHubImportModal(false);
  };

  const handleUpdateIdeaFromPeek = async (updated: Idea) => {
    await saveIdeaHelper(updated);
    setSelectedIdeaForPeek(updated);
  };

  const handleCreateReminderFromIdea = (idea: Idea) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('devsync-create-reminder-from-idea', JSON.stringify({
      title: `Travailler sur : ${idea.title}`,
      ideaId: idea.id
    }));
    window.location.href = '/rappels';
  };

  const getColumnIdeas = (col: TaskColumn) => {
    return ideas
      .filter((idea) => idea.column === col)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0));
  };

  const renderGalleryCard = (idea: Idea) => {
    const isVoted = votedIds.includes(idea.id);

    return (
      <div 
        key={idea.id} 
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('a')) return;
          setSelectedIdeaForPeek(idea);
        }}
        className="w-full h-[320px] relative rounded-3xl overflow-hidden shadow-md group border border-[#ECEAE3] flex flex-col justify-between p-4 cursor-pointer bg-zinc-950 transition-all duration-300 hover:shadow-lg"
      >
        {idea.projectUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={`https://image.thum.io/get/width/1280/crop/800/${idea.projectUrl}`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 group-hover:scale-103 transition-transform duration-500"
            loading="lazy"
          />
        )}

        {!idea.projectUrl && (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#161616] to-[#3a3a3a] opacity-90" />
        )}

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none" />

        {/* Card Header (Category & Vote) */}
        <div className="relative z-20 flex justify-between items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-[8px] font-mono uppercase tracking-wider font-semibold text-white">
            {idea.category}
          </span>
          
          <button 
            onClick={() => handleVote(idea.id)}
            className={`flex items-center gap-1 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer h-6 active:scale-95 ${
              isVoted 
                ? 'bg-[#F2C94C] border-[#F2C94C] text-[#161616]' 
                : 'bg-black/45 border-white/10 text-white'
            }`}
          >
            ▲ {idea.votes || 0}
          </button>
        </div>

        {/* Card Bottom Content */}
        <div className="relative z-20 flex flex-col gap-2.5 mt-auto">
          <div>
            <h4 className="text-xs font-display font-bold text-white leading-snug">
              {idea.title}
            </h4>
            <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed line-clamp-2">
              {idea.description}
            </p>
          </div>

          {/* Action buttons (capsules like project vitrine) */}
          <div className="flex gap-2 mt-1">
            {idea.projectUrl && (
              <a 
                href={idea.projectUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-white text-black text-[9px] font-mono font-bold uppercase rounded-full hover:bg-zinc-200 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              >
                Visiter ↗
              </a>
            )}
            {idea.githubRepoUrl && (
              <a 
                href={idea.githubRepoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-[9px] font-mono font-bold uppercase rounded-full hover:bg-zinc-800 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              >
                Code
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTableView = () => {
    return (
      <div className="w-full overflow-x-auto rounded-2xl border border-[#ECEAE3] bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F7F5EF] border-b border-[#ECEAE3] text-[9.5px] font-mono uppercase tracking-wider text-[#8C8A85]">
              <th className="p-4 font-bold">Titre</th>
              <th className="p-4 font-bold">Catégorie</th>
              <th className="p-4 font-bold">Statut</th>
              <th className="p-4 font-bold">Auteur</th>
              <th className="p-4 font-bold">Votes</th>
              <th className="p-4 font-bold">Liens</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEAE3] text-xs">
            {ideas.map((idea) => {
              const isVoted = votedIds.includes(idea.id);
              return (
                <tr 
                  key={idea.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('a')) return;
                    setSelectedIdeaForPeek(idea);
                  }}
                  className="hover:bg-[#F7F5EF]/30 cursor-pointer transition-colors"
                >
                  <td className="p-4 font-display font-bold text-[#1B1B1B]">{idea.title}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full bg-[#F7F5EF] border border-[#ECEAE3] text-[8px] font-mono uppercase tracking-wider font-semibold text-[#8C8A85]">
                      {idea.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[9px] uppercase font-bold text-zinc-500">
                    {idea.column === 'ideas' ? 'Boîte à idées' : idea.column === 'progress' ? 'En cours' : 'Terminé'}
                  </td>
                  <td className="p-4 text-[#8C8A85] font-medium">{idea.author}</td>
                  <td className="p-4">
                    <button 
                      onClick={() => handleVote(idea.id)}
                      className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border ${
                        isVoted ? 'bg-[#F2C94C] border-[#F2C94C] text-[#161616]' : 'bg-[#F7F5EF] border-[#ECEAE3] text-[#8C8A85]'
                      }`}
                    >
                      ▲ {idea.votes || 0}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {idea.projectUrl && (
                        <a href={idea.projectUrl} target="_blank" rel="noreferrer" className="text-[#F2C94C] hover:underline font-mono text-[9px] font-bold">🌐 Site</a>
                      )}
                      {idea.githubRepoUrl && (
                        <a href={idea.githubRepoUrl} target="_blank" rel="noreferrer" className="text-[#8C8A85] hover:text-black hover:underline font-mono text-[9px] font-bold">📦 Code</a>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => handleDelete(idea.id)}
                        className="p-1.5 text-[#8C8A85] hover:text-red-500 hover:bg-[#F7F5EF] rounded-lg transition-all"
                        aria-label="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSidePeek = () => {
    if (!selectedIdeaForPeek) return null;

    return (
      <>
        {/* Immersive backdrop */}
        <div 
          onClick={() => setSelectedIdeaForPeek(null)}
          className="fixed inset-0 z-[100] bg-[#161616]/75 backdrop-blur-xs animate-in fade-in duration-250"
        />

        {/* Immersive Dual-Pane Explorer Modal */}
        <div className="fixed inset-4 sm:inset-6 md:inset-10 z-[110] bg-[#F4F3F0] border border-[#ECEAE3] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Close button in top corner */}
          <button 
            type="button"
            onClick={() => setSelectedIdeaForPeek(null)}
            className="absolute top-4 right-4 z-40 w-8 h-8 rounded-full bg-white border border-[#ECEAE3] text-[#1B1B1B] hover:bg-[#F7F5EF] flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90"
            aria-label="Fermer l'explorateur"
          >
            ✕
          </button>

          {/* LEFT PANE: Interactive Iframe Browser Mock (65% width) */}
          <div className="flex-1 bg-zinc-950 flex flex-col min-h-[300px] md:min-h-0 relative">
            {selectedIdeaForPeek.projectUrl ? (
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
                    {selectedIdeaForPeek.projectUrl}
                  </div>
                  
                  {/* Open outer link action */}
                  <a 
                    href={selectedIdeaForPeek.projectUrl}
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
                    src={selectedIdeaForPeek.projectUrl}
                    className="absolute inset-0 w-full h-full border-0 bg-white"
                    title={`Aperçu interactif de ${selectedIdeaForPeek.title}`}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                  
                  {/* Float helper overlay */}
                  <div className="absolute bottom-3 left-3 bg-[#161616]/90 border border-zinc-800 backdrop-blur text-[8.5px] font-mono font-bold text-zinc-300 px-3 py-1.5 rounded-xl pointer-events-none shadow-lg">
                    💡 Mode Interactif : Vous pouvez vous balader et tester le site ci-dessus !
                  </div>
                </div>
              </>
            ) : (
              // Visual mock developer view if no preview URL is available
              <div className="flex-1 bg-gradient-to-br from-[#161616] to-[#3a3a3a] flex flex-col items-center justify-center p-8 text-center text-white relative">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-[#F2C94C] flex items-center justify-center text-3xl font-display font-extrabold mb-4 shadow-lg select-none">
                  DS
                </div>
                <h3 className="text-lg font-display font-bold mb-2">{selectedIdeaForPeek.title}</h3>
                <p className="text-xs text-zinc-400 max-w-sm mb-6">
                  Aucun lien de démonstration en direct n&apos;est configuré pour cette idée. Renseignez le champ &quot;Site web&quot; à droite pour charger l&apos;explorateur interactif.
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
                  <p>Your branch is up to date with &apos;origin/main&apos;.</p>
                  <p className="mt-1">Changes not staged for commit:</p>
                  <p className="text-rose-400">  (use &quot;git add &lt;file&gt;...&quot; to update what will be committed)</p>
                  <p className="text-rose-400">  modified:   src/app/page.tsx (ideas queue)</p>
                  <p className="text-yellow-400 mt-2">$ npm run dev --loaded</p>
                  <p>▲ Ready in 12ms - devsync framework loaded successfully</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Details fiche & editing (35% width) */}
          <div className="w-full md:w-[380px] shrink-0 border-t md:border-t-0 md:border-l border-[#ECEAE3] bg-white flex flex-col justify-between h-full">
            
            {/* Scrollable meta settings */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5.5">
              <div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-[#8C8A85] font-bold">Fiche Projet</span>
                
                {/* Title */}
                <input 
                  type="text" 
                  value={selectedIdeaForPeek.title}
                  onChange={(e) => {
                    const updated = { ...selectedIdeaForPeek, title: e.target.value };
                    handleUpdateIdeaFromPeek(updated);
                  }}
                  className="w-full text-base font-display font-bold text-[#1B1B1B] border-b border-transparent hover:border-[#ECEAE3] focus:border-[#1B1B1B] py-1.5 focus:outline-none transition-colors mt-1"
                />
              </div>

              {/* Notion-style properties section */}
              <div className="flex flex-col gap-4 border border-[#ECEAE3] bg-[#F7F5EF]/45 rounded-2xl p-4.5 text-xs">
                
                {/* Column Statut */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85] w-24">Statut</span>
                  <select
                    value={selectedIdeaForPeek.column}
                    onChange={(e) => {
                      const updated = { ...selectedIdeaForPeek, column: e.target.value as TaskColumn };
                      handleUpdateIdeaFromPeek(updated);
                    }}
                    className="bg-white border border-[#ECEAE3] rounded-xl px-2.5 py-1 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] cursor-pointer"
                  >
                    <option value="ideas">Boîte à idées</option>
                    <option value="progress">En cours</option>
                    <option value="completed">Terminé</option>
                  </select>
                </div>

                {/* Catégorie */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85] w-24">Catégorie</span>
                  <select
                    value={selectedIdeaForPeek.category}
                    onChange={(e) => {
                      const updated = { ...selectedIdeaForPeek, category: e.target.value as Idea['category'] };
                      handleUpdateIdeaFromPeek(updated);
                    }}
                    className="bg-white border border-[#ECEAE3] rounded-xl px-2.5 py-1 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] cursor-pointer"
                  >
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                    <option value="ui-ux">UI/UX Design</option>
                    <option value="r-d">R&D / Algo</option>
                    <option value="devops">DevOps</option>
                  </select>
                </div>

                {/* Auteur */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85] w-24">Auteur</span>
                  <select
                    value={selectedIdeaForPeek.author}
                    onChange={(e) => {
                      const updated = { ...selectedIdeaForPeek, author: e.target.value as Idea['author'] };
                      handleUpdateIdeaFromPeek(updated);
                    }}
                    className="bg-white border border-[#ECEAE3] rounded-xl px-2.5 py-1 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] cursor-pointer"
                  >
                    <option value="Aymane">Aymane</option>
                    <option value="Collaborateur">Collaborateur</option>
                  </select>
                </div>

                {/* Site web URL */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85] w-24">Site web</span>
                  <input 
                    type="url"
                    placeholder="https://..."
                    value={selectedIdeaForPeek.projectUrl || ''}
                    onChange={(e) => {
                      const updated = { ...selectedIdeaForPeek, projectUrl: e.target.value.trim() || undefined };
                      handleUpdateIdeaFromPeek(updated);
                    }}
                    className="bg-white border border-[#ECEAE3] rounded-xl px-2.5 py-1 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] w-full max-w-[180px] font-mono text-[10.5px]"
                  />
                </div>

                {/* GitHub URL */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85] w-24">GitHub</span>
                  <input 
                    type="url"
                    placeholder="https://github.com/..."
                    value={selectedIdeaForPeek.githubRepoUrl || ''}
                    onChange={(e) => {
                      const updated = { ...selectedIdeaForPeek, githubRepoUrl: e.target.value.trim() || undefined };
                      handleUpdateIdeaFromPeek(updated);
                    }}
                    className="bg-white border border-[#ECEAE3] rounded-xl px-2.5 py-1 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] w-full max-w-[180px] font-mono text-[10.5px]"
                  />
                </div>

                {/* Visibilité Privée */}
                <div className="flex items-center justify-between gap-2 border-t border-[#ECEAE3]/60 pt-3 mt-1">
                  <span className="text-[9.5px] font-mono uppercase font-bold text-[#8C8A85] w-24">Visibilité</span>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={selectedIdeaForPeek.isPrivate || false}
                      onChange={(e) => {
                        const updated = { ...selectedIdeaForPeek, isPrivate: e.target.checked };
                        handleUpdateIdeaFromPeek(updated);
                      }}
                      className="rounded border-[#ECEAE3] text-[#1B1B1B] focus:ring-0 cursor-pointer w-4 h-4"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">
                      {selectedIdeaForPeek.isPrivate ? '🔓 Privé' : '🌐 Public'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85] block mb-1.5 font-bold">Description du projet</label>
                <textarea 
                  rows={4}
                  value={selectedIdeaForPeek.description}
                  onChange={(e) => {
                    const updated = { ...selectedIdeaForPeek, description: e.target.value };
                    handleUpdateIdeaFromPeek(updated);
                  }}
                  className="w-full bg-[#F7F5EF]/20 border border-[#ECEAE3] rounded-2xl p-3.5 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Fiche Footer (actions) */}
            <div className="p-5 border-t border-[#ECEAE3] bg-[#F7F5EF]/60 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 w-full">
                <button
                  type="button"
                  onClick={() => handleCreateReminderFromIdea(selectedIdeaForPeek)}
                  className="flex-1 py-2 bg-[#161616] hover:bg-black text-[#F2C94C] hover:text-white font-bold text-[10px] font-mono uppercase rounded-full cursor-pointer transition-all active:scale-95 text-center shadow-md"
                >
                  ⏰ Lier un Rappel
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    handleDelete(selectedIdeaForPeek.id);
                    setSelectedIdeaForPeek(null);
                  }}
                  className="py-2 px-4.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold text-[10px] font-mono uppercase rounded-full cursor-pointer transition-all active:scale-95 text-center"
                >
                  Supprimer
                </button>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 pt-1">
                <span>Création : {new Date(selectedIdeaForPeek.createdAt).toLocaleDateString()}</span>
                <button
                  type="button"
                  onClick={() => setSelectedIdeaForPeek(null)}
                  className="font-bold uppercase tracking-wider hover:text-black transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderGitHubImportModal = () => {
    if (!showGitHubImportModal) return null;

    return (
      <>
        {/* Backdrop */}
        <div 
          onClick={() => setShowGitHubImportModal(false)}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs animate-in fade-in duration-200"
        />

        {/* Modal content */}
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div className="bg-white border border-[#ECEAE3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowGitHubImportModal(false)}
              className="absolute top-4.5 right-4.5 text-[#8C8A85] p-1 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-xs font-bold text-[#1B1B1B] uppercase tracking-wider font-mono mb-2">Importer depuis GitHub</h3>
            <p className="text-[11px] text-[#8C8A85] mb-4">Sélectionnez un de vos dépôts récents pour le transformer instantanément en idée.</p>
            
            {isLoadingGh ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-black animate-spin" />
                <span className="text-[10px] font-mono text-[#8C8A85]">Chargement de vos dépôts...</span>
              </div>
            ) : ghRepos.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8C8A85]">
                Aucun dépôt trouvé sur votre compte GitHub.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {ghRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleImportRepo(repo)}
                    className="w-full text-left p-3 rounded-xl border border-[#ECEAE3] hover:border-black bg-[#F7F5EF]/20 hover:bg-white transition-all flex flex-col gap-1 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#1B1B1B] font-mono">{repo.name}</span>
                    {repo.description && (
                      <span className="text-[10px] text-[#8C8A85] line-clamp-1">{repo.description}</span>
                    )}
                    <span className="text-[8px] font-mono text-zinc-400 mt-1 uppercase font-bold">{repo.language || 'Autre'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  // Card Touch Swipe Gestures (tactile actions)
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipeCardId(id);
    isSwiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX.current;
    
    // Clamp swipe offset between -140px and 140px for safety
    const clampedOffset = Math.max(-140, Math.min(140, deltaX));
    setSwipeOffset(clampedOffset);
  };

  const handleTouchEnd = (id: string) => {
    isSwiping.current = false;
    
    // Trigger Right Swipe: Vote (threshold 80px)
    if (swipeOffset > 80) {
      handleVote(id);
    } 
    // Trigger Left Swipe: Delete (threshold -80px)
    else if (swipeOffset < -80) {
      handleDelete(id);
    }

    setSwipeOffset(0);
    setSwipeCardId(null);
  };

  const renderCard = (idea: Idea) => {
    const isVoted = votedIds.includes(idea.id);
    const isBeingSwiped = swipeCardId === idea.id;
    const offset = isBeingSwiped ? swipeOffset : 0;

    return (
      <div key={idea.id} className="relative overflow-hidden rounded-3xl">
        
        {/* Underlay Behind Card (Visible during swipe actions) */}
        {isBeingSwiped && Math.abs(offset) > 10 && (
          <div className="absolute inset-0 z-0 flex items-center justify-between rounded-3xl overflow-hidden px-5">
            {offset > 0 ? (
              // Swipe Right -> Upvote background reveal (Yellow)
              <div className="absolute inset-0 bg-[#FBE7A1] flex items-center justify-start pl-6 text-[#1B1B1B] font-mono text-[9px] font-bold uppercase tracking-wider">
                ▲ Upvoter
              </div>
            ) : (
              // Swipe Left -> Delete background reveal (Red)
              <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 text-white font-mono text-[9px] font-bold uppercase tracking-wider">
                🗑 Supprimer
              </div>
            )}
          </div>
        )}

        {/* Card Body */}
        <div 
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('a')) return;
            setSelectedIdeaForPeek(idea);
          }}
          onTouchStart={(e) => handleTouchStart(e, idea.id)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => handleTouchEnd(idea.id)}
          style={{ 
            transform: `translateX(${offset}px)`,
            transition: isSwiping.current && isBeingSwiped ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
          }}
          className="bg-white border border-[#ECEAE3] rounded-3xl p-4.5 flex flex-col gap-3.5 relative z-10 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          {/* Card Header */}
          <div className="flex justify-between items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#F7F5EF] border border-[#ECEAE3] text-[8px] font-mono uppercase tracking-wider font-semibold text-[#8C8A85]">
              {idea.category}
            </span>
            <button 
              onClick={() => handleVote(idea.id)}
              className={`flex items-center gap-1.5 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer h-7 active:scale-95 ${
                isVoted 
                  ? 'bg-[#F2C94C] border-[#F2C94C] text-[#161616]' 
                  : 'bg-[#F7F5EF] border-[#ECEAE3] text-[#8C8A85]'
              }`}
              aria-label="Voter pour cette idée"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="m18 15-6-6-6 6"/>
              </svg>
              <span>{idea.votes || 0}</span>
            </button>
          </div>

          {/* Project Preview Screenshot */}
          {idea.projectUrl && (
            <div className="w-full h-36 rounded-2xl overflow-hidden relative border border-[#ECEAE3] mt-0.5 select-none pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={`https://image.thum.io/get/width/1280/crop/800/${idea.projectUrl}`}
                alt={idea.title}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
          )}

          {/* Title & Desc */}
          <div>
            <h4 className="text-xs font-display font-bold text-[#1B1B1B] leading-snug">
              {idea.title}
            </h4>
            <p className="text-[11px] text-[#8C8A85] mt-1.5 leading-relaxed">
              {idea.description}
            </p>
            
            {/* Project & Repository Links */}
            {(idea.projectUrl || idea.githubRepoUrl) && (
              <div className="flex gap-3.5 mt-2.5 pt-2.5 border-t border-[#ECEAE3]/50 flex-wrap">
                {idea.projectUrl && (
                  <a 
                    href={idea.projectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9.5px] font-mono text-[#F2C94C] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    🌐 Visiter
                  </a>
                )}
                {idea.githubRepoUrl && (
                  <a 
                    href={idea.githubRepoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9.5px] font-mono text-[#8C8A85] hover:text-[#1B1B1B] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    📦 GitHub
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Footer controls */}
          <div className="flex justify-between items-center mt-1 pt-3 border-t border-[#ECEAE3] text-[9.5px] font-mono">
            <span className="flex items-center gap-1.5 text-[#8C8A85] font-semibold">
              <div className="w-5 h-5 rounded-full bg-[#161616] text-[#F2C94C] flex items-center justify-center text-[9px] font-bold font-mono shadow-sm">
                {idea.author.charAt(0)}
              </div>
              {idea.author}
            </span>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handleMove(idea.id, 'left')}
                disabled={idea.column === 'ideas'}
                className="w-7 h-7 flex items-center justify-center rounded bg-[#F7F5EF] border border-[#ECEAE3] text-[#8C8A85] disabled:opacity-20 transition-colors cursor-pointer"
                aria-label="Déplacer vers la colonne de gauche"
              >
                ◀
              </button>
              <button 
                onClick={() => handleMove(idea.id, 'right')}
                disabled={idea.column === 'completed'}
                className="w-7 h-7 flex items-center justify-center rounded bg-[#F7F5EF] border border-[#ECEAE3] text-[#8C8A85] disabled:opacity-20 transition-colors cursor-pointer"
                aria-label="Déplacer vers la colonne de droite"
              >
                ▶
              </button>
              <button 
                onClick={() => handleDelete(idea.id)}
                className="w-7 h-7 flex items-center justify-center text-[#8C8A85] hover:text-red-500 rounded bg-[#F7F5EF] border border-[#ECEAE3] transition-all cursor-pointer"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const COLUMNS: { id: TaskColumn; label: string }[] = [
    { id: 'ideas', label: 'Boîte à idées' },
    { id: 'progress', label: 'En cours' },
    { id: 'completed', label: 'Terminé' },
  ];

  // Forms block structure
  const renderFormFields = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="form-title" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Titre</label>
        <input
          id="form-title"
          type="text"
          placeholder="Ex: API Gateway en Rust"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2.5 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="form-category" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Catégorie</label>
          <select
            id="form-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Idea['category'])}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2.5 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B]"
          >
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="ui-ux">UI/UX Design</option>
            <option value="r-d">R&D / Algo</option>
            <option value="devops">DevOps</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="form-author" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Auteur</label>
          <select
            id="form-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value as Idea['author'])}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2.5 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B]"
          >
            <option value="Aymane">Aymane</option>
            <option value="Collaborateur">Collaborateur</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="form-gh-url" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Dépôt GitHub (Optionnel)</label>
          <input
            id="form-gh-url"
            type="url"
            placeholder="https://github.com/..."
            value={githubRepoUrl}
            onChange={(e) => setGithubRepoUrl(e.target.value)}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2.5 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="form-project-url" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Lien Aperçu Site (Optionnel)</label>
          <input
            id="form-project-url"
            type="url"
            placeholder="https://mon-projet.vercel.app"
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2.5 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="form-column" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Colonne de destination</label>
        <select
          id="form-column"
          value={formColumn}
          onChange={(e) => setFormColumn(e.target.value as TaskColumn)}
          className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2.5 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B]"
        >
          <option value="ideas">Boîte à idées</option>
          <option value="progress">En cours</option>
          <option value="completed">Terminé</option>
        </select>
      </div>

      <div className="flex items-center gap-2 py-1 select-none">
        <input 
          id="form-private"
          type="checkbox"
          checked={isPrivateForm}
          onChange={(e) => setIsPrivateForm(e.target.checked)}
          className="rounded border-[#ECEAE3] text-[#1B1B1B] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
        />
        <label htmlFor="form-private" className="text-[10px] font-mono uppercase tracking-wider text-[#8C8A85] cursor-pointer font-bold">Rendre cette idée privée</label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="form-desc" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Description</label>
        <textarea
          id="form-desc"
          placeholder="Décrivez brièvement le projet..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] resize-none"
          required
        />
      </div>

      <button
        type="button"
        onClick={() => handleAddIdea()}
        className="w-full mt-2 py-3 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all cursor-pointer"
      >
        Créer l&apos;idée
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title block & Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#ECEAE3]">
        <div>
          <h2 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase font-mono">Boîte à Idées</h2>
          <p className="text-[11px] text-[#8C8A85] mt-0.5 font-medium">Partagez, votez et organisez vos futurs projets.</p>
        </div>

        {/* Header Actions (Desktop and Responsive) */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Notion View Mode Selection Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-[#F7F5EF] border border-[#ECEAE3] rounded-2xl select-none">
            <button 
              type="button"
              onClick={() => setViewMode('board')} 
              className={`px-3 py-1.5 rounded-xl text-[9px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'board' ? 'bg-[#161616] text-white shadow-sm' : 'text-[#8C8A85] hover:text-[#1B1B1B]'
              }`}
            >
              📋 Tableau
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('gallery')} 
              className={`px-3 py-1.5 rounded-xl text-[9px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'gallery' ? 'bg-[#161616] text-white shadow-sm' : 'text-[#8C8A85] hover:text-[#1B1B1B]'
              }`}
            >
              🖼️ Galerie
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('table')} 
              className={`px-3 py-1.5 rounded-xl text-[9px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table' ? 'bg-[#161616] text-white shadow-sm' : 'text-[#8C8A85] hover:text-[#1B1B1B]'
              }`}
            >
              📑 Liste
            </button>
          </div>

          {/* GitHub Import (discreet action) */}
          {ghUser && ghUser !== 'Démo' && (
            <button
              type="button"
              onClick={handleOpenGitHubImport}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F7F5EF] hover:bg-[#ECEAE3] border border-[#ECEAE3] text-[#1B1B1B] font-bold text-xs rounded-full active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <span>+ GitHub</span>
            </button>
          )}

          {/* New Idea button */}
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4.5 py-2 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#F2C94C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            <span>Nouvelle Idée</span>
          </button>
        </div>
      </div>

      {/* Creation form handling (Mobile Bottom Sheet vs Desktop Modal) */}
      {showAddForm && (
        isMobile ? (
          <BottomSheet 
            isOpen={showAddForm} 
            onClose={() => setShowAddForm(false)} 
            title="Proposer une nouvelle idée"
          >
            {renderFormFields()}
          </BottomSheet>
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-150">
            <div className="bg-white border border-[#ECEAE3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="absolute top-4.5 right-4.5 text-[#8C8A85] p-1 cursor-pointer"
                aria-label="Fermer"
              >
                ✕
              </button>
              <h3 className="text-xs font-bold text-[#1B1B1B] uppercase tracking-wider font-mono mb-4">Proposer une nouvelle idée</h3>
              <form onSubmit={handleAddIdea}>
                {renderFormFields()}
              </form>
            </div>
          </div>
        )
      )}

      {/* Segmented controls for mobile tabs - only in board view */}
      {viewMode === 'board' && (
        <div className="flex border border-[#ECEAE3] md:hidden bg-[#F7F5EF] p-1 rounded-full">
          {COLUMNS.map((col) => {
            const count = getColumnIdeas(col.id).length;
            const isActive = activeMobileTab === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveMobileTab(col.id)}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#161616] text-white shadow-sm font-bold' 
                    : 'text-[#8C8A85] hover:text-[#1B1B1B]'
                }`}
              >
                {col.label.split(' ')[0]} <span className={`ml-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${count > 0 ? 'bg-[#F2C94C] text-[#161616]' : 'bg-[#ECEAE3] text-[#8C8A85]'}`}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Render selected view mode */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col) => {
            const colIdeas = getColumnIdeas(col.id);
            const isMobileVisible = activeMobileTab === col.id;
            
            return (
              <div 
                key={col.id} 
                className={`flex flex-col gap-4.5 ${isMobileVisible ? 'flex' : 'hidden md:flex'}`}
              >
                {/* Column Header */}
                <div className="flex justify-between items-center pb-2 border-b border-[#ECEAE3] font-mono">
                  <h3 className="text-[10px] font-bold text-[#1B1B1B] uppercase tracking-widest flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      col.id === 'ideas' ? 'bg-[#8C8A85]' : col.id === 'progress' ? 'bg-[#F2C94C]' : 'bg-zinc-700'
                    }`}></span>
                    {col.label}
                  </h3>
                  <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold shadow-sm ${
                    colIdeas.length > 0 ? 'bg-[#F2C94C] text-[#161616]' : 'bg-[#F7F5EF] border border-[#ECEAE3] text-[#8C8A85]'
                  }`}>
                    {colIdeas.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className="flex flex-col gap-4.5 min-h-[400px] justify-between">
                  <div className="flex flex-col gap-4.5">
                    {colIdeas.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed border-[#ECEAE3] text-center bg-white/30">
                        <svg className="w-6 h-6 text-[#8C8A85] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Aucun ticket</p>
                      </div>
                    ) : (
                      colIdeas.map((idea) => renderCard(idea))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setFormColumn(col.id);
                      setShowAddForm(true);
                    }}
                    className="w-full py-2.5 mt-2.5 rounded-2xl border border-dashed border-[#ECEAE3] hover:border-[#1B1B1B] text-[#8C8A85] hover:text-[#1B1B1B] font-mono text-[9px] uppercase tracking-wider font-bold bg-[#F7F5EF]/30 hover:bg-white transition-all cursor-pointer text-center"
                  >
                    + Nouveau
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'gallery' && (
        ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 rounded-3xl border border-dashed border-[#ECEAE3] text-center bg-white/30">
            <p className="text-xs font-mono uppercase tracking-wider text-[#8C8A85]">Aucune idée de projet publiée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map((idea) => renderGalleryCard(idea))}
          </div>
        )
      )}

      {viewMode === 'table' && (
        ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 rounded-3xl border border-dashed border-[#ECEAE3] text-center bg-white/30">
            <p className="text-xs font-mono uppercase tracking-wider text-[#8C8A85]">Aucune idée de projet publiée</p>
          </div>
        ) : (
          renderTableView()
        )
      )}

      {/* Notion Side Peek Panel Drawer */}
      {renderSidePeek()}

      {/* GitHub Repository Import Modal */}
      {renderGitHubImportModal()}

    </div>
  );
}
