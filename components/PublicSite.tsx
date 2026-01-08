import React, { useState, useMemo, useEffect } from 'react';
import { Extension, BlogPost, CMSPage } from '../types';
import { STORAGE_KEYS, DEFAULT_POSTS, DEFAULT_EXTENSIONS, DEFAULT_PAGES } from '../constants';
import { api } from '../services/apiService';

interface PublicSiteProps {
  onEnterAdmin: () => void;
}

export const PublicSite: React.FC<PublicSiteProps> = ({ onEnterAdmin }) => {
  const [page, setPage] = useState<string>('home');
  const [viewingPost, setViewingPost] = useState<BlogPost | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const savedExtensions = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    setExtensions(savedExtensions ? JSON.parse(savedExtensions) : DEFAULT_EXTENSIONS);
    
    // Load dynamic content from D1 Cloud
    api.getPublicPosts().then(setPosts);
  }, []);

  // Handle viewing a post with loading state for Internal Linking injection
  const handleViewPost = async (post: BlogPost) => {
    setIsLoadingPost(true);
    try {
      const fullPost = await api.getPostBySlug(post.slug);
      setViewingPost(fullPost || post);
    } catch (e) {
      setViewingPost(post);
    } finally {
      setIsLoadingPost(false);
      window.scrollTo(0, 0);
    }
  };

  const sortedAndFilteredExtensions = useMemo(() => {
    return extensions
      .filter(ext => 
        (ext.name.toLowerCase().includes(searchQuery.toLowerCase()) || ext.description.toLowerCase().includes(searchQuery.toLowerCase())) && 
        (activeCategory === 'All' || ext.category === activeCategory)
      )
      .sort((a, b) => (a.featured ? -1 : 1));
  }, [searchQuery, activeCategory, extensions]);

  const filteredPosts = useMemo(() => {
    return posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [posts, searchQuery]);

  const Header = (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <button onClick={() => { setPage('home'); setViewingPost(null); setSearchQuery(''); }} onDoubleClick={onEnterAdmin} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">E</div>
          <span className="text-xl font-black tracking-tighter">ExtensionTo</span>
        </button>
        <div className="hidden md:flex items-center gap-8 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
          <button onClick={() => { setPage('home'); setViewingPost(null); setSearchQuery(''); }} className={(page === 'home' && !viewingPost) ? 'text-indigo-600' : ''}>home</button>
          <button onClick={() => { setPage('blog'); setViewingPost(null); setSearchQuery(''); }} className={(page === 'blog' || viewingPost) ? 'text-indigo-600' : ''}>blog</button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-indigo-600 selection:text-white">
      {Header}
      <main className="min-h-screen pt-20">
        {isLoadingPost ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Optimizing Content...</p>
          </div>
        ) : viewingPost ? (
           <article className="max-w-4xl mx-auto px-6 pt-20 pb-32 animate-in fade-in duration-500">
             <button onClick={() => { setViewingPost(null); setPage('blog'); }} className="text-[9px] font-black uppercase text-indigo-600 mb-12 flex items-center gap-2 group">
               <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to insights
             </button>
             {viewingPost.image && <img src={viewingPost.image} className="w-full aspect-video object-cover rounded-[3rem] mb-12 shadow-2xl" alt={viewingPost.title} />}
             <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-[1.1]">{viewingPost.title}</h1>
             <div className="flex items-center gap-4 mb-16 text-[10px] font-black uppercase tracking-widest text-slate-400">
               <span>{viewingPost.category}</span>
               <span>•</span>
               <span>{new Date(viewingPost.publishDate).toLocaleDateString()}</span>
             </div>
             <div 
                className="prose prose-2xl prose-indigo max-w-none text-slate-700 leading-relaxed font-medium
                prose-h2:text-4xl prose-h2:font-black prose-h2:text-slate-900 prose-h2:mt-16 prose-h2:mb-8
                prose-a:text-indigo-600 prose-a:no-underline prose-a:font-bold hover:prose-a:underline" 
                dangerouslySetInnerHTML={{ __html: viewingPost.content }} 
             />
           </article>
        ) : (
          <>
            {page === 'home' && (
              <div className="animate-in fade-in duration-700">
                <section className="pt-32 pb-24 px-6 text-center">
                  <h1 className="text-6xl md:text-9xl font-black text-slate-900 tracking-tighter mb-8">Cloud <span className="text-indigo-600">Assets</span>.</h1>
                  <input type="text" placeholder="Scan professional assets..." className="w-full max-w-2xl px-10 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all outline-none text-lg font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </section>
                
                <section className="max-w-7xl mx-auto px-6 py-20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {sortedAndFilteredExtensions.map(ext => (
                      <div key={ext.id} className="p-10 bg-white border border-slate-50 rounded-[3rem] shadow-sm hover:shadow-xl transition-all group">
                        <div className="text-5xl mb-8 group-hover:scale-110 transition-transform origin-left inline-block">{ext.icon || '🧩'}</div>
                        <h3 className="text-2xl font-black mb-4 text-slate-900">{ext.name}</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">{ext.description}</p>
                        <a href={ext.storeUrl} target="_blank" className="inline-block px-8 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors">Install Extension</a>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-slate-50 py-32 px-6 rounded-[5rem] mx-4 md:mx-12 mb-20">
                  <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-end mb-16">
                      <div>
                        <h2 className="text-5xl font-black text-slate-900 mb-2 uppercase">Live Intel.</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Latest from our research lab</p>
                      </div>
                      <button onClick={() => setPage('blog')} className="text-[10px] font-black uppercase text-indigo-600 underline underline-offset-8">Explore Archive</button>
                    </div>
                    <div className="space-y-6">
                      {posts.slice(0, 3).map(post => (
                        <div key={post.id} onClick={() => handleViewPost(post)} className="p-10 bg-white border border-slate-50 rounded-[2.5rem] cursor-pointer hover:shadow-2xl transition-all group flex items-center gap-8">
                          {post.image && <img src={post.image} className="w-32 h-32 rounded-3xl object-cover" alt="" />}
                          <div className="flex-grow">
                            <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-indigo-600 transition-colors">{post.title}</h3>
                            <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">{post.excerpt}</p>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">Read Analysis →</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}
            {page === 'blog' && (
              <div className="animate-in fade-in duration-700">
                <section className="pt-32 pb-24 px-6 text-center">
                  <h1 className="text-6xl md:text-9xl font-black text-slate-900 tracking-tighter mb-8">Cloud <span className="text-indigo-600">Intel</span>.</h1>
                  <input type="text" placeholder="Scan research lab archive..." className="w-full max-w-2xl px-10 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all outline-none text-lg font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </section>

                <section className="max-w-5xl mx-auto px-6 py-20">
                  <div className="space-y-6">
                    {filteredPosts.map(post => (
                      <div key={post.id} onClick={() => handleViewPost(post)} className="p-10 bg-white border border-slate-50 rounded-[2.5rem] cursor-pointer hover:shadow-2xl transition-all group flex flex-col md:flex-row items-center gap-8">
                        {post.image && <img src={post.image} className="w-full md:w-48 h-48 rounded-3xl object-cover" alt={post.title} />}
                        <div className="flex-grow">
                          <h3 className="text-xl font-black mb-3 text-slate-900 group-hover:text-indigo-600 transition-colors">{post.title}</h3>
                          <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">{post.excerpt}</p>
                          <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Read Analysis →</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="py-20 border-t border-slate-50 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs">E</div>
             <span className="font-black text-slate-900 uppercase text-xs tracking-tighter">ExtensionTo © 2025</span>
          </div>
          <div className="flex gap-8 text-[9px] font-black uppercase tracking-widest text-slate-400">
             <a href="/sitemap.xml" className="hover:text-indigo-600">Sitemap</a>
             <a href="/robots.txt" className="hover:text-indigo-600">Robots</a>
             <button onClick={onEnterAdmin} className="hover:text-indigo-600">Terminal Access</button>
          </div>
        </div>
      </footer>
    </div>
  );
};