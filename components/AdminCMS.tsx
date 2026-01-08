import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LineChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Bar, ResponsiveContainer } from 'recharts';
import { 
  NoticeType, Tab, PostStatus, User, BlogPost, 
  Extension, MediaItem, CMSPage, SEOSettings
} from '../types.ts';
import { 
  STORAGE_KEYS, DEFAULT_USERS, DEFAULT_POSTS, DEFAULT_EXTENSIONS, DEFAULT_PAGES, DEFAULT_SEO_SETTINGS
} from '../constants.ts';
import { generateDraft, analyzeSEO, optimizeRobotsTxt } from '../services/geminiService.ts';
import { api } from '../services/apiService.ts';

interface AdminCMSProps {
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onViewSite: () => void;
}

const createSlug = (text: string) => {
  if (!text) return '';
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0621-\u064A\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');      
};

const formatForDateTimeInput = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch (e) {
    return '';
  }
};

export const AdminCMS: React.FC<AdminCMSProps> = ({ currentUser, onLogin, onLogout, onViewSite }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [notice, setNotice] = useState<{ message: string; type: NoticeType } | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [seoSettings, setSeoSettings] = useState<SEOSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SEO);
    return saved ? JSON.parse(saved) : DEFAULT_SEO_SETTINGS;
  });

  // --- CLOUD DATABASE ---
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Static Local Storage (Extensions/Pages)
  const [extensions, setExtensions] = useState<Extension[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    return saved ? JSON.parse(saved) : DEFAULT_EXTENSIONS;
  });
  const [pages, setPages] = useState<CMSPage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAGES);
    return saved ? JSON.parse(saved) : DEFAULT_PAGES;
  });

  // Sync Cloud Content
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminPosts();
      setPosts(data);
    } catch (err) {
      showNotice('Sync Error', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchPosts();
    }
  }, [currentUser, fetchPosts]);

  // --- EDITOR STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<BlogPost>>({});
  const [isEditingExt, setIsEditingExt] = useState(false);
  const [extFormData, setExtFormData] = useState<Partial<Extension>>({});

  const showNotice = useCallback((message: string, type: NoticeType = 'info') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SEO, JSON.stringify(seoSettings)); }, [seoSettings]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(extensions)); }, [extensions]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(pages)); }, [pages]);

  // --- ACTIONS ---
  const handleAiDraft = async () => {
    if (!formData.title) return showNotice('Headline needed for AI', 'error');
    setIsAiLoading(true);
    try {
      const draft = await generateDraft(formData.title);
      setFormData(prev => ({ ...prev, ...draft }));
      showNotice('AI Draft Generated', 'success');
    } catch (e) {
      showNotice('AI Service Error', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSavePost = async () => {
    if (!formData.title) return showNotice('Title required', 'error');
    const isNew = !formData.id;
    const newPost: BlogPost = {
      ...DEFAULT_POSTS[0],
      ...formData as BlogPost,
      id: formData.id || `post-${Date.now()}`,
      slug: formData.slug || createSlug(formData.title || ''),
      publishDate: formData.publishDate || new Date().toISOString(),
      status: formData.status || 'published'
    };

    try {
      await api.savePost(newPost, isNew);
      await fetchPosts(); // Refresh from cloud
      setIsEditing(false);
      showNotice('Cloud Synchronized', 'success');
    } catch (err) {
      showNotice('Cloud Sync Failed', 'error');
    }
  };

  const handleSaveExtension = () => {
    if (!extFormData.name) return showNotice('Name required', 'error');
    const newExt: Extension = {
      id: extFormData.id || `ext-${Date.now()}`,
      name: extFormData.name,
      description: extFormData.description || '',
      category: extFormData.category || 'Utility',
      rating: extFormData.rating || 5,
      downloads: extFormData.downloads || 0,
      icon: extFormData.icon || '🧩',
      storeUrl: extFormData.storeUrl || '',
      featured: extFormData.featured || false
    };
    if (extFormData.id) setExtensions(prev => prev.map(e => e.id === extFormData.id ? newExt : e));
    else setExtensions(prev => [newExt, ...prev]);
    setIsEditingExt(false);
    showNotice('Asset Synchronized', 'success');
  };

  const handleExportData = () => {
    try {
      const data = { posts, extensions, pages, timestamp: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extensionto_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotice('Data Vault Exported', 'success');
    } catch (err) {
      showNotice('Export Failed', 'error');
    }
  };

  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);

        if (json.posts && Array.isArray(json.posts)) {
          showNotice('Syncing backup to D1 Cloud...', 'info');
          const existingCloudIds = new Set(posts.map(p => p.id));
          const postsToRestore: BlogPost[] = json.posts;

          const syncPromises = postsToRestore.map(post => {
            const isExisting = existingCloudIds.has(post.id);
            return api.savePost(post, !isExisting);
          });

          await Promise.all(syncPromises);
          await fetchPosts();
        }

        if (json.extensions) setExtensions(json.extensions);
        if (json.pages) setPages(json.pages);
        showNotice('Recovery Point Restored & Synced', 'success');
      } catch (err) {
        showNotice('Invalid Restoration File or Sync Failed', 'error');
        console.error("Restore failed:", err);
      }
    };
    reader.readAsText(file);
  };


  const scheduledPosts = useMemo(() => 
    posts.filter(p => p.status === 'scheduled').sort((a,b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime())
  , [posts]);

  const analyticsDummyData = {
    views: Array.from({ length: 30 }, (_, i) => ({
      date: `Day ${i + 1}`,
      views: Math.floor(Math.random() * 500) + 200 + i * 20,
    })),
    topPosts: posts.slice(0, 5).map(p => ({
      name: p.title.substring(0, 20) + '...',
      views: p.views || Math.floor(Math.random() * 1000) + 500
    })).sort((a,b) => b.views - a.views),
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e14] p-6">
        <div className="w-full max-w-md bg-[#161b22] rounded-[2.5rem] border border-[#1f2937] p-12 shadow-2xl">
          <div className="flex justify-center mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-lg">E</div>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const user = DEFAULT_USERS.find(u => u.username === loginForm.username && u.password === loginForm.password);
            if (user) onLogin(user); else showNotice('Access Denied', 'error');
          }} className="space-y-6">
            <input type="text" placeholder="TERMINAL ID" className="w-full px-6 py-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl text-white font-bold outline-none focus:border-indigo-500" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="SECURITY KEY" className="w-full px-6 py-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl text-white font-bold outline-none focus:border-indigo-500" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all">Establish Link</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0b0e14] text-white">
      <input type="file" ref={fileInputRef} onChange={handleRestoreData} accept=".json" className="hidden" />

      {/* SIDEBAR */}
      <aside className="w-64 fixed h-full bg-[#0b0e14] border-r border-[#1f2937] flex flex-col p-6 z-50">
        <div className="flex items-center gap-4 mb-14 px-2 cursor-pointer" onClick={onViewSite}>
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-base shadow-[0_0_20px_rgba(79,70,229,0.4)]">E</div>
          <span className="font-black text-lg tracking-tight">Editorial Hub</span>
        </div>
        <nav className="flex-grow space-y-1">
          {[
            { id: 'dashboard', label: 'OVERVIEW', icon: '📊' },
            { id: 'posts', label: 'EDITORIAL', icon: '📄' },
            { id: 'scheduler', label: 'QUEUE', icon: '⏰' },
            { id: 'extensions', label: 'ASSETS', icon: '🧩' },
            { id: 'analytics', label: 'IMPACT', icon: '📈' },
            { id: 'settings', label: 'SYSTEM', icon: '⚙️' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id as Tab); setIsEditing(false); setIsEditingExt(false); }} 
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-extrabold text-[10px] tracking-widest transition-all ${activeTab === item.id ? 'bg-[#4f46e5] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="text-xs">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3 px-2">
          <button onClick={onLogout} className="flex items-center gap-3 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors">
            <span className="text-xs">🚪</span> EXIT
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-64 flex-grow p-12 overflow-y-auto">
        {notice && (
          <div className="fixed top-8 right-8 z-[100] px-8 py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl animate-bounce">
            {notice.message}
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-1">System Metrics</h1>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">D1 CLOUD MONITORING</span>
            </div>
            {isLoading ? (
              <div className="animate-pulse flex gap-6">
                 <div className="h-32 flex-grow bg-slate-800 rounded-3xl"></div>
                 <div className="h-32 flex-grow bg-slate-800 rounded-3xl"></div>
                 <div className="h-32 flex-grow bg-slate-800 rounded-3xl"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'IMPRESSIONS', val: '0', color: 'text-white' },
                  { label: 'CLOUD ARTICLES', val: posts.length, color: 'text-indigo-400' },
                  { label: 'LIVE ASSETS', val: extensions.length, color: 'text-emerald-400' },
                  { label: 'PENDING SYNC', val: scheduledPosts.length, color: 'text-amber-400' }
                ].map((stat, i) => (
                  <div key={i} className="bg-[#161b22] p-8 rounded-[2rem] border border-[#1f2937] hover:border-indigo-500 transition-colors">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                    <div className={`text-3xl font-black mt-2 ${stat.color}`}>{stat.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EDITORIAL */}
        {activeTab === 'posts' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-black tracking-tight">Knowledge Base</h1>
              {!isEditing && <button onClick={() => { setFormData({}); setIsEditing(true); }} className="px-6 py-3 bg-[#4f46e5] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20">+ COMPOSE INTEL</button>}
            </div>

            {!isEditing ? (
              <div className="space-y-6">
                <input type="text" placeholder="Filter insights..." className="w-full px-6 py-5 bg-[#161b22] border border-[#1f2937] rounded-2xl outline-none font-bold text-slate-400 focus:border-indigo-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-20 text-slate-600 font-black uppercase tracking-widest text-xs">SYNCHRONIZING WITH D1 CLOUD...</div>
                  ) : posts.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                    <div key={p.id} className="bg-[#161b22] p-4 rounded-2xl border border-[#1f2937] flex items-center gap-6 group hover:border-indigo-500 transition-all">
                      <img src={p.image} className="w-11 h-11 rounded-lg object-cover bg-slate-800 shadow-lg" />
                      <div className="flex-grow">
                        <h3 className="font-black uppercase text-sm tracking-tight leading-tight">{p.title}</h3>
                        <p className="text-[8px] font-black text-slate-500 uppercase mt-1.5">
                          {p.status === 'scheduled' ? '🗓️ ' + new Date(p.publishDate).toLocaleString() : '✅ LIVE'} • {p.category}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setFormData(p); setIsEditing(true); }} className="w-7 h-7 bg-[#0b0e14] border border-[#1f2937] rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all text-xs">✏️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#161b22] p-12 rounded-[3rem] border border-[#1f2937] space-y-12">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black tracking-tight">Composition Hub</h2>
                  <div className="flex gap-3">
                    <button onClick={handleAiDraft} disabled={isAiLoading} className="px-6 py-3 bg-[#4f46e5] rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50">
                      {isAiLoading ? 'GENERATING...' : '🪄 AI ASSISTANT'}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-[#0b0e14] border border-[#1f2937] rounded-xl font-black text-[10px] uppercase tracking-widest">DISCARD</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <input className="w-full p-5 bg-[#0b0e14] border border-[#1f2937] rounded-xl outline-none font-black text-xl" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Headline" />
                  <select className="w-full p-5 bg-[#0b0e14] border border-[#1f2937] rounded-xl outline-none font-black text-xs" value={formData.status || 'draft'} onChange={e => setFormData({...formData, status: e.target.value as PostStatus})}>
                    <option value="draft">DRAFT</option>
                    <option value="published">PUBLISHED</option>
                    <option value="scheduled">SCHEDULED</option>
                  </select>
                  {formData.status === 'scheduled' && (
                    <input type="datetime-local" className="w-full p-5 bg-[#0b0e14] border border-indigo-500/30 rounded-xl outline-none font-black text-xs" value={formatForDateTimeInput(formData.publishDate)} onChange={e => setFormData({...formData, publishDate: new Date(e.target.value).toISOString()})} />
                  )}
                </div>
                <textarea className="w-full p-10 bg-[#0b0e14] border border-[#1f2937] rounded-[2.5rem] h-[500px] font-mono text-sm leading-relaxed" value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="HTML Content..." />
                <button onClick={handleSavePost} className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl">COMMIT TO D1 CLOUD</button>
              </div>
            )}
          </div>
        )}

        {/* SCHEDULER */}
        {activeTab === 'scheduler' && (
          <div className="space-y-10">
            <h1 className="text-4xl font-black tracking-tight">Publishing Queue</h1>
            <div className="bg-[#161b22] p-8 rounded-[2rem] border border-[#1f2937]">
              {scheduledPosts.length > 0 ? (
                <div className="space-y-4">
                  {scheduledPosts.map(p => (
                    <div key={p.id} className="p-4 rounded-xl bg-[#0b0e14] border border-[#1f2937] flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{p.title}</h3>
                        <p className="text-xs text-slate-400">Scheduled for: {new Date(p.publishDate).toLocaleString()}</p>
                      </div>
                      <span className="text-sm font-black text-amber-400">PENDING</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-10">No articles in the queue.</p>
              )}
            </div>
          </div>
        )}
        
        {/* EXTENSIONS (ASSETS) */}
        {activeTab === 'extensions' && (
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-black tracking-tight">Cloud Assets</h1>
              {!isEditingExt && <button onClick={() => { setExtFormData({}); setIsEditingExt(true); }} className="px-6 py-3 bg-[#4f46e5] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20">+ ADD ASSET</button>}
            </div>

            {!isEditingExt ? (
              <div className="space-y-4">
                {extensions.map(ext => (
                  <div key={ext.id} className="bg-[#161b22] p-4 rounded-2xl border border-[#1f2937] flex items-center gap-6 group hover:border-indigo-500 transition-all">
                    <div className="w-11 h-11 rounded-lg bg-slate-800 text-2xl flex items-center justify-center">{ext.icon}</div>
                    <div className="flex-grow">
                      <h3 className="font-black uppercase text-sm tracking-tight">{ext.name}</h3>
                      <p className="text-[8px] font-black text-slate-500 uppercase mt-1.5">{ext.category}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setExtFormData(ext); setIsEditingExt(true); }} className="w-7 h-7 bg-[#0b0e14] border border-[#1f2937] rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all text-xs">✏️</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#161b22] p-12 rounded-[3rem] border border-[#1f2937] space-y-8">
                <h2 className="text-3xl font-black tracking-tight">Asset Editor</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input className="w-full p-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl outline-none font-bold" value={extFormData.name || ''} onChange={e => setExtFormData({...extFormData, name: e.target.value})} placeholder="Asset Name" />
                  <input className="w-full p-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl outline-none font-bold" value={extFormData.category || ''} onChange={e => setExtFormData({...extFormData, category: e.target.value})} placeholder="Category" />
                  <input className="w-full p-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl outline-none font-bold" value={extFormData.icon || ''} onChange={e => setExtFormData({...extFormData, icon: e.target.value})} placeholder="Emoji Icon (e.g., 🧩)" />
                  <input type="number" className="w-full p-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl outline-none font-bold" value={extFormData.rating || ''} onChange={e => setExtFormData({...extFormData, rating: parseFloat(e.target.value)})} placeholder="Rating (0-5)" />
                  <input type="number" className="w-full p-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl outline-none font-bold" value={extFormData.downloads || ''} onChange={e => setExtFormData({...extFormData, downloads: parseInt(e.target.value)})} placeholder="Downloads" />
                  <input className="w-full p-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl outline-none font-bold col-span-2" value={extFormData.storeUrl || ''} onChange={e => setExtFormData({...extFormData, storeUrl: e.target.value})} placeholder="Store URL" />
                </div>
                <textarea className="w-full p-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl h-32" value={extFormData.description || ''} onChange={e => setExtFormData({...extFormData, description: e.target.value})} placeholder="Description" />
                <div className="flex items-center gap-4">
                  <input type="checkbox" id="featured" checked={extFormData.featured || false} onChange={e => setExtFormData({...extFormData, featured: e.target.checked})} />
                  <label htmlFor="featured" className="font-bold text-sm">Featured Asset</label>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleSaveExtension} className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Save Asset</button>
                  <button onClick={() => setIsEditingExt(false)} className="px-8 py-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-1">Impact Analysis</h1>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">PERFORMANCE METRICS</span>
            </div>
            <div className="bg-[#161b22] p-8 rounded-[2rem] border border-[#1f2937]">
              <h3 className="font-black mb-6">SITE VIEWS (LAST 30 DAYS)</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={analyticsDummyData.views}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#0b0e14', border: '1px solid #1f2937' }} />
                    <Line type="monotone" dataKey="views" stroke="#4f46e5" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-[#161b22] p-8 rounded-[2rem] border border-[#1f2937]">
              <h3 className="font-black mb-6">TOP CONTENT</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={analyticsDummyData.topPosts} layout="vertical">
                     <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={150} tick={{ fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0b0e14', border: '1px solid #1f2937' }} />
                    <Bar dataKey="views" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-1">System Configuration</h1>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">CORE OPERATIONS</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#161b22] p-8 rounded-[2rem] border border-[#1f2937] space-y-6">
                <h3 className="font-black text-lg">Data Vault</h3>
                <p className="text-sm text-slate-400">Export a full backup of all content or restore from a previous backup file.</p>
                <div className="flex gap-4">
                  <button onClick={handleExportData} className="px-6 py-3 bg-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Export Backup</button>
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-[#0b0e14] border border-[#1f2937] rounded-xl font-black text-[10px] uppercase tracking-widest">Restore from Backup</button>
                </div>
              </div>
              <div className="bg-[#161b22] p-8 rounded-[2rem] border border-[#1f2937] space-y-6">
                <h3 className="font-black text-lg">SEO Engine</h3>
                <p className="text-sm text-slate-400">Manage your robots.txt file. Use AI to generate an optimized configuration based on your site's needs.</p>
                <textarea
                  className="w-full p-4 bg-[#0b0e14] border border-[#1f2937] rounded-xl h-40 font-mono text-xs"
                  value={seoSettings.robotsTxt}
                  onChange={(e) => setSeoSettings(prev => ({ ...prev, robotsTxt: e.target.value }))}
                />
                <button 
                  onClick={async () => {
                    setIsAiLoading(true);
                    try {
                      const optimized = await optimizeRobotsTxt("A professional directory for browser extensions and tech articles.");
                      if (optimized) {
                        setSeoSettings(prev => ({...prev, robotsTxt: optimized}));
                        showNotice('Robots.txt Optimized', 'success');
                      } else {
                        showNotice('AI Optimization Failed', 'error');
                      }
                    } catch (e) {
                      showNotice('AI Service Error', 'error');
                    } finally {
                      setIsAiLoading(false);
                    }
                  }}
                  disabled={isAiLoading}
                  className="px-6 py-3 bg-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  {isAiLoading ? 'OPTIMIZING...' : '🪄 Optimize with AI'}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </main>
    </div>
  );
};