
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, BarChart, Bar, Cell
} from 'recharts';
import { 
  NoticeType, Tab, PostStatus, User, BlogPost, 
  Extension
} from '../types';
import { 
  STORAGE_KEYS, DEFAULT_USERS, DEFAULT_POSTS, DEFAULT_EXTENSIONS 
} from '../constants';
import { generateDraft } from '../services/geminiService';

interface AdminCMSProps {
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onViewSite: () => void;
}

export const AdminCMS: React.FC<AdminCMSProps> = ({ currentUser, onLogin, onLogout, onViewSite }) => {
  // ====== STATES ======
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true');
  const [notice, setNotice] = useState<{ message: string; type: NoticeType } | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const [posts, setPosts] = useState<BlogPost[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POSTS);
    return saved ? JSON.parse(saved) : DEFAULT_POSTS;
  });

  const [extensions, setExtensions] = useState<Extension[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    return saved ? JSON.parse(saved) : DEFAULT_EXTENSIONS;
  });

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<BlogPost>>({});
  const [isEditingExt, setIsEditingExt] = useState(false);
  const [extFormData, setExtFormData] = useState<Partial<Extension>>({});
  const [aiLoading, setAiLoading] = useState(false);

  // ====== NOTIFICATIONS ======
  const showNotice = (message: string, type: NoticeType = 'info') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // ====== PERSISTENCE ======
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(extensions));
  }, [extensions]);

  useEffect(() => {
    const handleStorage = () => {
      const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
      if (savedPosts) setPosts(JSON.parse(savedPosts));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, darkMode.toString());
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // ====== SCHEDULER ENGINE ======
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      let hasUpdate = false;
      const updated = posts.map(p => {
        if (p.status === 'scheduled' && p.publishDate) {
          const schedTime = new Date(p.publishDate).getTime();
          if (schedTime <= now) {
            hasUpdate = true;
            return { ...p, status: 'published' as PostStatus };
          }
        }
        return p;
      });
      if (hasUpdate) {
        setPosts(updated);
        showNotice('System Update: A scheduled post is now LIVE!', 'success');
      }
    }, 5000); // Check every 5 seconds for higher precision
    return () => clearInterval(interval);
  }, [posts]);

  // ====== ANALYTICS LOGIC ======
  const realPostAnalytics = useMemo(() => {
    return posts
      .slice(0, 15)
      .reverse()
      .map(p => ({
        name: p.title.length > 12 ? p.title.substring(0, 12) + '...' : p.title,
        views: p.views || 0,
        fullTitle: p.title
      }));
  }, [posts]);

  const totalViews = useMemo(() => posts.reduce((acc, p) => acc + (p.views || 0), 0), [posts]);
  const activePostCount = useMemo(() => posts.filter(p => p.status === 'published').length, [posts]);
  const scheduledCount = useMemo(() => posts.filter(p => p.status === 'scheduled').length, [posts]);
  const topPerformers = useMemo(() => [...posts].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 5), [posts]);

  // ====== ADVANCED COPY FEATURE ======
  const handleCopyRichText = async () => {
    const content = formData.content || '';
    if (!content) return showNotice('No content to copy', 'error');

    let compatibleContent = content;
    compatibleContent = compatibleContent.replace(/<table/g, '<table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #000; margin: 20px 0;"');
    compatibleContent = compatibleContent.replace(/<th/g, '<th style="background-color: #f2f2f2; font-weight: bold; border: 1px solid #000; padding: 10px;"');
    compatibleContent = compatibleContent.replace(/<td/g, '<td style="border: 1px solid #000; padding: 10px;"');

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 20px auto; padding: 20px; }
          h1 { font-size: 2.5em; color: #000; margin-bottom: 0.8em; font-weight: 800; }
          h2 { font-size: 2em; color: #111; margin-top: 1.5em; margin-bottom: 0.6em; font-weight: 700; }
          h3 { font-size: 1.5em; color: #222; margin-top: 1.2em; margin-bottom: 0.5em; font-weight: 700; }
          p { margin-bottom: 1.2em; font-size: 1.1em; color: #333; }
          ul, ol { margin-bottom: 1.2em; padding-left: 30px; }
          li { margin-bottom: 0.6em; font-size: 1.1em; }
          strong { font-weight: bold; }
          em { font-style: italic; }
          img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; display: block; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #000; }
          table th, table td { border: 1px solid #000; padding: 12px; text-align: left; }
          table th { background-color: #f7f7f7; font-weight: bold; }
          blockquote { border-left: 5px solid #4f46e5; padding: 15px 20px; margin: 25px 0; font-style: italic; color: #555; background: #f9f9f9; }
          a { color: #4f46e5; text-decoration: underline; }
        </style>
      </head>
      <body>
        ${compatibleContent}
      </body>
      </html>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = compatibleContent;
    const plainText = tempDiv.innerText;

    try {
      const typeHtml = 'text/html';
      const typeText = 'text/plain';
      const blobHtml = new Blob([fullHtml], { type: typeHtml });
      const blobText = new Blob([plainText], { type: typeText });
      const data = [new ClipboardItem({ [typeHtml]: blobHtml, [typeText]: blobText })];
      
      await navigator.clipboard.write(data);
      setCopyStatus('copied');
      showNotice('Ready to Paste (H1-H3 & Tables Preserved)', 'success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      showNotice('HTML Copied (Clipboard API Blocked)', 'info');
    }
  };

  const handleCopyRawHTML = () => {
    const html = formData.content || '';
    if (!html) return showNotice('No content to copy', 'error');
    navigator.clipboard.writeText(html);
    showNotice('Raw Code Exported', 'info');
  };

  // ====== EDITORIAL ACTIONS ======
  const handleSavePost = () => {
    if (!formData.title) return showNotice('Headline is required', 'error');
    
    // Logic for scheduling: if scheduled, use the selected date; otherwise, default to now.
    const finalPublishDate = formData.status === 'scheduled' 
      ? (formData.publishDate || new Date().toISOString()) 
      : new Date().toISOString();

    const newPost: BlogPost = {
      ...DEFAULT_POSTS[0],
      ...formData as BlogPost,
      id: formData.id || `post-${Date.now()}`,
      publishDate: finalPublishDate,
      views: formData.views || 0,
      status: formData.status || 'draft'
    };
    
    if (formData.id) {
      setPosts(posts.map(p => p.id === formData.id ? newPost : p));
    } else {
      setPosts([newPost, ...posts]);
    }
    setIsEditing(false);
    showNotice('Intelligence Synced to Database', 'success');
  };

  const handleAIDraft = async () => {
    if (!formData.title) return showNotice('Headline needed', 'info');
    setAiLoading(true);
    try {
      const draft = await generateDraft(formData.title);
      setFormData(prev => ({ ...prev, ...draft }));
      showNotice('AI Draft Generated', 'success');
    } catch { showNotice('AI Sync Failed', 'error'); }
    finally { setAiLoading(false); }
  };

  const filteredPosts = useMemo(() => posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())), [posts, searchTerm]);
  const scheduledPosts = useMemo(() => posts.filter(p => p.status === 'scheduled').sort((a,b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()), [posts]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 border dark:border-slate-800">
          <div className="flex justify-center mb-8"><div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl">E</div></div>
          <h1 className="text-xl font-black text-center mb-8 dark:text-white uppercase tracking-tighter">Editorial Terminal</h1>
          <form onSubmit={(e) => {
            e.preventDefault();
            const user = DEFAULT_USERS.find(u => u.username === loginForm.username && u.password === loginForm.password);
            if (user) onLogin(user); else showNotice('Unauthorized Credentials', 'error');
          }} className="space-y-4">
            <input type="text" placeholder="Access ID" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-bold" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="Passkey" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-bold" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg">Establish Session</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            if (json.posts) setPosts(json.posts);
            if (json.extensions) setExtensions(json.extensions);
            showNotice('State Restored', 'success');
          } catch { showNotice('Invalid Source', 'error'); }
        };
        reader.readAsText(file);
      }} accept=".json" className="hidden" />

      {/* Modern Sidebar */}
      <aside className="w-60 fixed h-full bg-white dark:bg-slate-900 border-r dark:border-slate-800 z-50 flex flex-col p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-8 cursor-pointer group" onClick={onViewSite}>
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg">E</div>
          <span className="font-black text-lg tracking-tighter dark:text-white">Editorial Hub</span>
        </div>
        
        <nav className="flex-grow space-y-1">
          {[
            { id: 'dashboard', label: 'Overview', icon: '📊' },
            { id: 'posts', label: 'Editorial', icon: '📝' },
            { id: 'scheduler', label: 'Queue', icon: '⏰' },
            { id: 'extensions', label: 'Assets', icon: '🧩' },
            { id: 'analytics', label: 'Impact', icon: '📈' },
            { id: 'settings', label: 'System', icon: '⚙️' }
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as Tab); setIsEditing(false); }} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span className="text-sm">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-5 border-t dark:border-slate-800 space-y-0.5">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full text-left px-3.5 py-2 text-[8px] font-black uppercase text-slate-400 hover:text-indigo-600">{darkMode ? '☀️ Light' : '🌙 Dark'}</button>
          <button onClick={onLogout} className="w-full text-left px-3.5 py-2 text-[8px] font-black uppercase text-rose-500 rounded-xl">🚪 Exit</button>
        </div>
      </aside>

      <main className="ml-60 flex-grow p-6 overflow-y-auto min-h-screen">
        {notice && (
          <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-xl text-white font-black uppercase text-[8px] animate-in fade-in slide-in-from-top-2 ${notice.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-600'}`}>
            {notice.message}
          </div>
        )}

        {/* 1. Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black dark:text-white tracking-tighter">System Metrics</h1>
                <p className="text-[8px] font-black uppercase text-indigo-500 tracking-widest mt-0.5">Live Monitoring</p>
              </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {[
                { label: 'Impressions', value: totalViews.toLocaleString(), color: 'text-indigo-600' },
                { label: 'Live Assets', value: activePostCount, color: 'text-emerald-500' },
                { label: 'Pending Sync', value: scheduledCount, color: 'text-amber-500' },
                { label: 'Tools Registered', value: extensions.length, color: 'text-slate-900 dark:text-white' }
              ].map((stat, i) => (
                <div key={i} className="p-5 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border dark:border-slate-800">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                  <div className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 shadow-sm">
              <h3 className="text-base font-black dark:text-white mb-5 tracking-tighter">Engagement Spectrum</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={realPostAnalytics}>
                    <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} fontWeight={900} />
                    <YAxis hide />
                    <Tooltip contentStyle={{borderRadius: '12px', border:'none', fontSize: '9px', fontWeight: '900'}} />
                    <Area type="monotone" dataKey="views" stroke="#4f46e5" fillOpacity={1} fill="url(#colorViews)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 2. Editorial Board */}
        {activeTab === 'posts' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
              <h2 className="text-2xl font-black dark:text-white tracking-tighter">Knowledge Base</h2>
              {!isEditing && <button onClick={() => { setFormData({ status: 'draft', category: 'General' }); setIsEditing(true); }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase text-[8px] shadow-sm">+ Compose Intel</button>}
            </header>

            {!isEditing ? (
              <div className="space-y-3">
                <input type="text" placeholder="Filter insights..." className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl outline-none border dark:border-slate-800 font-bold text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div className="grid gap-3">
                  {filteredPosts.map(p => (
                    <div key={p.id} className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 flex items-center justify-between group hover:border-indigo-100 transition-all shadow-sm">
                      <div className="flex items-center gap-4 truncate">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
                          {p.image ? <img src={p.image} className="w-full h-full object-cover" alt="" /> : <span className="text-base opacity-20">🖼️</span>}
                        </div>
                        <div className="truncate">
                          <h3 className="text-sm font-black dark:text-white truncate tracking-tight">{p.title}</h3>
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{p.views || 0} Hits • {p.category} • <span className={p.status === 'scheduled' ? 'text-amber-500' : 'text-slate-400'}>{p.status.toUpperCase()}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setFormData(p); setIsEditing(true); }} className="w-7 h-7 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-md flex items-center justify-center text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-sm">✏️</button>
                        <button onClick={() => { if(confirm('Delete permanently?')) setPosts(posts.filter(x => x.id !== p.id)); }} className="w-7 h-7 bg-slate-50 dark:bg-slate-800 dark:text-rose-500 rounded-md flex items-center justify-center text-xs hover:bg-rose-500 hover:text-white transition-all shadow-sm">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border dark:border-slate-800 space-y-8 animate-in slide-in-from-bottom-5 shadow-2xl">
                <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
                  <h3 className="text-xl font-black dark:text-white tracking-tighter">Composition Hub</h3>
                  <div className="flex gap-1.5">
                    <button onClick={handleAIDraft} disabled={aiLoading} className="px-3 py-1 bg-violet-600 text-white rounded-md font-black text-[8px] uppercase">{aiLoading ? 'Synthesizing...' : '🪄 AI Assistant'}</button>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-md font-black text-[8px] uppercase">Discard</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[7px] font-black uppercase text-slate-400 ml-2 mb-1 block">Article Title</label>
                      <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-black text-sm border focus:border-indigo-500 shadow-inner" placeholder="Headline" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[7px] font-black uppercase text-slate-400 ml-2 mb-1 block">Featured Media URL</label>
                      <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-bold text-[10px] shadow-inner" placeholder="https://..." value={formData.image || ''} onChange={e => setFormData({...formData, image: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <div>
                        <label className="text-[7px] font-black uppercase text-slate-400 ml-2 mb-1 block">Category</label>
                        <input className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-black uppercase text-[8px] shadow-inner" placeholder="E.g. Tech" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[7px] font-black uppercase text-slate-400 ml-2 mb-1 block">Visibility Status</label>
                        <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl outline-none font-black uppercase text-[8px] shadow-inner" value={formData.status || 'draft'} onChange={e => setFormData({...formData, status: e.target.value as PostStatus})}>
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="scheduled">Scheduled</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      {formData.status === 'scheduled' && (
                        <div className="animate-in slide-in-from-right-2">
                          <label className="text-[7px] font-black uppercase text-amber-500 ml-2 mb-1 block">Target Launch Window</label>
                          <input 
                            type="datetime-local" 
                            className="w-full p-3 bg-amber-50 dark:bg-amber-900/10 dark:text-amber-400 rounded-xl outline-none font-black uppercase text-[8px] shadow-inner border border-amber-100 dark:border-amber-900/50" 
                            value={formData.publishDate ? new Date(formData.publishDate).toISOString().slice(0, 16) : ''} 
                            onChange={e => setFormData({...formData, publishDate: new Date(e.target.value).toISOString()})} 
                          />
                          <p className="text-[6px] font-bold text-slate-400 uppercase mt-2 ml-2">Intelligence will sync at specified coordinates.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-2">Article Engine (HTML Editor)</label>
                    <div className="flex gap-1.5">
                       <button onClick={() => setShowPreview(!showPreview)} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 dark:text-white text-[7px] font-black uppercase rounded-md shadow-sm">{showPreview ? 'Hide View' : 'Preview'}</button>
                       <button onClick={handleCopyRichText} className={`px-3 py-1 ${copyStatus === 'copied' ? 'bg-emerald-500' : 'bg-indigo-600'} text-white text-[7px] font-black uppercase rounded-md shadow-md`}>
                          {copyStatus === 'copied' ? 'Copied ✅' : 'Copy Formatted'}
                       </button>
                       <button onClick={handleCopyRawHTML} className="px-2.5 py-1 bg-slate-900 text-white text-[7px] font-black uppercase rounded-md shadow-sm">Copy Code</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <textarea className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none font-medium h-[35rem] leading-relaxed text-xs font-mono shadow-inner border focus:border-indigo-400" placeholder="Use <h1>, <h2>, <h3> and <table> tags here..." value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} />
                    {showPreview && (
                      <div className="animate-in fade-in p-8 bg-white dark:bg-slate-900 border-2 border-indigo-50 dark:border-slate-800 rounded-2xl h-[35rem] overflow-y-auto prose dark:prose-invert max-w-none text-xs">
                        <div className="article-preview-content" dangerouslySetInnerHTML={{ __html: formData.content || '<p class="italic opacity-30">Editor is empty...</p>' }} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t dark:border-slate-800">
                  <button onClick={handleSavePost} className="px-12 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] shadow-xl hover:scale-105 transition-all">Establish Intelligence Sync</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Scheduler Timeline */}
        {activeTab === 'scheduler' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-black dark:text-white tracking-tighter">Automated Timeline</h2>
            <div className="grid gap-3">
              {scheduledPosts.length > 0 ? (
                scheduledPosts.map(p => (
                  <div key={p.id} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-2xl text-amber-500 shadow-inner">⏰</div>
                      <div>
                        <h3 className="text-base font-black dark:text-white tracking-tight">{p.title}</h3>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Pending: {new Date(p.publishDate).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setFormData(p); setIsEditing(true); setActiveTab('posts'); }} className="px-4 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-md font-black text-[8px] uppercase">Adjust</button>
                      <button onClick={() => setPosts(posts.map(x => x.id === p.id ? {...x, status: 'published' as PostStatus} : x))} className="px-4 py-1.5 bg-emerald-600 text-white rounded-md font-black text-[8px] uppercase shadow-md">Force Live</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed dark:border-slate-800 text-slate-300 font-black uppercase text-sm">Protocol Timeline Clear</div>
              )}
            </div>
          </div>
        )}

        {/* 4. Asset Library */}
        {activeTab === 'extensions' && (
          <div className="space-y-6 animate-in fade-in">
            <header className="flex justify-between items-center">
              <h2 className="text-2xl font-black dark:text-white tracking-tighter">Digital Asset Registry</h2>
              {!isEditingExt && <button onClick={() => { setExtFormData({ downloads: 0, rating: 5 }); setIsEditingExt(true); }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase text-[8px] shadow-sm">+ Register Asset</button>}
            </header>

            {!isEditingExt ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {extensions.map(ext => (
                  <div key={ext.id} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col group transition-all hover:border-indigo-100">
                    <div className="text-3xl mb-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl w-fit shadow-inner">{ext.icon || '🧩'}</div>
                    <h3 className="text-base font-black dark:text-white truncate mb-1">{ext.name}</h3>
                    <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-4">{ext.category}</p>
                    <div className="flex gap-1 mt-auto">
                       <button onClick={() => { setExtFormData(ext); setIsEditingExt(true); }} className="flex-grow py-2 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-lg font-black text-[8px] uppercase hover:bg-indigo-600 hover:text-white transition-all">Modify</button>
                       <button onClick={() => setExtensions(extensions.filter(x => x.id !== ext.id))} className="w-8 h-8 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-lg flex items-center justify-center text-base hover:bg-rose-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border dark:border-slate-800 space-y-6 animate-in slide-in-from-bottom-5 shadow-2xl">
                 <h3 className="text-xl font-black dark:text-white tracking-tighter">Registry Sync</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <input className="p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold text-xs shadow-inner" placeholder="Name" value={extFormData.name || ''} onChange={e => setExtFormData({...extFormData, name: e.target.value})} />
                    <input className="p-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold text-center text-2xl shadow-inner" placeholder="Icon" value={extFormData.icon || ''} onChange={e => setExtFormData({...extFormData, icon: e.target.value})} />
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => {
                        const newExt: Extension = { id: extFormData.id || `ext-${Date.now()}`, name: extFormData.name || '', description: extFormData.description || '', category: extFormData.category || 'General', rating: 5, downloads: extFormData.downloads || 0, icon: extFormData.icon, storeUrl: extFormData.storeUrl };
                        if (extFormData.id) setExtensions(extensions.map(e => e.id === extFormData.id ? newExt : e));
                        else setExtensions([newExt, ...extensions]);
                        setIsEditingExt(false);
                    }} className="flex-grow py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg">Authorize Sync</button>
                    <button onClick={() => setIsEditingExt(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-xl font-black uppercase tracking-widest text-[9px]">Discard</button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Analytics Distribution */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-black dark:text-white tracking-tighter">Engagement Impact</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
               <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col h-[30rem] overflow-y-auto">
                 <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-6">Asset Rankings</h4>
                 <div className="space-y-4">
                    {topPerformers.map((p,i)=>(
                      <div key={i} className="flex items-center justify-between group">
                        <span className="text-[9px] font-black truncate max-w-[120px] dark:text-white group-hover:text-indigo-600 transition-colors">{p.title}</span>
                        <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 px-2 py-0.5 rounded-full">{p.views||0}</span>
                      </div>
                    ))}
                 </div>
               </div>
               <div className="md:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm h-[30rem]">
                  <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-6">Reach Historical Architecture</h4>
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={realPostAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                      <XAxis dataKey="name" tick={{fontSize: 7, fontWeight: 900}} stroke="#94a3b8" />
                      <YAxis hide />
                      <Tooltip contentStyle={{borderRadius: '10px', fontSize: '9px', fontWeight: '800'}} />
                      <Bar dataKey="views" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={30}>
                         {realPostAnalytics.map((entry, index) => <Cell key={`cell-${index}`} fillOpacity={0.8} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {/* 6. Continuity Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8 animate-in fade-in">
            <header>
              <h2 className="text-2xl font-black dark:text-white tracking-tighter">System Continuity</h2>
              <p className="text-slate-400 font-bold uppercase text-[8px] tracking-widest">Global persistence & state management</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 shadow-sm space-y-6">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-xl flex items-center justify-center text-xl shadow-inner">🛡️</div>
                <h3 className="text-base font-black dark:text-white tracking-tight">Data Vault</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => {
                    const data = { posts, extensions, timestamp: new Date().toISOString() };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a'); link.href = url; link.download = `cms-vault-${Date.now()}.json`; link.click();
                    showNotice('Backup Downloaded', 'success');
                  }} className="py-2.5 bg-indigo-600 text-white rounded-lg font-black uppercase text-[8px] tracking-widest shadow-md">Export Master JSON</button>
                  <button onClick={() => fileInputRef.current?.click()} className="py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg font-black uppercase text-[8px] tracking-widest">Restore Recovery Point</button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 shadow-sm space-y-6">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/10 text-amber-600 rounded-xl flex items-center justify-center text-xl shadow-inner">🚀</div>
                <h3 className="text-base font-black dark:text-white tracking-tight">SEO Cloud</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => {
                    const baseUrl = window.location.origin;
                    let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
                    posts.filter(p => p.status === 'published').forEach(p => { xml += `<url><loc>${baseUrl}/blog/${p.id}</loc></url>`; });
                    xml += `</urlset>`;
                    const blob = new Blob([xml], { type: 'text/xml' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a'); link.href = url; link.download = 'sitemap.xml'; link.click();
                    showNotice('Sitemap Synchronized', 'success');
                  }} className="py-2.5 bg-emerald-600 text-white rounded-lg font-black uppercase text-[8px] tracking-widest shadow-md">Regenerate Sitemap</button>
                  <button onClick={() => {
                    const txt = `User-agent: *\nAllow: /\nSitemap: ${window.location.origin}/sitemap.xml`;
                    const blob = new Blob([txt], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a'); link.href = url; link.download = 'robots.txt'; link.click();
                    showNotice('Robots.txt Ready', 'info');
                  }} className="py-2.5 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-lg font-black uppercase text-[8px] tracking-widest">Fetch Robots.txt</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
