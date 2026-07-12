'use client';

import { useState, useEffect, useRef } from 'react';
import { Idea, TaskColumn } from '@/types';
import { getStorageAdapter } from '@/lib/storage';
import { useIsMobile } from '@/lib/useIsMobile';
import BottomSheet from '@/components/BottomSheet';

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
  const [formColumn, setFormColumn] = useState<TaskColumn>('ideas');

  // Subscribe to adapters & FAB event
  useEffect(() => {
    const adapter = getStorageAdapter();
    const unsubscribe = adapter.subscribe((items) => {
      setIdeas(items);
    });

    const savedVotes = localStorage.getItem('devsync-voted-ideas');
    if (savedVotes) {
      try {
        setVotedIds(JSON.parse(savedVotes));
      } catch (e) {}
    }

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
    };

    const adapter = getStorageAdapter();
    await adapter.saveItem(newIdea);

    // Reset Form
    setTitle('');
    setDescription('');
    setCategory('frontend');
    setGithubRepoUrl('');
    setProjectUrl('');
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
      const adapter = getStorageAdapter();
      await adapter.saveItem(updatedIdea);
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

    const adapter = getStorageAdapter();
    await adapter.saveItem(updatedIdea);
  };

  const getColumnIdeas = (col: TaskColumn) => {
    return ideas
      .filter((idea) => idea.column === col)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0));
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
          onTouchStart={(e) => handleTouchStart(e, idea.id)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => handleTouchEnd(idea.id)}
          style={{ 
            transform: `translateX(${offset}px)`,
            transition: isSwiping.current && isBeingSwiped ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
          }}
          className="bg-white border border-[#ECEAE3] rounded-3xl p-4.5 flex flex-col gap-3.5 relative z-10 hover:shadow-md transition-all duration-200"
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
            <div className="w-full h-24 rounded-2xl overflow-hidden relative border border-[#ECEAE3] mt-0.5 select-none pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={`https://image.thum.io/get/width/600/crop/800/${idea.projectUrl}`}
                alt={idea.title}
                className="w-full h-full object-cover"
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
      
      {/* Title block */}
      <div className="flex justify-between items-center pb-3 border-b border-[#ECEAE3]">
        <div>
          <h2 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase font-mono">Boîte à Idées</h2>
          <p className="text-[11px] text-[#8C8A85] mt-0.5 font-medium">Partagez, votez et organisez vos futurs projets.</p>
        </div>
        
        {/* Desktop-only New Idea button (FAB covers mobile) */}
        <button
          onClick={() => setShowAddForm(true)}
          className="hidden md:flex items-center gap-1.5 px-4.5 py-2 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all shadow-md cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-[#F2C94C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>Nouvelle Idée</span>
        </button>
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

      {/* Segmented controls for mobile tabs */}
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

      {/* Kanban Grid */}
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
    </div>
  );
}
