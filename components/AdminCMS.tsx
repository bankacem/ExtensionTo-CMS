
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, Cell
} from 'recharts';
import { 
  NoticeType, Tab, PostStatus, UserRole, User, BlogPost, 
  Extension, MediaItem, ScheduledPost, AnalyticsData 
} from '../types';
import { 
  STORAGE_KEYS, DEFAULT_USERS, DEFAULT_SETTINGS, 
  DEFAULT_POSTS, DEFAULT_EXTENSIONS, INITIAL_ANALYTICS 
} from '../constants';
import { generateDraft } from '../services/geminiService';

interface AdminCMSProps {
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onViewSite: () => void;
}

export const AdminCMS: React.FC<AdminCMSProps> = ({ currentUser, onLogin, onLogout, onViewSite }) => {
  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: NoticeType } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // --- DATA STATE ---
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);

  // --- EDITOR STATE ---
  const [formData, setFormData] = useState<Partial<BlogPost>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'all'>('all');

  // --- REFS ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const schedulerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
    setPosts(savedPosts ? JSON.parse(savedPosts) : DEFAULT_POSTS);

    const savedExtensions = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    setExtensions(savedExtensions ? JSON.parse(savedExtensions) : DEFAULT_EXTENSIONS);

    const savedMedia = localStorage.getItem(STORAGE_KEYS.MEDIA);
    setMediaLibrary(savedMedia ? JSON.parse(savedMedia) : []);

    const savedAnalytics = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
    setAnalytics(savedAnalytics ? JSON.parse(savedAnalytics) : INITIAL_ANALYTICS);

    const savedScheduled = localStorage.getItem(STORAGE_KEYS.SCHEDULER);
    setScheduledPosts(savedScheduled ? JSON.parse(savedScheduled) : []);

    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    setSettings(savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS);

    const savedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (savedDarkMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    schedulerInterval.current = setInterval(checkScheduler, 30000);
    window.addEventListener('focus', checkScheduler);
    
    return () => {
      if (schedulerInterval.current) clearInterval(schedulerInterval.current);
      window.removeEventListener('focus', checkScheduler);
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, darkMode.toString());
  }, [darkMode]);

  // --- CALCULATED PRODUCTION STATS ---
  const totalViews = useMemo(() => {
    return posts.reduce((acc, post) => acc + (post.views || 0), 0);
  }, [posts]);

  // --- HELPERS ---
  const showNotice = useCallback((message: string, type: NoticeType = 'info') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  }, []);

  // --- BACKUP & RESTORE LOGIC ---
  const handleExportBackup = () => {
    const backupData: Record<string, string | null> = {};
    Object.values(STORAGE_KEYS).forEach(key => {
      backupData[key] = localStorage.getItem(key);
    });

    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extensionto-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice("Backup file generated and downloaded!", "success");
  };

  const handleImportRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (window.confirm("This will overwrite all current data. Are you sure?")) {
          Object.entries(data).forEach(([key, value]) => {
            if (value) localStorage.setItem(key, value as string);
          });
          showNotice("Restore successful! Reloading...", "success");
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err) {
        showNotice("Invalid backup file.", "error");
      }
    };
    reader.readAsText(file);
  };

  const checkScheduler = useCallback(() => {
    const now = new Date();
    setScheduledPosts(prev => {
      const pending = prev.filter(s => s.status === 'pending');
      const due = pending.filter(s => new Date(s.scheduledDate) <= now);

      if (due.length > 0) {
        setPosts(currentPosts => {
          const updatedPosts = currentPosts.map(p => {
            const isDue = due.some(d => d.postId === p.id);
            if (isDue) {
              return { ...p, status: 'published' as PostStatus, publishDate: now.toISOString() };
            }
            return p;
          });
          localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
          return updatedPosts;
        });

        const updatedSchedule = prev.map(s => {
          if (due.some(d => d.id === s.id)) return { ...s, status: 'published' as const };
          return s;
        });
        localStorage.setItem(STORAGE_KEYS.SCHEDULER, JSON.stringify(updatedSchedule));
        
        due.forEach(() => showNotice("Scheduled content published!", "success"));
        return updatedSchedule;
      }
      return prev;
    });
  }, [showNotice]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      onLogin(user);
      showNotice(`Welcome back, ${user.username}!`, "success");
    } else {
      showNotice("Invalid credentials.", "error");
    }
  };

  const handleSavePost = () => {
    if (!formData.title || !formData.content) {
      showNotice("Title and content are required.", "error");
      return;
    }

    const id = formData.id || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const now = new Date();
    const pDate = new Date(formData.publishDate || now.toISOString());
    
    let finalStatus: PostStatus = formData.status || 'draft';
    
    if (finalStatus !== 'draft') {
      if (pDate > now) {
        finalStatus = 'scheduled';
      } else {
        finalStatus = 'published';
      }
    }

    const newPost: BlogPost = {
      ...formData as BlogPost,
      id,
      date: formData.date || now.toLocaleDateString(),
      publishDate: pDate.toISOString(),
      status: finalStatus,
      seoScore: calculateSEOScore(formData as BlogPost),
      wordCount: (formData.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w).length,
      readTime: `${Math.ceil((formData.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w).length / 200)} min read`,
      views: formData.views || 0
    };

    const updatedPosts = posts.some(p => p.id === id) 
      ? posts.map(p => p.id === id ? newPost : p)
      : [newPost, ...posts];

    setPosts(updatedPosts);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));

    if (newPost.status === 'scheduled') {
      const newScheduled: ScheduledPost = {
        id: Math.random().toString(36).substr(2, 9),
        postId: id,
        scheduledDate: newPost.publishDate,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      const updatedSchedule = [newScheduled, ...scheduledPosts.filter(s => s.postId !== id)];
      setScheduledPosts(updatedSchedule);
      localStorage.setItem(STORAGE_KEYS.SCHEDULER, JSON.stringify(updatedSchedule));
    } else {
      const updatedSchedule = scheduledPosts.filter(s => s.postId !== id);
      setScheduledPosts(updatedSchedule);
      localStorage.setItem(STORAGE_KEYS.SCHEDULER, JSON.stringify(updatedSchedule));
    }

    setIsEditing(false);
    showNotice(newPost.status === 'scheduled' ? "Post scheduled successfully!" : "Post published successfully!", "success");
  };

  const calculateSEOScore = (post: BlogPost): number => {
    let score = 10; 
    if (post.title?.length > 45 && post.title?.length < 70) score += 20;
    if (post.content?.length > 1200) score += 30;
    if (post.image) score += 10;
    if (post.tags?.split(',').length >= 3) score += 15;
    if (post.seoKeywords?.length > 10) score += 15;
    return Math.min(score, 100);
  };

  const handleAIDraft = async () => {
    if (!formData.title) {
      showNotice("Enter a title first.", "error");
      return;
    }
    setAiLoading(true);
    try {
      const draft = await generateDraft(formData.title);
      setFormData(prev => ({ ...prev, ...draft }));
      showNotice("AI content generated!", "success");
    } catch (e: any) {
      showNotice(e.message || "AI Drafting failed.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const item: MediaItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          data: ev.target?.result as string,
          type: file.type,
          uploadDate: new Date().toISOString()
        };
        const updatedMedia = [item, ...mediaLibrary];
        setMediaLibrary(updatedMedia);
        localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(updatedMedia));
        showNotice("Media uploaded!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteMedia = (id: string) => {
    const updatedMedia = mediaLibrary.filter(m => m.id !== id);
    setMediaLibrary(updatedMedia);
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(updatedMedia));
    showNotice("Media item deleted.", "info");
  };

  const handleAddExtension = useCallback(() => {
    const name = window.prompt("Extension Name:");
    if (!name || name.trim() === "") return;
    const description = window.prompt("Short Description:", "High-performance professional tool.");
    const category = window.prompt("Category:", "General");
    const storeUrl = window.prompt("Chrome Web Store URL (optional):", "");
    const newExt: Extension = {
      id: "ext-" + Date.now().toString(36),
      name: name.trim(),
      description: description || "A professional extension curated for Hub users.",
      category: category || "General",
      rating: 4.8,
      downloads: Math.floor(Math.random() * 1000) + 50,
      icon: "🧩",
      storeUrl: storeUrl || undefined
    };
    setExtensions(prev => {
      const updated = [newExt, ...prev];
      localStorage.setItem(STORAGE_KEYS.EXTENSIONS, JSON.stringify(updated));
      return updated;
    });
    showNotice(`Extension "${name}" successfully added!`, "success");
  }, [showNotice]);

  const openNewPostEditor = () => {
    setFormData({
      title: '',
      content: '',
      category: 'Technology',
      status: 'draft',
      image: '',
      tags: '',
      seoKeywords: '',
      publishDate: new Date().toISOString()
    });
    setIsEditing(true);
    setActiveTab('posts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const linkSuggestions = useMemo(() => {