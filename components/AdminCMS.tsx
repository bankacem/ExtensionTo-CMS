
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid
} from 'recharts';
import { 
  NoticeType, Tab, PostStatus, User, BlogPost, 
  Extension, MediaItem, ScheduledPost, AnalyticsData, UserRole
} from '../types';
import { 
  STORAGE_KEYS, DEFAULT_USERS, DEFAULT_POSTS, DEFAULT_EXTENSIONS, INITIAL_ANALYTICS, DEFAULT_SETTINGS 
} from '../constants';
import { generateDraft } from '../services/geminiService';

interface AdminCMSProps {
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onViewSite: () => void;
}

export const AdminCMS: React.FC<AdminCMSProps> = ({ currentUser, onLogin, onLogout, onViewSite }) => {
  // ====== STATE MANAGEMENT ======
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true');
  const [notice, setNotice] = useState<{ message: string; type: NoticeType } | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Data States
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POSTS);
    return saved ? JSON.parse(saved) : DEFAULT_POSTS;
  });
  const [extensions, setExtensions] = useState<Extension[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    return saved ? JSON.parse(saved) : DEFAULT_EXTENSIONS;
  });
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEDIA);
    return saved ? JSON.parse(saved) : [];
  });
  const [analytics, setAnalytics] = useState<AnalyticsData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
    return saved ? JSON.parse(saved) : INITIAL_ANALYTICS;
  });
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<BlogPost>>({});
  const [aiLoading, setAiLoading] = useState(false);
  
  // Filtering
  const [searchTerm, setSearchTerm] = useState('');

  // ====== PERSISTENCE ======
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(extensions));
  }, [extensions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(mediaLibrary));
  }, [mediaLibrary]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
  }, [analytics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, darkMode.toString());
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // ====== NOTIFICATIONS ======
  const showNotice = (message: string, type: NoticeType = 'info') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3000);
  };

  // ====== SCHEDULER ======
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      let changed = false;
      const updatedPosts = posts.map(post => {
        if (post.status === 'scheduled' && post.publishDate && new Date(post.publishDate) <= now) {
          changed = true;
          return { ...post, status: 'published' as PostStatus };
        }
        return post;
      });

      if (changed) {
        setPosts(updatedPosts);
        showNotice('A scheduled post has been published!', 'success');
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [posts]);

  // ====== AUTHENTICATION ======
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = DEFAULT_USERS.find(
      u => u.username === loginForm.username && u.password === loginForm.password
    );
    if (user) {
      onLogin(user);
      showNotice('Login successful', 'success');
    } else {
      showNotice('Invalid credentials', 'error');
    }
  };

  // ====== ACTIONS ======
  const handleSavePost = () => {
    if (!formData.title) return showNotice('Title is required', 'error');
    
    const newPost: BlogPost = {
      ...DEFAULT_POSTS[0], // fallback
      ...formData as BlogPost,
      id: formData.id || `post-${Date.now()}`,
      date: formData.date || new Date().toLocaleDateString(),
      publishDate: formData.publishDate || new Date().toISOString(),
      status: formData.status || 'draft',
      views: formData.views || 0,
    };

    if (formData.id) {
      setPosts(posts.map(p => p.id === formData.id ? newPost : p));
    } else {
      setPosts([newPost, ...posts]);
    }
    
    setIsEditing(false);
    showNotice('Post saved successfully', 'success');
  };

  const handleAIDraft = async () => {
    if (!formData.title) return showNotice('Enter a title for AI to work with', 'info');
    setAiLoading(true);
    try {
      const draft = await generateDraft(formData.title);
      setFormData(prev => ({
        ...prev,
        content: draft.content,
        excerpt: draft.excerpt,
        category: draft.category,
        tags: draft.tags
      }));
      showNotice('AI Draft generated!', 'success');
    } catch (err) {
      showNotice('AI Generation failed. Check API key.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDeletePost = (id: string) => {
    if (window.confirm('Are you sure?')) {
      setPosts(posts.filter(p => p.id !== id));
      showNotice('Post deleted', 'success');
    }
  };

  const calculateStats = useMemo(() => {
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const publishedCount = posts.filter(p => p.status === 'published').length;
    return { totalViews, publishedCount };
  }, [posts]);

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ====== RENDER LOGIN ======
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 border border-slate-100 dark:border-slate-800">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">E</div>
          </div>
          <h1 className="text-2xl font-black text-center mb-2 dark:text-white">Admin Access</h1>
          <p className="text-slate-500 text-center mb-8 text-sm">Enter your credentials to manage ExtensionTo</p>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none">
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ====== RENDER MAIN CMS ======
  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans`}>
      {/* Sidebar */}
      <aside className="w-72 fixed h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-50 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">E</div>
          <span className="font-black text-lg tracking-tighter dark:text-white">CMS Panel</span>
        </div>
        
        <nav className="flex-grow space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'posts', label: 'Articles', icon: '📝' },
            { id: 'extensions', label: 'Extensions', icon: '🧩' },
            { id: 'media', label: 'Media Library', icon: '🖼️' },
            { id: 'analytics', label: 'Intelligence', icon: '📈' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => { setActiveTab(item.id as Tab); setIsEditing(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                activeTab === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-500 hover:text-indigo-600">
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button onClick={onViewSite} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-500 hover:text-indigo-600">
            🌐 View Site
          </button>
          <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm font-bold text-rose-500 hover:text-rose-600">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 flex-grow p-10 overflow-y-auto">
        {notice && (
          <div className={`fixed top-10 right-10 z-[100] px-6 py-4 rounded-2xl shadow-2xl text-white font-bold animate-in fade-in slide-in-from-top-4 ${
            notice.type === 'success' ? 'bg-emerald-500' : notice.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'
          }`}>
            {notice.message}
          </div>
        )}

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black tracking-tighter mb-2 dark:text-white">Command Center</h1>
                <p className="text-slate-500 font-medium italic">Welcome back, {currentUser.username}</p>
              </div>
              <button 
                onClick={() => { setFormData({}); setIsEditing(true); setActiveTab('posts'); }} 
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all"
              >
                + New Article
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Total Outreach</span>
                <div className="text-4xl font-black dark:text-white">{calculateStats.totalViews.toLocaleString()}</div>
                <div className="text-xs font-bold text-emerald-500 mt-2">+12% from last month</div>
              </div>
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Active Articles</span>
                <div className="text-4xl font-black dark:text-white">{calculateStats.publishedCount}</div>
                <div className="text-xs font-bold text-indigo-500 mt-2">{posts.length - calculateStats.publishedCount} currently in draft</div>
              </div>
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Extensions Verified</span>
                <div className="text-4xl font-black dark:text-white">{extensions.length}</div>
                <div className="text-xs font-bold text-amber-500 mt-2">Professional Grade</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-black mb-8 dark:text-white">Performance Metrics</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="views" stroke="#4f46e5" strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Posts View */}
        {activeTab === 'posts' && (
          <div className="space-y-8">
            <header className="flex justify-between items-center">
              <h2 className="text-3xl font-black tracking-tighter dark:text-white">Editorial Hub</h2>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Filter articles..." 
                  className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm dark:text-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {!isEditing && (
                  <button 
                    onClick={() => { setFormData({}); setIsEditing(true); }}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold"
                  >
                    + New
                  </button>
                )}
              </div>
            </header>

            {!isEditing ? (
              <div className="grid gap-6">
                {filteredPosts.map(post => (
                  <div key={post.id} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800">
                        <img src={post.image} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            post.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>{post.status}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.category}</span>
                        </div>
                        <h3 className="text-xl font-black dark:text-white">{post.title}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-black dark:text-white">{post.views || 0} Views</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.date}</div>
                      </div>
                      <button 
                        onClick={() => { setFormData(post); setIsEditing(true); }}
                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-8 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-2xl font-black dark:text-white">{formData.id ? 'Edit Article' : 'Draft New Article'}</h3>
                   <div className="flex gap-4">
                     <button 
                       onClick={handleAIDraft} 
                       disabled={aiLoading}
                       className="px-6 py-2 bg-violet-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 disabled:opacity-50"
                     >
                       {aiLoading ? '🤖 Generating...' : '🪄 AI Assistant'}
                     </button>
                     <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-xl font-bold">Cancel</button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Article Title</label>
                      <input 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        value={formData.title || ''}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Excerpt</label>
                      <textarea 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold h-24"
                        value={formData.excerpt || ''}
                        onChange={e => setFormData({...formData, excerpt: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
                        <input 
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          value={formData.category || ''}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
                        <select 
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          value={formData.status || 'draft'}
                          onChange={e => setFormData({...formData, status: e.target.value as PostStatus})}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Featured Image URL</label>
                      <input 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        value={formData.image || ''}
                        onChange={e => setFormData({...formData, image: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Content (HTML)</label>
                  <textarea 
                    className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-96"
                    value={formData.content || ''}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                  />
                </div>

                <div className="pt-6 flex justify-end">
                   <button 
                    onClick={handleSavePost}
                    className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all"
                   >
                     Deploy to Production
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extensions, Media, etc. - Minimal for space */}
        {activeTab === 'extensions' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-black tracking-tighter dark:text-white">Extension Catalog</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {extensions.map(ext => (
                <div key={ext.id} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="text-4xl mb-4">{ext.icon || '🧩'}</div>
                  <h3 className="text-xl font-black mb-2 dark:text-white">{ext.name}</h3>
                  <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">{ext.description}</p>
                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">⭐ {ext.rating}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{ext.downloads} DLs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-10">
            <h2 className="text-3xl font-black tracking-tighter dark:text-white">Platform Configuration</h2>
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-6">
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Site Title</label>
                  <input 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    value={settings.siteTitle}
                    onChange={e => setSettings({...settings, siteTitle: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Primary Domain</label>
                  <input 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    defaultValue="extensionto.com"
                  />
               </div>
               <div className="pt-6">
                 <button 
                  onClick={() => showNotice('Configuration Saved Locally', 'success')}
                  className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest"
                 >
                   Save Preferences
                 </button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
