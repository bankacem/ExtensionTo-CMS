
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
  STORAGE_KEYS, DEFAULT_USERS, DEFAULT_POSTS, DEFAULT_EXTENSIONS, DEFAULT_SETTINGS 
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
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, darkMode.toString());
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // ====== SCHEDULER ENGINE (REAL-TIME) ======
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
        showNotice('Queue Manager: Post has been published automatically!', 'success');
      }
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [posts]);

  // ====== ANALYTICS ENGINE (REAL DATA ONLY) ======
  const realAnalytics = useMemo(() => {
    // Generate a chart based on views of the last 10 articles
    return posts
      .slice(0, 10)
      .reverse()
      .map(p => ({
        name: p.title.substring(0, 10) + '...',
        views: p.views || 0,
        fullTitle: p.title
      }));
  }, [posts]);

  const totalViews = useMemo(() => posts.reduce((acc, p) => acc + (p.views || 0), 0), [posts]);
  const scheduledCount = useMemo(() => posts.filter(p => p.status === 'scheduled').length, [posts]);

  // ====== TOOLS ======
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportData = () => {
    const data = { posts, extensions, timestamp: new Date().toISOString() };
    downloadFile(JSON.stringify(data, null, 2), `extensionto-full-backup-${Date.now()}.json`, 'application/json');
    showNotice('Master JSON Backup Exported.', 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.posts) setPosts(json.posts);
        if (json.extensions) setExtensions(json.extensions);
        showNotice('System state restored successfully!', 'success');
      } catch { showNotice('Invalid backup file format.', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const generateSitemap = () => {
    const baseUrl = window.location.origin;
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    posts.filter(p => p.status === 'published').forEach(p => {
      xml += `  <url><loc>${baseUrl}/blog/${p.id}</loc></url>\n`;
    });
    xml += `</urlset>`;
    downloadFile(xml, 'sitemap.xml', 'text/xml');
    showNotice('SEO Sitemap generated.', 'success');
  };

  // ====== POST ACTIONS ======
  const handleSavePost = () => {
    if (!formData.title) return showNotice('Title is mandatory', 'error');
    const newPost: BlogPost = {
      ...DEFAULT_POSTS[0],
      ...formData as BlogPost,
      id: formData.id || `post-${Date.now()}`,
      publishDate: formData.status === 'scheduled' ? (formData.publishDate || new Date().toISOString()) : new Date().toISOString(),
      views: formData.views || 0,
      status: formData.status || 'draft'
    };
    if (formData.id) {
      setPosts(posts.map(p => p.id === formData.id ? newPost : p));
    } else {
      setPosts([newPost, ...posts]);
    }
    setIsEditing(false);
    showNotice('Database entry updated.', 'success');
  };

  const handleAIDraft = async () => {
    if (!formData.title) return showNotice('Headline required for synthesis', 'info');
    setAiLoading(true);
    try {
      const draft = await generateDraft(formData.title);
      setFormData(prev => ({ ...prev, ...draft }));
      showNotice('AI Synthesis Complete.', 'success');
    } catch { showNotice('AI Cloud Sync Failed.', 'error'); }
    finally { setAiLoading(false); }
  };

  // ====== FILTERING ======
  const filteredPosts = useMemo(() => posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())), [posts, searchTerm]);
  const scheduledPosts = useMemo(() => posts.filter(p => p.status === 'scheduled').sort((a,b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()), [posts]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 font-sans">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-12 border dark:border-slate-800 animate-in fade-in zoom-in">
          <div className="flex justify-center mb-8"><div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-indigo-100">E</div></div>
          <h1 className="text-2xl font-black text-center mb-8 dark:text-white uppercase tracking-tighter">BANKACEM Terminal</h1>
          <form onSubmit={(e) => {
            e.preventDefault();
            const user = DEFAULT_USERS.find(u => u.username === loginForm.username && u.password === loginForm.password);
            if (user) onLogin(user); else showNotice('Unauthorized Access', 'error');
          }} className="space-y-4">
            <input type="text" placeholder="Access ID" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none font-bold" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="Passkey" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none font-bold" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100">Establish Session</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
      <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />

      {/* Sidebar */}
      <aside className="w-72 fixed h-full bg-white dark:bg-slate-900 border-r dark:border-slate-800 z-50 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-12 cursor-pointer group" onClick={onViewSite}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">E</div>
          <span className="font-black text-xl tracking-tighter dark:text-white">Editorial Hub</span>
        </div>
        
        <nav className="flex-grow space-y-2">
          {[
            { id: 'dashboard', label: 'Overview', icon: '📊' },
            { id: 'posts', label: 'Editorial', icon: '📝' },
            { id: 'scheduler', label: 'Queue', icon: '⏰' },
            { id: 'extensions', label: 'Extensions', icon: '🧩' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'settings', label: 'Database & SEO', icon: '⚙️' }
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id as Tab); setIsEditing(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span className="text-lg">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t dark:border-slate-800 space-y-2">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">{darkMode ? '☀️ Day' : '🌙 Night'}</button>
          <button onClick={onLogout} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl">🚪 Exit Hub</button>
        </div>
      </aside>

      <main className="ml-72 flex-grow p-10 overflow-y-auto">
        {notice && (
          <div className={`fixed top-10 right-10 z-[100] px-8 py-5 rounded-2xl shadow-2xl text-white font-black uppercase text-[10px] animate-in fade-in slide-in-from-top-4 ${notice.type === 'success' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
            {notice.message}
          </div>
        )}

        {/* 1. Dashboard (REAL DATA) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <header><h1 className="text-5xl font-black dark:text-white tracking-tighter">Platform Health</h1></header>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Views</span>
                <div className="text-4xl font-black mt-3 text-indigo-600">{totalViews.toLocaleString()}</div>
              </div>
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Extensions</span>
                <div className="text-4xl font-black mt-3 text-emerald-500">{extensions.length}</div>
              </div>
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Queue</span>
                <div className="text-4xl font-black mt-3 text-amber-500">{scheduledCount}</div>
              </div>
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</span>
                <div className="text-4xl font-black mt-3 text-slate-900 dark:text-white">LIVE</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black dark:text-white mb-8 tracking-tighter">View Trends (Real Data)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={realAnalytics}>
                    <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="name" stroke={darkMode ? '#475569' : '#94a3b8'} fontSize={10} fontWeight={900} />
                    <YAxis hide />
                    <Tooltip contentStyle={{borderRadius: '20px', border:'none', fontWeight:'900', background: darkMode ? '#0f172a' : '#fff'}} />
                    <Area type="monotone" dataKey="views" stroke="#4f46e5" fillOpacity={1} fill="url(#colorViews)" strokeWidth={6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* 2. Editorial (PROFESSIONAL BOARD) */}
        {activeTab === 'posts' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
              <h2 className="text-4xl font-black dark:text-white tracking-tighter">Editorial Board</h2>
              {!isEditing && <button onClick={() => { setFormData({ status: 'draft' }); setIsEditing(true); }} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:scale-105 transition-all">+ Add Insight</button>}
            </header>

            {!isEditing ? (
              <div className="space-y-6">
                <input type="text" placeholder="Search database..." className="w-full p-6 bg-white dark:bg-slate-900 rounded-[2rem] outline-none border dark:border-slate-800 font-bold dark:text-white shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div className="grid gap-6">
                  {filteredPosts.map(p => (
                    <div key={p.id} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm">
                      <div className="flex items-center gap-8">
                        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
                          {p.image ? <img src={p.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="" /> : <span className="text-2xl">🖼️</span>}
                        </div>
                        <div>
                          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${p.status === 'published' ? 'bg-emerald-50 text-emerald-600' : p.status === 'scheduled' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                          <h3 className="text-xl font-black dark:text-white mt-1 leading-tight tracking-tight">{p.title}</h3>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{p.category} • {p.views || 0} Real Views</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setFormData(p); setIsEditing(true); }} className="w-14 h-14 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl flex items-center justify-center text-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">✏️</button>
                        <button onClick={() => { if(confirm('Permanently delete?')) setPosts(posts.filter(x => x.id !== p.id)); }} className="w-14 h-14 bg-slate-50 dark:bg-slate-800 dark:text-rose-500 rounded-2xl flex items-center justify-center text-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] border dark:border-slate-800 space-y-12 shadow-2xl animate-in slide-in-from-bottom-10">
                <div className="flex justify-between items-center pb-8 border-b dark:border-slate-800">
                  <h3 className="text-3xl font-black dark:text-white tracking-tighter">Composition Interface</h3>
                  <div className="flex gap-4">
                    <button onClick={handleAIDraft} disabled={aiLoading} className="px-6 py-3 bg-violet-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg disabled:opacity-50">{aiLoading ? 'Synthesizing...' : '🪄 AI Content Assist'}</button>
                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Discard</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-4">Primary Headline</label>
                      <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[2rem] outline-none font-black text-xl border border-transparent focus:border-indigo-500 transition-all shadow-inner" placeholder="Enter post title..." value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-4">Visual Asset URL (Featured Image)</label>
                      <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[2rem] outline-none font-bold shadow-inner" placeholder="https://..." value={formData.image || ''} onChange={e => setFormData({...formData, image: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-4">SEO Summary (Excerpt)</label>
                      <textarea className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[2rem] outline-none font-bold h-32 leading-relaxed shadow-inner" placeholder="SEO description..." value={formData.excerpt || ''} onChange={e => setFormData({...formData, excerpt: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-4">Category</label>
                        <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none font-black uppercase text-xs shadow-inner" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-4">Status</label>
                        <select className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none font-black uppercase text-[10px] appearance-none shadow-inner" value={formData.status || 'draft'} onChange={e => setFormData({...formData, status: e.target.value as PostStatus})}>
                          <option value="draft">Draft (Private)</option>
                          <option value="published">Publish (Live)</option>
                          <option value="scheduled">Schedule (Queue)</option>
                        </select>
                      </div>
                    </div>
                    
                    {formData.status === 'scheduled' && (
                      <div className="p-8 bg-amber-50 dark:bg-amber-900/10 rounded-[3rem] border border-amber-200 dark:border-amber-800 animate-in slide-in-from-top-4">
                        <label className="text-[10px] font-black uppercase text-amber-600 mb-4 block ml-2 tracking-widest">Queue Release Timestamp (Day/Month/Year Time)</label>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-white dark:bg-slate-800 p-5 rounded-2xl border dark:border-slate-700 outline-none font-black text-amber-900 dark:text-amber-200 cursor-pointer shadow-lg" 
                          value={formData.publishDate ? new Date(new Date(formData.publishDate).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ""} 
                          onChange={e => setFormData({...formData, publishDate: new Date(e.target.value).toISOString()})} 
                        />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-4">SEO Meta Title</label>
                        <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none font-bold shadow-inner" value={formData.seoTitle || ''} onChange={e => setFormData({...formData, seoTitle: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-4">SEO Keywords (Comma Separated)</label>
                        <input className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none font-bold shadow-inner" placeholder="tools, security, extensions" value={formData.seoKeywords || ''} onChange={e => setFormData({...formData, seoKeywords: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-4">Core Infrastructure (HTML Content)</label>
                  <textarea className="w-full p-10 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[3.5rem] outline-none font-medium h-[40rem] leading-relaxed border border-transparent focus:border-indigo-500 transition-all shadow-inner" placeholder="<h2>Sub-heading</h2><p>Your content here...</p>" value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} />
                </div>

                <div className="flex justify-end pt-10 border-t dark:border-slate-800">
                  <button onClick={handleSavePost} className="px-20 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl shadow-indigo-100 hover:scale-105 transition-all">Authorize Intelligence</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Queue (PROFESSIONAL SCHEDULER) */}
        {activeTab === 'scheduler' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <header>
              <h2 className="text-4xl font-black dark:text-white tracking-tighter">Automated Queue</h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Timeline of pending intellectual releases</p>
            </header>
            <div className="grid gap-6">
              {scheduledPosts.length > 0 ? (
                scheduledPosts.map(p => (
                  <div key={p.id} className="p-10 bg-white dark:bg-slate-900 rounded-[3.5rem] border dark:border-slate-800 flex items-center justify-between shadow-sm group hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-10">
                      <div className="w-24 h-24 rounded-[2.5rem] bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-4xl shadow-inner group-hover:rotate-12 transition-transform duration-500 text-amber-500">⏰</div>
                      <div>
                        <h3 className="text-2xl font-black dark:text-white tracking-tighter leading-tight">{p.title}</h3>
                        <div className="flex items-center gap-4 mt-3">
                           <span className="px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-full">Deployment Pending</span>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Sync: {new Date(p.publishDate).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => { setFormData(p); setIsEditing(true); setActiveTab('posts'); }} className="px-8 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Adjust</button>
                      <button onClick={() => setPosts(posts.map(x => x.id === p.id ? {...x, status: 'published' as PostStatus} : x))} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100">Force Live</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-40 bg-white dark:bg-slate-900 rounded-[4rem] border-2 border-dashed dark:border-slate-800 text-slate-300 font-black uppercase text-xl tracking-[0.5em]">Empty Queue</div>
              )}
            </div>
          </div>
        )}

        {/* 4. Extensions Board */}
        {activeTab === 'extensions' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
              <h2 className="text-4xl font-black dark:text-white tracking-tighter">Asset Directory</h2>
              {!isEditingExt && <button onClick={() => { setExtFormData({ downloads: 0, rating: 5 }); setIsEditingExt(true); }} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">+ Register Tool</button>}
            </header>

            {!isEditingExt ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {extensions.map(ext => (
                  <div key={ext.id} className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] border dark:border-slate-800 shadow-sm flex flex-col group hover:shadow-2xl transition-all duration-500">
                    <div className="text-5xl mb-6 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl w-fit group-hover:scale-110 transition-transform duration-500 shadow-sm">{ext.icon || '🧩'}</div>
                    <h3 className="text-2xl font-black dark:text-white tracking-tight mb-2 leading-tight">{ext.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">{ext.category}</p>
                    <p className="text-xs text-slate-500 font-medium mb-8 flex-grow line-clamp-3 leading-relaxed">{ext.description}</p>
                    <div className="flex gap-2">
                       <button onClick={() => { setExtFormData(ext); setIsEditingExt(true); }} className="flex-grow py-4 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Edit</button>
                       <button onClick={() => setExtensions(extensions.filter(x => x.id !== ext.id))} className="w-14 h-14 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl flex items-center justify-center text-xl hover:bg-rose-500 hover:text-white transition-all">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border dark:border-slate-800 space-y-10 shadow-2xl animate-in slide-in-from-bottom-10">
                 <h3 className="text-3xl font-black dark:text-white tracking-tighter">Directory Registry</h3>
                 <div className="grid grid-cols-2 gap-8">
                    <input className="p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-3xl outline-none font-bold shadow-inner" placeholder="Extension Name" value={extFormData.name || ''} onChange={e => setExtFormData({...extFormData, name: e.target.value})} />
                    <input className="p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-3xl outline-none font-bold text-center text-4xl shadow-inner" placeholder="Icon" value={extFormData.icon || ''} onChange={e => setExtFormData({...extFormData, icon: e.target.value})} />
                    <input className="p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-3xl outline-none font-bold shadow-inner" placeholder="Category" value={extFormData.category || ''} onChange={e => setExtFormData({...extFormData, category: e.target.value})} />
                    <input className="p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-3xl outline-none font-bold shadow-inner" placeholder="Chrome/Store URL" value={extFormData.storeUrl || ''} onChange={e => setExtFormData({...extFormData, storeUrl: e.target.value})} />
                 </div>
                 <textarea className="w-full p-8 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[2rem] outline-none font-bold h-32 shadow-inner" placeholder="Brief Description..." value={extFormData.description || ''} onChange={e => setExtFormData({...extFormData, description: e.target.value})} />
                 <div className="flex gap-4">
                    <button onClick={() => {
                        const newExt: Extension = { id: extFormData.id || `ext-${Date.now()}`, name: extFormData.name || '', description: extFormData.description || '', category: extFormData.category || 'General', rating: 5, downloads: extFormData.downloads || 0, icon: extFormData.icon, storeUrl: extFormData.storeUrl };
                        if (extFormData.id) setExtensions(extensions.map(e => e.id === extFormData.id ? newExt : e));
                        else setExtensions([newExt, ...extensions]);
                        setIsEditingExt(false);
                    }} className="flex-grow py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Authorize Registry</button>
                    <button onClick={() => setIsEditingExt(false)} className="px-10 py-6 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-3xl font-black uppercase tracking-widest text-xs">Discard</button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Analytics (REAL DATA ONLY) */}
        {activeTab === 'analytics' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <header><h2 className="text-4xl font-black dark:text-white tracking-tighter">Engagement Intelligence</h2></header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] border dark:border-slate-800 shadow-sm flex flex-col">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-10">Top Impact Insights</h4>
                 <div className="space-y-6 flex-grow">
                    {posts.sort((a,b)=>(b.views||0)-(a.views||0)).slice(0, 6).map((p,i)=>(
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4 truncate">
                          <span className="text-slate-300 font-black text-xs">0{i+1}</span>
                          <span className="text-xs font-black truncate max-w-[150px] dark:text-white">{p.title}</span>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">{(p.views||0).toLocaleString()}</span>
                      </div>
                    ))}
                 </div>
               </div>
               <div className="md:col-span-2 p-10 bg-white dark:bg-slate-900 rounded-[3rem] border dark:border-slate-800 shadow-sm h-[32rem]">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-10">Historical View Distribution (Real)</h4>
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={realAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                      <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 900}} stroke={darkMode ? '#475569' : '#cbd5e1'} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '20px', border:'none', fontWeight:'900', background: darkMode ? '#0f172a' : '#fff'}} />
                      <Bar dataKey="views" fill="#4f46e5" radius={[15, 15, 0, 0]} barSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {/* 6. Settings (Database & SEO) */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-12 animate-in fade-in duration-500">
            <header>
              <h2 className="text-4xl font-black dark:text-white tracking-tighter">System Continuity</h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Global infrastructure & state recovery</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border dark:border-slate-800 shadow-sm space-y-10">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm">🛡️</div>
                <h3 className="text-2xl font-black dark:text-white tracking-tight leading-tight">Master Database Management</h3>
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={exportData} className="py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition-all">Export JSON Master</button>
                  <button onClick={() => fileInputRef.current?.click()} className="py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Import State Restore</button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border dark:border-slate-800 shadow-sm space-y-10">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/10 text-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm">🚀</div>
                <h3 className="text-2xl font-black dark:text-white tracking-tight leading-tight">SEO Cloud Engineering</h3>
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={generateSitemap} className="py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Generate Sitemap.xml</button>
                  <button onClick={() => downloadFile(`User-agent: *\nAllow: /\nSitemap: ${window.location.origin}/sitemap.xml`, 'robots.txt', 'text/plain')} className="py-5 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Robots.txt Engine</button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-indigo-600 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000"></div>
               <div className="relative z-10 flex justify-between items-center">
                 <div>
                   <h4 className="text-3xl font-black tracking-tighter mb-2">Core Status: Stable</h4>
                   <p className="text-xs font-bold uppercase tracking-widest opacity-60">Production Environment v4.7.0</p>
                 </div>
                 <div className="text-right">
                    <p className="text-4xl font-black">SYNCED</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">No Latency Detected</p>
                 </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
