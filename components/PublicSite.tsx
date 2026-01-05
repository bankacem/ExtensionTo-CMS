
import React, { useState, useMemo, useEffect } from 'react';
import { Extension, BlogPost } from '../types';
import { STORAGE_KEYS, DEFAULT_POSTS, DEFAULT_EXTENSIONS } from '../constants';

interface PublicSiteProps {
  onEnterAdmin: () => void;
}

type SubPage = 'home' | 'about' | 'contact' | 'privacy' | 'terms' | 'blog';

export const PublicSite: React.FC<PublicSiteProps> = ({ onEnterAdmin }) => {
  const [page, setPage] = useState<SubPage>('home');
  const [viewingPost, setViewingPost] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  // Load real data from CMS storage
  useEffect(() => {
    const loadData = () => {
      const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
      const savedExtensions = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
      setPosts(savedPosts ? JSON.parse(savedPosts) : DEFAULT_POSTS);
      setExtensions(savedExtensions ? JSON.parse(savedExtensions) : DEFAULT_EXTENSIONS);
    };
    loadData();
    window.scrollTo(0, 0);
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [page, viewingPost]);

  const handlePostClick = (post: BlogPost) => {
    const updatedPosts = posts.map(p => {
      if (p.id === post.id) return { ...p, views: (p.views || 0) + 1 };
      return p;
    });
    setPosts(updatedPosts);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
    setViewingPost(post);
  };

  const categories = useMemo(() => {
    return ['All', ...new Set(extensions.map(ext => ext.category || 'General'))];
  }, [extensions]);

  const filteredExtensions = useMemo(() => {
    return extensions.filter(ext => {
      const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            ext.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || ext.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, extensions]);

  const publishedPosts = useMemo(() => {
    return posts.filter(p => p.status === 'published')
                .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  }, [posts]);

  // Shared Header
  const Header = (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button 
          onClick={() => { setPage('home'); setViewingPost(null); }} 
          onDoubleClick={onEnterAdmin} 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-100">E</div>
          <span className="text-lg font-black tracking-tighter text-gray-900">ExtensionTo</span>
        </button>
        <div className="hidden md:flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
          <button onClick={() => { setPage('home'); setViewingPost(null); }} className={`hover:text-indigo-600 ${page === 'home' && !viewingPost ? 'text-indigo-600' : ''}`}>Home</button>
          <button onClick={() => { setPage('blog'); setViewingPost(null); }} className={`hover:text-indigo-600 ${page === 'blog' && !viewingPost ? 'text-indigo-600' : ''}`}>Blog</button>
          <button onClick={() => { setPage('about'); setViewingPost(null); }} className={`hover:text-indigo-600 ${page === 'about' ? 'text-indigo-600' : ''}`}>About</button>
          <button onClick={() => { setPage('contact'); setViewingPost(null); }} className={`hover:text-indigo-600 ${page === 'contact' ? 'text-indigo-600' : ''}`}>Contact</button>
        </div>
      </div>
    </nav>
  );

  // Shared Footer
  const Footer = (
    <footer className="py-12 bg-white border-t border-gray-100 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold">E</div>
          <span className="font-black tracking-tighter text-gray-900 text-sm">ExtensionTo Hub</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-[8px] font-black uppercase tracking-widest text-gray-400">
          <span>© 2025 ExtensionTo</span>
          <button onClick={() => { setPage('blog'); setViewingPost(null); }} className="hover:text-indigo-600">Blog</button>
          <button onClick={() => { setPage('privacy'); setViewingPost(null); }} className="hover:text-indigo-600">Privacy</button>
          <button onClick={() => { setPage('terms'); setViewingPost(null); }} className="hover:text-indigo-600">Terms</button>
        </div>
      </div>
    </footer>
  );

  const ThinArticleItem: React.FC<{ post: BlogPost }> = ({ post }) => (
    <div 
      onClick={() => handlePostClick(post)}
      className="flex flex-col md:flex-row gap-4 p-3 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-1"
    >
      <div className="w-full md:w-56 h-32 md:h-auto rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner">
        <img src={post.image || `https://picsum.photos/seed/${post.id}/600/400`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={post.title} />
      </div>
      <div className="flex flex-col justify-center py-1 flex-grow">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[7px] font-black uppercase tracking-widest rounded-full">{post.category}</span>
          <span className="text-[7px] font-bold text-slate-400 uppercase">{new Date(post.publishDate).toLocaleDateString()}</span>
        </div>
        <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{post.title}</h3>
        <p className="text-slate-500 text-xs font-medium line-clamp-2 mb-3">{post.excerpt}</p>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3 text-[7px] font-black uppercase tracking-widest text-slate-400">
            <span>{post.views || 0} Views</span>
            <span>•</span>
            <span>{post.readTime || '3 min'}</span>
          </div>
          <span className="text-[8px] font-black uppercase text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Full Intelligence →</span>
        </div>
      </div>
    </div>
  );

  const renderPostDetail = (post: BlogPost) => (
    <div className="pt-24 pb-20 animate-in fade-in duration-700">
      <style>{`
        .prose-custom h1 { font-weight: 900; letter-spacing: -0.05em; line-height: 1.1; margin-bottom: 1.5rem; }
        .prose-custom h2 { font-weight: 800; letter-spacing: -0.04em; margin-top: 2rem; margin-bottom: 1rem; }
        .prose-custom h3 { font-weight: 700; letter-spacing: -0.03em; margin-top: 1.5rem; margin-bottom: 0.8rem; }
        .prose-custom table { width: 100%; border-collapse: collapse; margin: 2rem 0; border: 1px solid #e2e8f0; }
        .prose-custom th, .prose-custom td { padding: 1rem; border: 1px solid #e2e8f0; text-align: left; }
        .prose-custom th { background-color: #f8fafc; font-weight: bold; }
        .prose-custom blockquote { border-left: 4px solid #4f46e5; padding-left: 1.5rem; font-style: italic; color: #475569; margin: 2rem 0; }
      `}</style>
      <article className="max-w-4xl mx-auto px-6">
        <button onClick={() => setViewingPost(null)} className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 mb-8 hover:gap-2 transition-all">← Back to Insights</button>
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">{post.category}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• {post.views || 0} Views</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter leading-[1.1] mb-6">{post.title}</h1>
          <p className="text-lg text-gray-500 font-medium leading-relaxed italic border-l-2 border-indigo-100 pl-4">{post.excerpt}</p>
        </header>
        {post.image && <div className="rounded-[2rem] overflow-hidden mb-12 shadow-2xl shadow-indigo-100/20"><img src={post.image} alt={post.title} className="w-full h-auto object-cover max-h-[450px]" /></div>}
        
        <div className="prose prose-lg prose-indigo max-w-none text-gray-800 leading-relaxed font-medium prose-custom" 
          dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
      <section className="max-w-7xl mx-auto px-6 mt-20">
        <h3 className="text-2xl font-black tracking-tighter mb-8 border-t pt-10 border-gray-100">Related Intelligence Assets.</h3>
        <div className="grid grid-cols-1 gap-4">
          {publishedPosts.filter(p => p.id !== post.id).slice(0, 3).map(related => <ThinArticleItem key={related.id} post={related} />)}
        </div>
      </section>
    </div>
  );

  const renderHome = () => (
    <div className="animate-in fade-in">
      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-[0.2em] rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span> Verified Professional Directory
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-gray-900 tracking-tighter mb-6 leading-[0.85]">Optimize <span className="text-indigo-600">Power</span>.</h1>
          <p className="text-lg text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">Curated high-performance tools and verified intelligence for your professional stack.</p>
          <div className="max-w-xl mx-auto relative">
            <input type="text" placeholder="Search knowledge base..." className="w-full pl-6 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-[20px] focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-gray-900 font-bold placeholder:text-gray-400 shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
          <div className="flex flex-wrap justify-center gap-1.5">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{cat}</button>
            ))}
          </div>
          <p className="text-[8px] font-black text-indigo-900 uppercase tracking-widest px-3 py-1 bg-indigo-50/50 rounded-lg border border-indigo-100">{filteredExtensions.length} Assets Registered</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExtensions.map(ext => (
            <div key={ext.id} className="p-6 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-lg transition-all group flex flex-col h-full">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform block w-fit p-3 bg-slate-50 rounded-xl shadow-inner">{ext.icon || '🧩'}</div>
              <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tighter">{ext.name}</h3>
              <p className="text-gray-500 font-medium mb-4 flex-grow text-xs leading-relaxed line-clamp-3">{ext.description}</p>
              <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{ext.category}</span>
                {ext.storeUrl && <a href={ext.storeUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-900 text-white rounded-lg font-black uppercase tracking-widest text-[7px] hover:bg-indigo-600 transition-colors shadow-sm">Get Tool</a>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight">Latest Intel <span className="text-indigo-600">Sync</span>.</h2>
            <button onClick={() => setPage('blog')} className="text-indigo-600 font-black uppercase tracking-widest text-[8px] hover:underline">View All Intelligence →</button>
          </div>
          <div className="flex flex-col gap-4">
            {publishedPosts.slice(0, 3).map((post) => <ThinArticleItem key={post.id} post={post} />)}
          </div>
        </div>
      </section>
    </div>
  );

  const renderBlog = () => (
    <div className="bg-slate-50 min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-16 text-center">
          <span className="inline-block px-2.5 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full mb-4">Digital Newsroom</span>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter">Verified Intelligence.</h1>
          <p className="text-gray-500 font-medium mt-4">Professional analysis and verified guides for the modern directory.</p>
        </div>
        <div className="flex flex-col gap-4">
          {publishedPosts.map((post) => <ThinArticleItem key={post.id} post={post} />)}
        </div>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="pt-32 pb-20 px-6 max-w-xl mx-auto animate-in fade-in">
      <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-8 text-center">Establish Contact.</h1>
      <form className="bg-white p-8 rounded-[1.5rem] shadow-xl space-y-4 border border-indigo-50" onSubmit={e => e.preventDefault()}>
        <input type="text" className="w-full p-3 rounded-lg bg-slate-50 border-none outline-none font-bold text-xs" placeholder="Full Identity" />
        <input type="email" className="w-full p-3 rounded-lg bg-slate-50 border-none outline-none font-bold text-xs" placeholder="Verified Email" />
        <textarea className="w-full p-3 rounded-lg bg-slate-50 border-none outline-none font-bold h-24 text-xs" placeholder="Your Inquiry..."></textarea>
        <button className="w-full py-3 bg-indigo-600 text-white rounded-lg font-black uppercase tracking-widest text-[8px] shadow-lg hover:bg-indigo-700 transition-all">Secure Sync</button>
      </form>
    </div>
  );

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-indigo-100 selection:text-indigo-700">
      {Header}
      <main className="min-h-[70vh]">
        {viewingPost ? renderPostDetail(viewingPost) : (
          <>
            {page === 'home' && renderHome()}
            {page === 'blog' && renderBlog()}
            {page === 'contact' && renderContact()}
            {(page === 'about' || page === 'privacy' || page === 'terms') && (
              <div className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-6 uppercase tracking-widest">{page} Protocol</h1>
                <p className="text-gray-500 font-medium leading-relaxed border-l-4 border-indigo-600 pl-6 py-4 bg-slate-50 rounded-r-xl">Professional documentation for the {page} section. All rights reserved by ExtensionTo Hub.</p>
              </div>
            )}
          </>
        )}
      </main>
      {Footer}
    </div>
  );
};
