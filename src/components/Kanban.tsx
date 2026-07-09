'use client';

import { useState, useEffect } from 'react';
import { Idea, TaskColumn } from '@/types';
import { getStorageAdapter } from '@/lib/storage';

export default function Kanban() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeMobileTab, setActiveMobileTab] = useState<TaskColumn>('ideas');
  const [showAddModal, setShowAddModal] = useState(false);
  const [votedIds, setVotedIds] = useState<string[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Idea['category']>('frontend');
  const [author, setAuthor] = useState<Idea['author']>('Aymane');

  // Subscribe to storage adapter
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

    return () => unsubscribe();
  }, []);

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const newIdea: Idea = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      category,
      column: 'ideas',
      author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      votes: 0,
    };

    const adapter = getStorageAdapter();
    await adapter.saveItem(newIdea);

    // Reset Form
    setTitle('');
    setDescription('');
    setCategory('frontend');
    setShowAddModal(false);
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
    if (confirm("Supprimer cette idée ?")) {
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

    const adapter = getStorageAdapter();
    await adapter.saveItem(updatedIdea);
  };

  const getColumnIdeas = (col: TaskColumn) => {
    return ideas
      .filter((idea) => idea.column === col)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0));
  };

  const renderCard = (idea: Idea) => {
    const isVoted = votedIds.includes(idea.id);
    return (
      <div 
        key={idea.id} 
        className="bg-white border border-[#ECEAE3] rounded-3xl p-4.5 flex flex-col gap-3.5 hover:shadow-md transition-all duration-200"
      >
        {/* Card Header (Category & Votes) */}
        <div className="flex justify-between items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#F7F5EF] border border-[#ECEAE3] text-[8px] font-mono uppercase tracking-wider font-semibold text-[#8C8A85]">
            {idea.category}
          </span>
          <button 
            onClick={() => handleVote(idea.id)}
            className={`flex items-center gap-1.5 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
              isVoted 
                ? 'bg-[#F2C94C] border-[#F2C94C] text-[#161616]' 
                : 'bg-[#F7F5EF] border-[#ECEAE3] text-[#8C8A85] hover:text-[#1B1B1B]'
            }`}
            aria-label="Voter pour cette idée"
          >
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 15-6-6-6 6"/>
            </svg>
            <span>{idea.votes || 0}</span>
          </button>
        </div>

        {/* Title & Desc */}
        <div>
          <h4 className="text-xs font-display font-bold text-[#1B1B1B] leading-snug">
            {idea.title}
          </h4>
          <p className="text-[11px] text-[#8C8A85] mt-1.5 leading-relaxed">
            {idea.description}
          </p>
        </div>

        {/* Footer (Author & Controls) */}
        <div className="flex justify-between items-center mt-1 pt-3 border-t border-[#ECEAE3] text-[9.5px] font-mono">
          <span className="flex items-center gap-1.5 text-[#8C8A85] font-semibold">
            <div className="w-5 h-5 rounded-full bg-[#161616] text-[#F2C94C] flex items-center justify-center text-[9px] font-bold font-mono shadow-sm">
              {idea.author.charAt(0)}
            </div>
            {idea.author}
          </span>
          
          {/* Card actions */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleMove(idea.id, 'left')}
              disabled={idea.column === 'ideas'}
              className="p-1 rounded bg-[#F7F5EF] border border-[#ECEAE3] text-[#8C8A85] hover:text-[#1B1B1B] disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
              aria-label="Déplacer vers la colonne de gauche"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <button 
              onClick={() => handleMove(idea.id, 'right')}
              disabled={idea.column === 'completed'}
              className="p-1 rounded bg-[#F7F5EF] border border-[#ECEAE3] text-[#8C8A85] hover:text-[#1B1B1B] disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
              aria-label="Déplacer vers la colonne de droite"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            <button 
              onClick={() => handleDelete(idea.id)}
              className="p-1 text-[#8C8A85] hover:text-red-500 rounded hover:bg-red-50 transition-all cursor-pointer"
              aria-label="Supprimer l'idée"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
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

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title block */}
      <div className="flex justify-between items-center pb-3 border-b border-[#ECEAE3]">
        <div>
          <h2 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase font-mono">Boîte à Idées</h2>
          <p className="text-[11px] text-[#8C8A85] mt-0.5 font-medium">Partagez, votez et organisez vos futurs projets.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4.5 py-2 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all shadow-md cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-[#F2C94C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>Nouvelle Idée</span>
        </button>
      </div>

      {/* Modal - solid Soft-UI panel */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-150">
          <div className="bg-white border border-[#ECEAE3] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4.5 right-4.5 text-[#8C8A85] hover:text-[#1B1B1B] p-1 cursor-pointer"
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            <h3 className="text-xs font-bold text-[#1B1B1B] uppercase tracking-wider font-mono mb-4">Proposer une nouvelle idée</h3>
            
            <form onSubmit={handleAddIdea} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-title" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Titre</label>
                <input
                  id="modal-title"
                  type="text"
                  placeholder="Ex: API Gateway en Rust"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-category" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Catégorie</label>
                  <select
                    id="modal-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Idea['category'])}
                    className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                    <option value="ui-ux">UI/UX Design</option>
                    <option value="r-d">R&D / Algo</option>
                    <option value="devops">DevOps</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="modal-author" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Auteur</label>
                  <select
                    id="modal-author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value as Idea['author'])}
                    className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#1B1B1B] focus:outline-none focus:border-[#1B1B1B] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="Aymane">Aymane</option>
                    <option value="Collaborateur">Collaborateur</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="modal-desc" className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Description</label>
                <textarea
                  id="modal-desc"
                  placeholder="Décrivez brièvement le projet..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-xl px-3.5 py-2 text-xs text-[#1B1B1B] placeholder-zinc-400 focus:outline-none focus:border-[#1B1B1B] transition-colors resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-[#161616] hover:bg-black text-white font-bold text-xs rounded-full active:scale-95 transition-all cursor-pointer"
              >
                Créer l&apos;idée
              </button>
            </form>
          </div>
        </div>
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
              <div className="flex flex-col gap-4.5 min-h-[400px]">
                {colIdeas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed border-[#ECEAE3] text-center flex-1 bg-white/30">
                    <svg className="w-6 h-6 text-[#8C8A85] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85]">Aucun ticket</p>
                  </div>
                ) : (
                  colIdeas.map((idea) => renderCard(idea))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
