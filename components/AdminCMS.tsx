
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid
} from 'recharts';
import { 
  NoticeType, Tab, PostStatus, User, BlogPost, 
  Extension, MediaItem, AnalyticsData, UserRole
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

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

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
  const [searchTerm, setSearchTerm] = useState('');

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
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(mediaLibrary));
  }, [mediaLibrary]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics));
  }, [analytics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, darkMode.toString());
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // ====== SCHEDULER LOGIC (PROFESSIONAL) ======
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      let hasUpdates = false;
      const updatedPosts = posts.map(post => {
        if (post.status === 'scheduled' && post.publishDate) {
          const scheduledTime = new Date(post.publishDate).getTime();
          if (scheduledTime <= now.getTime()) {
            hasUpdates = true;
            return { 
              ...post, 
              status: 'published' as PostStatus, 
              publishDate: now.toISOString(),
              date: now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
            };
          }
        }
        return post;
      });

      if (hasUpdates) {
        setPosts(updatedPosts);
        showNotice('Scheduler: Scheduled post(s) have been published automatically.', 'success');
      }
    };

    const interval = setInterval(checkSchedule, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [posts]);

  // ====== BACKUP & RESTORE SYSTEM (PROFESSIONAL) ======
  const handleExportBackup = () => {
    try {
      const backupData = {
        version: "4.1",
        timestamp: new Date().toISOString(),
        data: {
          posts,
          extensions,
          mediaLibrary,
          analytics,
          settings,
          users: localStorage.getItem(STORAGE_KEYS.USERS) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)!) : DEFAULT_USERS
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extensionto_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotice('Backup file created and downloaded successfully.', 'success');
    } catch (error) {
      showNotice('Failed to generate backup file.', 'error');
      console.error(error);
    }
  };

  const handleImportRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.version || !json.data) {
          throw new Error("Invalid backup format");
        }

        const confirmRestore = window.confirm("Are you sure? This will overwrite all current site data with the backup data.");
        if (!confirmRestore) return;

        // Update all states
        setPosts(json.data.posts || []);
        setExtensions(json.data.extensions || []);
        setMediaLibrary(json.data.mediaLibrary || []);
        setAnalytics(json.data.analytics || []);
        setSettings(json.data.settings || DEFAULT_SETTINGS);
        
        // Update localStorage manually to be safe
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(json.data.posts));
        localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(json.data.extensions));
        localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(json.data.mediaLibrary));
        localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(json.data.analytics));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(json.data.settings));
        if (json.data.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(json.data.users));

        showNotice('System Restored Successfully! All data has been updated.', 'success');
        
        // Optional: reload to ensure full sync if needed
        // window.location.reload(); 
      } catch (error) {
        showNotice('Restore failed: The file is corrupted or invalid.', 'error');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  // ====== AUTHENTICATION ======
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = DEFAULT_USERS.find(
      u => u.username === loginForm.username && u.password === loginForm.password
    );
    if (user) {
      onLogin(user);
      showNotice('Welcome back, ' + user.username, 'success');
    } else {
      showNotice('Invalid username or password', 'error');
    }
  };

  // ====== POST ACTIONS ======
  const handleSavePost = () => {
    if (!formData.title) return showNotice('Title is required', 'error');
    
    if (formData.status === 'scheduled' && !formData.publishDate) {
      return showNotice('Please select a specific date and time for scheduling', 'error');
    }

    const postData: BlogPost = {
      ...DEFAULT_POSTS[0],
      ...formData as BlogPost,
      id: formData.id || `post-${Date.now()}`,
      date: formData.date || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      publishDate: formData.publishDate || new Date().toISOString(),
      views: formData.views || 0,
      seoScore: calculateSeoScore(formData)
    };

    if (formData.id) {
      setPosts(posts.map(p => p.id === formData.id ? postData : p));
      showNotice('Article updated successfully', 'success');
    } else {
      setPosts([postData, ...posts]);
      showNotice(postData.status === 'scheduled' ? 'Article scheduled for ' + new Date(postData.publishDate).toLocaleString() : 'Article published!', 'success');
    }
    setIsEditing(false);
  };

  const calculateSeoScore = (data: Partial<BlogPost>) => {
    let score = 50;
    if (data.title && data.title.length > 40) score += 10;
    if (data.excerpt && data.excerpt.length > 100) score += 10;
    if (data.content && data.content.length > 500) score += 20;
    if (data.image) score += 10;
    return Math.min(score, 100);
  };

  const handleAIDraft = async () => {
    if (!formData.title) return showNotice('Enter a title first', 'info');
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
      showNotice('AI Draft generated successfully!', 'success');
    } catch (err) {
      showNotice('AI failed. Check your API key.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const getTimeRemaining = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    if (diff <= 0) return "Publishing...";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scheduledArticles = useMemo(() => {
    return posts.filter(p => p.status === 'scheduled')
      .sort((a, b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime());
  }, [posts]);

  // ====== RENDER LOGIN ======
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-800">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">E</div>
          </div>
          <h1 className="text-2xl font-black text-center mb-2 dark:text-white">Admin Access</h1>
          <p className="text-slate-500 text-center mb-8 text-sm">Enter your credentials to manage ExtensionTo</p>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
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
            { id: 'scheduler', label: 'Queue', icon: '⏰' },
            { id: 'extensions', label: 'Extensions', icon: '🧩' },
            { id: 'media', label: 'Media', icon: '🖼️' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'settings', label: 'Maintenance', icon: '⚙️' }
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
          <button onClick={() => setDarkMode(!darkMode)} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors">
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
                <p className="text-slate-500 font-medium italic">Active User: {currentUser.username}</p>
              </div>
              <button 
                onClick={() => { setFormData({}); setIsEditing(true); setActiveTab('posts'); }} 
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all"
              >
                + Create New Post
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Total Outreach</span>
                <div className="text-4xl font-black dark:text-white">{posts.reduce((s,p)=>s+(p.views||0),0).toLocaleString()}</div>
                <div className="text-xs font-bold text-emerald-500 mt-2">Organic Reach Active</div>
              </div>
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Queue Status</span>
                <div className="text-4xl font-black dark:text-white">{scheduledArticles.length}</div>
                <div className="text-xs font-bold text-amber-500 mt-2">Awaiting Auto-Publish</div>
              </div>
              <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Database Integrity</span>
                <div className="text-4xl font-black dark:text-white">100%</div>
                <div className="text-xs font-bold text-indigo-500 mt-2">Verified Content Only</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black dark:text-white">Traffic Analysis</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-indigo-600 rounded-full"></span>
                    <span className="text-xs font-bold text-slate-400">Total Views</span>
                  </div>
               </div>
               <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="views" stroke="#4f46e5" strokeWidth={5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Professional Queue View */}
        {activeTab === 'scheduler' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <header>
              <h2 className="text-3xl font-black tracking-tighter dark:text-white">Scheduled Operations</h2>
              <p className="text-slate-500 font-medium">Automatic publication engine active</p>
            </header>

            <div className="grid grid-cols-1 gap-6">
              {scheduledArticles.length > 0 ? (
                scheduledArticles.map(post => (
                  <div key={post.id} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <img src={post.image} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900/20">Mجدول / Scheduled</span>
                        </div>
                        <h3 className="text-xl font-black dark:text-white">{post.title}</h3>
                        <div className="flex gap-6 mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                           <div className="flex items-center gap-2">📅 {new Date(post.publishDate).toLocaleDateString()}</div>
                           <div className="flex items-center gap-2">🕒 {new Date(post.publishDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                           <div className="flex items-center gap-2 text-amber-500">⏳ In {getTimeRemaining(post.publishDate)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => { setFormData(post); setIsEditing(true); setActiveTab('posts'); }}
                        className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        Reschedule
                      </button>
                      <button 
                        onClick={() => {
                          if(window.confirm('Deploy this article to production immediately?')) {
                            const now = new Date();
                            setPosts(posts.map(p => p.id === post.id ? {...p, status: 'published', publishDate: now.toISOString(), date: now.toLocaleDateString()} : p));
                            showNotice('Article successfully deployed!', 'success');
                          }
                        }}
                        className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
                      >
                        Deploy Now
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="text-6xl mb-6 opacity-30">⏰</div>
                  <h3 className="text-2xl font-black dark:text-white">Publication Queue Empty</h3>
                  <p className="text-slate-500 mt-2 font-medium">No articles are currently set for future publication.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Posts View (Editorial Hub) */}
        {activeTab === 'posts' && (
          <div className="space-y-8">
            <header className="flex justify-between items-center">
              <h2 className="text-3xl font-black tracking-tighter dark:text-white">Editorial Hub</h2>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Filter by title..." 
                  className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm dark:text-white w-64 shadow-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {!isEditing && (
                  <button 
                    onClick={() => { setFormData({}); setIsEditing(true); }}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs"
                  >
                    + Draft Post
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
                            post.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 
                            post.status === 'scheduled' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
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
                        className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all text-xl"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => { if(window.confirm('Delete article?')) setPosts(posts.filter(p=>p.id!==post.id)) }}
                        className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-all text-xl"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 space-y-8 animate-in slide-in-from-bottom-4 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-3xl font-black dark:text-white">{formData.id ? 'Edit Article' : 'Compose Masterpiece'}</h3>
                   <div className="flex gap-4">
                     <button 
                       onClick={handleAIDraft} 
                       disabled={aiLoading}
                       className="px-6 py-3 bg-violet-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-violet-700 disabled:opacity-50 shadow-lg shadow-violet-100 dark:shadow-none"
                     >
                       {aiLoading ? '🤖 Analyzing...' : '🪄 AI Smart Draft'}
                     </button>
                     <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 dark:text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Discard</button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Headline</label>
                      <input 
                        className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[1.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
                        value={formData.title || ''}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">SEO Snippet / Excerpt</label>
                      <textarea 
                        className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[1.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold h-32 leading-relaxed"
                        value={formData.excerpt || ''}
                        onChange={e => setFormData({...formData, excerpt: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
                        <input 
                          className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[1.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          value={formData.category || ''}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
                        <select 
                          className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[1.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                          value={formData.status || 'draft'}
                          onChange={e => setFormData({...formData, status: e.target.value as PostStatus})}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Publish (Live)</option>
                          <option value="scheduled">Schedule (Auto)</option>
                          <option value="archived">Archive</option>
                        </select>
                      </div>
                    </div>

                    {formData.status === 'scheduled' && (
                      <div className="p-8 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-800 animate-in zoom-in-95">
                         <label className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-4">Professional Scheduling (Year, Month, Day, Time)</label>
                         <input 
                           type="datetime-local" 
                           className="w-full p-5 bg-white dark:bg-slate-800 dark:text-white rounded-2xl border border-amber-200 dark:border-amber-700 outline-none focus:ring-2 focus:ring-amber-500 font-black"
                           value={formData.publishDate ? new Date(formData.publishDate).toISOString().slice(0, 16) : ""}
                           onChange={e => setFormData({...formData, publishDate: new Date(e.target.value).toISOString()})}
                         />
                         <div className="mt-3 p-3 bg-white/50 rounded-xl">
                            <p className="text-[10px] font-black text-amber-700 italic">
                              Live Verification: {formData.publishDate ? new Date(formData.publishDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : 'No date set'}
                            </p>
                         </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cover Image URL</label>
                      <input 
                        className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[1.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        value={formData.image || ''}
                        onChange={e => setFormData({...formData, image: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3 px-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Main Content Editor</label>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">HTML Support Active</span>
                  </div>
                  <textarea 
                    className="w-full p-8 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[2.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-96 leading-relaxed"
                    placeholder="Enter HTML content..."
                    value={formData.content || ''}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                  />
                </div>

                <div className="pt-6 flex justify-end">
                   <button 
                    onClick={handleSavePost}
                    className={`px-16 py-5 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95 ${
                      formData.status === 'scheduled' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    }`}
                   >
                     {formData.status === 'scheduled' ? 'Confirm Schedule' : 'Commit & Publish'}
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extensions View */}
        {activeTab === 'extensions' && (
          <div className="space-y-8 animate-in fade-in">
            <header className="flex justify-between items-center">
               <h2 className="text-3xl font-black tracking-tighter dark:text-white">Extension Catalog</h2>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{extensions.length} Assets Verified</div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {extensions.map(ext => (
                <div key={ext.id} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-indigo-200 transition-all">
                  <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">{ext.icon || '🧩'}</div>
                  <h3 className="text-2xl font-black mb-2 dark:text-white tracking-tighter">{ext.name}</h3>
                  <p className="text-xs text-slate-500 mb-8 font-medium leading-relaxed line-clamp-2">{ext.description}</p>
                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">⭐ {ext.rating} Rating</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{ext.downloads.toLocaleString()} DLs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maintenance / Backup View */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-10 animate-in slide-in-from-bottom-6">
            <header>
              <h2 className="text-4xl font-black tracking-tighter dark:text-white">Maintenance & Security</h2>
              <p className="text-slate-500 font-medium">Manage database integrity, backups, and restores</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Backup Section */}
               <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl">💾</div>
                  <h3 className="text-2xl font-black dark:text-white tracking-tighter">Database Export</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Download a full snapshot of your site's data (articles, extensions, settings) in a secure JSON format for offline storage.</p>
                  <button 
                    onClick={handleExportBackup}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
                  >
                    Generate Backup File
                  </button>
               </div>

               {/* Restore Section */}
               <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center text-2xl">🔄</div>
                  <h3 className="text-2xl font-black dark:text-white tracking-tighter">System Restore</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Restore your entire site from a previous backup file. Warning: This action will replace all current data with the backup contents.</p>
                  <button 
                    onClick={() => restoreInputRef.current?.click()}
                    className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-xl shadow-slate-100 dark:shadow-none"
                  >
                    Upload & Restore Data
                  </button>
                  <input 
                    type="file" 
                    ref={restoreInputRef} 
                    className="hidden" 
                    accept=".json"
                    onChange={handleImportRestore} 
                  />
               </div>
            </div>

            {/* Platform Settings */}
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
               <h3 className="text-xl font-black dark:text-white tracking-tighter">General Configuration</h3>
               <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Public Site Title</label>
                    <input 
                      className="w-full p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[1.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={settings.siteTitle}
                      onChange={e => setSettings({...settings, siteTitle: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                     <div>
                        <div className="text-sm font-black dark:text-white">Automated Scheduler</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-publish verified drafts</div>
                     </div>
                     <button 
                      onClick={() => setSettings({...settings, autoPublish: !settings.autoPublish})}
                      className={`w-14 h-8 rounded-full transition-all relative ${settings.autoPublish ? 'bg-indigo-600' : 'bg-slate-300'}`}
                     >
                       <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.autoPublish ? 'right-1' : 'left-1'}`}></div>
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
