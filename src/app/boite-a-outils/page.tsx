'use client';

import { useState, useEffect } from 'react';
import { getDbMode } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

export interface ToolboxItem {
  id: string;
  type: 'snippet' | 'bookmark';
  title: string;
  content: string; // Code code or Bookmark URL
  tags: string[];
  language?: string;
  author: string;
  createdAt: string;
  isPinned?: boolean;
}

// Initial Mock items to look premium on first load
const INITIAL_ITEMS: ToolboxItem[] = [
  {
    id: 'tool-1',
    type: 'snippet',
    title: 'Middleware de redirection Next.js',
    content: `export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}`,
    tags: ['Next.js', 'Auth'],
    language: 'typescript',
    author: 'Aymane',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    isPinned: true
  },
  {
    id: 'tool-2',
    type: 'bookmark',
    title: 'Documentation GSAP ScrollTrigger API',
    content: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/',
    tags: ['GSAP', 'Docs'],
    author: 'Collaborateur',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isPinned: false
  }
];

export default function ToolboxPage() {
  const [items, setItems] = useState<ToolboxItem[]>([]);
  const [activeUser, setActiveUser] = useState('Aymane');
  const [dbMode, setDbMode] = useState<'local' | 'supabase'>('local');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<'snippet' | 'bookmark'>('snippet');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [language, setLanguage] = useState('typescript');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mode = getDbMode();
    setDbMode(mode);
    const user = sessionStorage.getItem('devsync-active-user') || 'Aymane';
    setActiveUser(user);

    fetchToolboxItems(mode);
  }, []);

  const fetchToolboxItems = async (mode: 'local' | 'supabase') => {
    if (mode === 'supabase') {
      const client = getSupabaseClient();
      if (client) {
        const { data, error } = await client
          .from('toolbox')
          .select('*')
          .order('createdAt', { ascending: false });
        if (!error && data) {
          setItems(data);
          return;
        }
      }
    }

    // LocalStorage fallback
    const local = localStorage.getItem('devsync-toolbox');
    if (local) {
      try {
        setItems(JSON.parse(local));
      } catch (e) {
        setItems(INITIAL_ITEMS);
      }
    } else {
      setItems(INITIAL_ITEMS);
      localStorage.setItem('devsync-toolbox', JSON.stringify(INITIAL_ITEMS));
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newItem: ToolboxItem = {
      id: 'tool_' + Date.now(),
      type,
      title: title.trim(),
      content: content.trim(),
      tags: parsedTags.length > 0 ? parsedTags : ['Ressource'],
      language: type === 'snippet' ? language : undefined,
      author: activeUser,
      createdAt: new Date().toISOString(),
      isPinned: false
    };

    const nextItems = [newItem, ...items];
    setItems(nextItems);

    if (dbMode === 'supabase') {
      const client = getSupabaseClient();
      if (client) {
        await client.from('toolbox').insert(newItem);
      }
    } else {
      localStorage.setItem('devsync-toolbox', JSON.stringify(nextItems));
    }

    // Reset Form
    setTitle('');
    setContent('');
    setTagsInput('');
  };

  const handleTogglePin = async (item: ToolboxItem) => {
    const nextItems = items.map((i) => 
      i.id === item.id ? { ...i, isPinned: !i.isPinned } : i
    );
    setItems(nextItems);

    if (dbMode === 'supabase') {
      const client = getSupabaseClient();
      if (client) {
        await client
          .from('toolbox')
          .update({ isPinned: !item.isPinned })
          .eq('id', item.id);
      }
    } else {
      localStorage.setItem('devsync-toolbox', JSON.stringify(nextItems));
    }
  };

  const handleDeleteItem = async (id: string) => {
    const conf = confirm("Supprimer cette ressource de la boîte à outils ?");
    if (!conf) return;

    const nextItems = items.filter((i) => i.id !== id);
    setItems(nextItems);

    if (dbMode === 'supabase') {
      const client = getSupabaseClient();
      if (client) {
        await client.from('toolbox').delete().eq('id', id);
      }
    } else {
      localStorage.setItem('devsync-toolbox', JSON.stringify(nextItems));
    }
  };

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pinnedItems = items.filter((i) => i.isPinned);
  const regularItems = items.filter((i) => !i.isPinned);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="flex justify-between items-center pb-3 border-b border-[#ECEAE3]">
        <div>
          <h2 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase font-mono">Boîte à Outils</h2>
          <p className="text-[11px] text-[#8C8A85] mt-0.5 font-medium">Partagez vos snippets de code et favoris documentaires.</p>
        </div>
      </div>

      {/* EXACTLY ONE DARK CARD FOR CONTRAST - Contribution Form */}
      <form onSubmit={handleAddItem} className="card-dark rounded-3xl p-6 flex flex-col gap-4">
        <div>
          <span className="text-[8.5px] font-mono uppercase tracking-widest text-zinc-400 font-bold">Contribution</span>
          <h3 className="text-base font-display font-bold text-white mt-1">Ajouter une ressource</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-zinc-900 border border-zinc-800 p-1.5 rounded-full self-start">
          <button
            type="button"
            onClick={() => setType('snippet')}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              type === 'snippet' ? 'bg-[#F2C94C] text-[#161616]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Snippet de Code
          </button>
          <button
            type="button"
            onClick={() => setType('bookmark')}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              type === 'bookmark' ? 'bg-[#F2C94C] text-[#161616]' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Lien Bookmark
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tool-title" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Titre descriptif</label>
            <input
              id="tool-title"
              type="text"
              placeholder="Ex: Configuration Nginx SSL"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors font-mono"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tool-tags" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Tags (séparés par virgules)</label>
            <input
              id="tool-tags"
              type="text"
              placeholder="Ex: Nginx, SSL, DevOps"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors font-mono"
            />
          </div>
        </div>

        {type === 'snippet' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="tool-code" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Contenu du Code</label>
              <textarea
                id="tool-code"
                placeholder="Collez votre code ici..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors font-mono resize-none"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tool-lang" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Langage</label>
              <select
                id="tool-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded px-3 py-2 text-xs focus:outline-none"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="css">CSS</option>
                <option value="bash">Bash / Shell</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tool-url" className="text-[9.5px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Adresse URL du lien</label>
            <input
              id="tool-url"
              type="url"
              placeholder="https://example.com/docs"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors font-mono"
              required
            />
          </div>
        )}

        <button
          type="submit"
          className="px-5 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer self-start shadow-md"
        >
          Ajouter à la boîte
        </button>
      </form>

      {/* Pinned section */}
      {pinnedItems.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-[#F2C94C] uppercase tracking-widest font-mono flex items-center gap-1.5">
            <span>★ Épinglés</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedItems.map((item) => renderToolboxCard(item))}
          </div>
        </div>
      )}

      {/* General List */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-bold text-[#1B1B1B] uppercase tracking-widest font-mono">
          Ressources Partagées ({regularItems.length})
        </h3>
        {regularItems.length === 0 && pinnedItems.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-[#ECEAE3] rounded-3xl bg-white/30">
            <p className="text-[9.5px] font-mono uppercase tracking-wider text-[#8C8A85]">La boîte à outils est vide</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regularItems.map((item) => renderToolboxCard(item))}
          </div>
        )}
      </div>

    </div>
  );

  function renderToolboxCard(item: ToolboxItem) {
    return (
      <div 
        key={item.id} 
        className="card-light rounded-3xl p-5 flex flex-col justify-between gap-4 bg-white border border-[#ECEAE3]"
      >
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#8C8A85]">
                {item.type === 'snippet' ? `Code / ${item.language}` : 'Lien Favori'}
              </span>
              <h4 className="text-sm font-display font-bold text-[#1B1B1B] truncate leading-tight">
                {item.title}
              </h4>
            </div>
            
            <div className="flex gap-1.5 shrink-0">
              {/* Pin */}
              <button
                onClick={() => handleTogglePin(item)}
                className={`p-1 rounded bg-[#F7F5EF] border border-[#ECEAE3] hover:text-[#1B1B1B] transition-colors cursor-pointer ${
                  item.isPinned ? 'text-[#F2C94C]' : 'text-[#8C8A85]'
                }`}
                title={item.isPinned ? "Désépingler" : "Épingler"}
              >
                ★
              </button>
              {/* Delete */}
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="p-1 rounded bg-[#F7F5EF] border border-[#ECEAE3] text-[#8C8A85] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          {item.type === 'snippet' ? (
            <div className="relative group/code mt-1">
              <pre className="bg-[#F7F5EF] border border-[#ECEAE3] rounded-2xl p-4 overflow-x-auto font-mono text-[9px] text-[#1B1B1B] leading-relaxed max-h-[160px]">
                <code>{item.content}</code>
              </pre>
              <button
                onClick={() => handleCopyCode(item.id, item.content)}
                className="absolute top-2 right-2 px-2.5 py-1 bg-[#161616] text-white text-[9px] font-mono uppercase tracking-wider rounded-md hover:bg-black active:scale-95 transition-all opacity-0 group-hover/code:opacity-100 cursor-pointer shadow"
              >
                {copiedId === item.id ? 'Copié !' : 'Copier'}
              </button>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between p-3.5 bg-[#F7F5EF] border border-[#ECEAE3] rounded-2xl text-xs">
              <a 
                href={item.content}
                target="_blank"
                rel="noreferrer"
                className="text-[#1B1B1B] hover:text-black font-semibold underline truncate mr-2"
              >
                {item.content}
              </a>
              <span className="text-[9px] text-zinc-400 font-mono">↗ URL</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-[9px] font-mono text-[#8C8A85] border-t border-[#ECEAE3] pt-3 flex-wrap gap-2">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-[#161616] text-[#F2C94C] flex items-center justify-center text-[8px] font-bold font-mono shadow-sm">
              {item.author.charAt(0)}
            </span>
            <span>Par {item.author}</span>
          </span>

          <div className="flex gap-2 items-center flex-wrap">
            {item.tags.map((tag) => (
              <span 
                key={tag} 
                className="px-2 py-0.5 rounded-full bg-[#FBE7A1]/40 border border-transparent text-[8px] font-bold uppercase tracking-wider text-[#1B1B1B]"
              >
                {tag}
              </span>
            ))}
            <span>
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
}
