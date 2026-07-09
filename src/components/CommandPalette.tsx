'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Idea, Reminder } from '@/types';
import { logOut, getDbMode } from '@/lib/auth';

interface SearchResult {
  id: string;
  title: string;
  category: 'Navigation' | 'Idée' | 'Tâche' | 'Action' | 'Dépôt';
  url?: string;
  action?: () => void;
  meta?: string;
}

export default function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Monitor Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch search data from local storage when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      try {
        const storedIdeas = JSON.parse(localStorage.getItem('devsync-ideas') || '[]');
        const storedReminders = JSON.parse(localStorage.getItem('devsync-reminders') || '[]');
        setIdeas(storedIdeas);
        setReminders(storedReminders);
      } catch (e) {}
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation inside list
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        triggerResult(filteredResults[selectedIndex]);
      }
    }
  };

  const triggerResult = (res: SearchResult) => {
    setIsOpen(false);
    if (res.url) {
      router.push(res.url);
    } else if (res.action) {
      res.action();
    }
  };

  const staticNavigation: SearchResult[] = [
    { id: 'nav-home', title: "Aller à l'Accueil", category: 'Navigation', url: '/' },
    { id: 'nav-idees', title: "Aller à la Boîte à Idées", category: 'Navigation', url: '/idees' },
    { id: 'nav-github', title: "Aller à la Synchronisation GitHub", category: 'Navigation', url: '/github' },
    { id: 'nav-reminders', title: "Aller aux Rappels", category: 'Navigation', url: '/rappels' },
    { id: 'nav-toolbox', title: "Aller à la Boîte à Outils", category: 'Navigation', url: '/boite-a-outils' },
    { id: 'nav-projects', title: "Aller à la Vitrine de Projets", category: 'Navigation', url: '/projets' },
    { id: 'nav-config', title: "Aller aux Paramètres DB", category: 'Navigation', url: '/config' },
    { id: 'nav-account', title: "Aller à Mon Compte / Profil", category: 'Navigation', url: '/account' },
  ];

  const staticActions: SearchResult[] = [
    { 
      id: 'act-new-idea', 
      title: "Proposer une nouvelle idée...", 
      category: 'Action', 
      url: '/idees?action=new' 
    },
    { 
      id: 'act-new-reminder', 
      title: "Planifier un rappel de projet...", 
      category: 'Action', 
      url: '/rappels?action=new' 
    },
    {
      id: 'act-logout',
      title: "Se déconnecter",
      category: 'Action',
      action: () => {
        logOut();
        router.push('/login');
        router.refresh();
      }
    }
  ];

  // Dynamic filter results
  const getResults = (): SearchResult[] => {
    const term = query.toLowerCase().trim();
    
    // Default listings
    if (!term) {
      return [...staticNavigation, ...staticActions];
    }

    const matchedNavs = staticNavigation.filter(n => n.title.toLowerCase().includes(term));
    const matchedActions = staticActions.filter(a => a.title.toLowerCase().includes(term));
    
    const matchedIdeas: SearchResult[] = ideas
      .filter(i => i.title.toLowerCase().includes(term) || i.description.toLowerCase().includes(term))
      .map(i => ({
        id: `idea-${i.id}`,
        title: i.title,
        category: 'Idée',
        url: '/idees',
        meta: `Catégorie: ${i.category} • Par ${i.author}`
      }));

    const matchedReminders: SearchResult[] = reminders
      .filter(r => r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term))
      .map(r => ({
        id: `rem-${r.id}`,
        title: r.title,
        category: 'Tâche',
        url: '/rappels',
        meta: `Priorité: ${r.priority} • Échéance: ${new Date(r.dueDate).toLocaleDateString()}`
      }));

    return [...matchedNavs, ...matchedActions, ...matchedIdeas, ...matchedReminders];
  };

  const filteredResults = getResults();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] bg-black/45 animate-in fade-in duration-100">
      <div 
        ref={containerRef}
        className="w-full max-w-xl bg-white border border-[#ECEAE3] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[50vh] animate-in slide-in-from-top-4 duration-150"
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#ECEAE3] bg-[#F7F5EF]">
          <svg className="w-4 h-4 text-[#8C8A85] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher des idées, tâches, navigation (⌘K)..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleListKeyDown}
            className="flex-1 bg-transparent text-xs text-[#1B1B1B] focus:outline-none placeholder-zinc-400 font-sans"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-mono border border-[#ECEAE3] bg-white px-2 py-0.5 rounded text-[#8C8A85] shadow-sm select-none font-bold uppercase">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 bg-white">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-[#8C8A85] font-mono text-[10px] uppercase tracking-wider">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredResults.map((res, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={res.id}
                    onClick={() => triggerResult(res)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-[#F2C94C]/15 border border-transparent' 
                        : 'border border-transparent hover:bg-[#F7F5EF]/60'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold text-[#1B1B1B] truncate font-sans">
                        {res.title}
                      </span>
                      {res.meta && (
                        <span className="text-[9px] font-mono text-[#8C8A85]">
                          {res.meta}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        res.category === 'Navigation'
                          ? 'bg-[#F7F5EF] border-[#ECEAE3] text-[#8C8A85]'
                          : res.category === 'Action'
                          ? 'bg-[#161616] border-black text-white'
                          : 'bg-[#FBE7A1] border-transparent text-[#1B1B1B]'
                      }`}>
                        {res.category}
                      </span>
                      
                      {isSelected && (
                        <span className="text-[9.5px] font-mono text-[#8C8A85] hidden sm:inline">
                          ↵ Entrée
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 border-t border-[#ECEAE3] bg-[#F7F5EF] flex justify-between items-center text-[9px] font-mono text-[#8C8A85]">
          <div className="flex gap-4">
            <span>↑↓ Naviguer</span>
            <span>↵ Sélectionner</span>
          </div>
          <div>
            <span>Raccourci global : ⌘K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
