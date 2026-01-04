
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
    const savedPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
    const savedExtensions = localStorage.getItem(STORAGE_KEYS.EXTENSIONS);
    
    setPosts(savedPosts ? JSON.parse(savedPosts) : DEFAULT_POSTS);
    setExtensions(savedExtensions ? JSON.parse(savedExtensions) : DEFAULT_EXTENSIONS);
    
    window.scrollTo(0, 0);
  }, [page, viewingPost]);

  const handlePostClick = (post: BlogPost) => {
    // Increment view count
    const updatedPosts = posts.map(p => {
      if (p.id === post.id) {
        return { ...p, views: (p.views || 0) + 1 };
      }
      return p;
    });
    setPosts(updatedPosts);
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts));
    
    // Set active viewing post
    setViewingPost(post);
  };

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(extensions.map(ext => ext.category || 'General'))];
    return cats;
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
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <button 
          onClick={() => { setPage('home'); setViewingPost(null); }} 
          onDoubleClick={onEnterAdmin} 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          title="Admin Access: Double Click"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">E</div>
          <span className="text-xl font-black tracking-tighter text-gray-900">ExtensionTo</span>
        </button>
        <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          <button onClick={() => { setPage('home'); setViewingPost(null); }} className={`hover:text-indigo-600 transition-colors ${page === 'home' && !viewingPost ? 'text-indigo-600' : ''}`}>Home</button>
          <button onClick={() => { setPage('blog'); setViewingPost(null); }} className={`hover:text-indigo-600 transition-colors ${page === 'blog' && !viewingPost ? 'text-indigo-600' : ''}`}>Blog</button>
          <button onClick={() => { setPage('about'); setViewingPost(null); }} className={`hover:text-indigo-600 transition-colors ${page === 'about' ? 'text-indigo-600' : ''}`}>About</button>
          <button onClick={() => { setPage('contact'); setViewingPost(null); }} className={`hover:text-indigo-600 transition-colors ${page === 'contact' ? 'text-indigo-600' : ''}`}>Contact</button>
        </div>
      </div>
    </nav>
  );

  // Shared Footer
  const Footer = (
    <footer className="py-20 bg-white border-t border-gray-100 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold">E</div>
          <span className="font-black tracking-tighter text-gray-900">ExtensionTo Hub</span>
        </div>
        <div className="flex flex-wrap justify-center gap-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <span>© 2025 ExtensionTo</span>
          <button onClick={() => { setPage('blog'); setViewingPost(null); }} className="hover:text-indigo-600">Blog</button>
          <button onClick={() => { setPage('about'); setViewingPost(null); }} className="hover:text-indigo-600">About Us</button>
          <button onClick={() => { setPage('contact'); setViewingPost(null); }} className="hover:text-indigo-600">Contact</button>
          <button onClick={() => { setPage('privacy'); setViewingPost(null); }} className="hover:text-indigo-600">Privacy Policy</button>
          <button onClick={() => { setPage('terms'); setViewingPost(null); }} className="hover:text-indigo-600">Terms of Service</button>
        </div>
      </div>
    </footer>
  );

  // Full Article Viewer
  const renderPostDetail = (post: BlogPost) => (
    <div className="pt-32 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <article className="max-w-4xl mx-auto px-6">
        <button 
          onClick={() => setViewingPost(null)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-10 hover:gap-4 transition-all"
        >
          ← Back to Articles
        </button>

        <header className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{post.category}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(post.publishDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">• {post.views || 0} Views</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-[1.1] mb-8">{post.title}</h1>
          <p className="text-xl text-gray-500 font-medium leading-relaxed italic">{post.excerpt}</p>
        </header>

        {post.image && (
          <div className="rounded-[3rem] overflow-hidden mb-16 shadow-2xl shadow-indigo-100">
            <img src={post.image} alt={post.title} className="w-full h-auto object-cover max-h-[500px]" />
          </div>
        )}

        <div className="prose prose-xl prose-indigo max-w-none text-gray-800 leading-relaxed font-medium">
          {/* Using dangerouslySetInnerHTML to render the HTML content from CMS */}
          <div 
            className="space-y-6"
            dangerouslySetInnerHTML={{ __html: post.content }} 
          />
        </div>

        <div className="mt-20 pt-10 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold">E</div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-900">ExtensionTo Editorial</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verified Expert Reviewer</p>
            </div>
          </div>
          <div className="flex gap-4">
             {/* Simple Social Share placeholders */}
             <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors">𝕏</div>
             <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors">f</div>
          </div>
        </div>
      </article>

      {/* Related Posts Section */}
      <section className="max-w-7xl mx-auto px-6 mt-32">
        <h3 className="text-3xl font-black tracking-tighter mb-12">More to Read.</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {publishedPosts.filter(p => p.id !== post.id).slice(0, 3).map(related => (
            <div 
              key={related.id} 
              onClick={() => handlePostClick(related)}
              className="group cursor-pointer bg-gray-50 p-8 rounded-[2.5rem] hover:bg-white hover:shadow-xl transition-all"
            >
              <span className="text-[10px] font-black uppercase text-indigo-500 block mb-4">{related.category}</span>
              <h4 className="text-xl font-black tracking-tighter mb-4 line-clamp-2 group-hover:text-indigo-600">{related.title}</h4>
              <p className="text-xs text-gray-500 font-medium line-clamp-2">Read insight →</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderHome = () => (
    <div className="animate-in fade-in duration-1000">
      <section className="pt-40 pb-20 px-6 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-8">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Verified Professional Content
          </div>
          <h1 className="text-6xl md:text-9xl font-black text-gray-900 tracking-tighter mb-8 leading-[0.85]">
            Optimize your <span className="text-indigo-600">browsing</span> power.
          </h1>
          <p className="text-xl text-gray-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
            Hand-picked collection of high-performance browser tools. Verified for privacy, vetted for speed, curated for you.
          </p>
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text"
              placeholder="Search by name, utility, or category..."
              className="w-full pl-16 pr-8 py-6 bg-gray-50 border border-gray-100 rounded-[32px] focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-200 outline-none transition-all text-gray-900 font-bold placeholder:text-gray-400 shadow-sm text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section id="extensions" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8 border-b border-gray-100 pb-10">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-indigo-50/50 px-5 py-2.5 rounded-2xl border border-indigo-100">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
               {filteredExtensions.length} Professional Tools Indexed
             </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredExtensions.map(ext => (
            <div key={ext.id} className="p-10 bg-white border border-gray-100 rounded-[3rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group flex flex-col h-full">
              <div className="text-6xl mb-8 group-hover:scale-110 transition-transform duration-500 block w-fit">{ext.icon || '🧩'}</div>
              <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">{ext.name}</h3>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed line-clamp-3 flex-grow">{ext.description}</p>
              
              <div className="space-y-6 pt-6 border-t border-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full tracking-widest">⭐ {ext.rating}</span>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{ext.downloads.toLocaleString()} Users</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">{ext.category}</span>
                </div>
                
                {ext.storeUrl && (
                  <a 
                    href={ext.storeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200 hover:shadow-indigo-200 group-hover:translate-y-[-4px]"
                  >
                    Download Now
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="articles" className="bg-gray-50 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-none mb-4">Latest Intelligence.</h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Directly from the ExtensionTo Newsroom</p>
            </div>
            <button onClick={() => { setPage('blog'); setViewingPost(null); }} className="text-indigo-600 font-black uppercase tracking-widest text-xs hover:underline">View All Articles →</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {publishedPosts.slice(0, 3).map((post, idx) => (
              <div 
                key={post.id} 
                onClick={() => handlePostClick(post)}
                className={`group cursor-pointer ${idx === 0 ? 'md:col-span-2' : ''}`}
              >
                <div className="overflow-hidden rounded-[3rem] mb-8 bg-white shadow-lg shadow-gray-200/50">
                  <img src={post.image || `https://picsum.photos/seed/${post.id}/1200/600`} className={`w-full ${idx === 0 ? 'h-96' : 'h-64'} object-cover group-hover:scale-105 transition-transform duration-700`} alt="" />
                </div>
                <div className="px-4">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">{post.category}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(post.publishDate).toLocaleDateString()}</span>
                  </div>
                  <h3 className={`${idx === 0 ? 'text-4xl md:text-6xl' : 'text-3xl'} font-black text-gray-900 tracking-tighter leading-tight mb-4 group-hover:text-indigo-600 transition-colors`}>{post.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed line-clamp-3 mb-6">{post.excerpt}</p>
                  <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                    <span>{post.views || 0} Real Views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  const renderBlog = () => (
    <div className="animate-in fade-in duration-1000 bg-gray-50 min-h-screen pt-40 pb-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-24 text-center">
          <span className="inline-block px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-8">Intelligence & Insights</span>
          <h1 className="text-7xl md:text-9xl font-black text-gray-900 tracking-tighter mb-8 leading-[0.85]">
            The <span className="text-indigo-600">ExtensionTo</span> Newsroom.
          </h1>
          <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto">In-depth analysis, tutorials, and productivity guides curated by our expert team.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {publishedPosts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => handlePostClick(post)}
              className="flex flex-col group cursor-pointer bg-white rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
            >
              <div className="h-64 overflow-hidden relative">
                <img 
                  src={post.image || `https://picsum.photos/seed/${post.id}/600/400`} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt={post.title} 
                />
                <div className="absolute top-6 left-6">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                    {post.category}
                  </span>
                </div>
              </div>
              <div className="p-10 flex flex-col flex-grow">
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                  <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{post.readTime || '3 min read'}</span>
                  <span>•</span>
                  <span>{post.views || 0} views</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter leading-tight mb-4 group-hover:text-indigo-600 transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-500 font-medium leading-relaxed line-clamp-3 mb-8 flex-grow">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-2 text-indigo-600 font-black uppercase text-[10px] tracking-widest group-hover:gap-4 transition-all pt-6 border-t border-gray-50">
                  Read Full Insight 
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {publishedPosts.length === 0 && (
          <div className="py-32 text-center bg-white rounded-[3rem] shadow-sm">
            <div className="text-6xl mb-8">✍️</div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter">No articles published yet.</h3>
            <p className="text-gray-500 mt-4">Check back soon for new insights.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="pt-40 pb-20 px-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-10">Our Mission.</h1>
      <div className="prose prose-xl prose-slate max-w-none text-gray-600 font-medium leading-relaxed space-y-8">
        <p className="text-2xl text-indigo-600 font-black tracking-tight">ExtensionTo is the world's most curated directory for browser extensions.</p>
        <p>In an era where your browser is your primary workspace, choosing the right tools is critical. We believe that every extension you install should be vetted for speed, privacy, and true utility.</p>
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter pt-10">How we vet.</h2>
        <ul className="list-none p-0 space-y-6">
          <li className="flex gap-4 items-start">
            <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black flex-shrink-0">01</span>
            <div><strong className="text-gray-900">Privacy First:</strong> We analyze permissions requested by every extension to ensure your data stays yours.</div>
          </li>
          <li className="flex gap-4 items-start">
            <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black flex-shrink-0">02</span>
            <div><strong className="text-gray-900">Performance Impact:</strong> We test each tool's impact on memory and CPU usage. If it slows you down, it's not here.</div>
          </li>
          <li className="flex gap-4 items-start">
            <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black flex-shrink-0">03</span>
            <div><strong className="text-gray-900">Real Utility:</strong> No "fluff." We only index tools that solve genuine productivity problems.</div>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="pt-40 pb-20 px-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
        <div>
          <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-8">Get in touch.</h1>
          <p className="text-xl text-gray-500 font-medium leading-relaxed mb-10">Have a question about a tool? Or want to suggest an extension for vetting? We're here to help.</p>
          <div className="space-y-6">
            <div className="p-8 bg-gray-50 rounded-[2rem]">
              <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Intelligence</span>
              <a href="mailto:hello@extensionto.com" className="text-xl font-black text-indigo-600 hover:underline">hello@extensionto.com</a>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2rem]">
              <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Business Operations</span>
              <p className="text-xl font-black text-gray-900">San Francisco, CA</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-10 rounded-[3rem]">
          <form className="space-y-6" onSubmit={e => e.preventDefault()}>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Your Name</label>
              <input type="text" className="w-full p-6 rounded-2xl border-none outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
              <input type="email" className="w-full p-6 rounded-2xl border-none outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold" placeholder="john@company.com" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Your Inquiry</label>
              <textarea className="w-full p-6 rounded-2xl border-none outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold h-40" placeholder="How can we help?"></textarea>
            </div>
            <button className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="pt-40 pb-20 px-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-10">Privacy Policy.</h1>
      <div className="prose prose-slate max-w-none text-gray-600 font-medium space-y-6">
        <p className="italic">Last Updated: October 2025</p>
        <h2 className="text-2xl font-black text-gray-900">01. Overview</h2>
        <p>ExtensionTo is committed to protecting your privacy. This policy explains how we collect and use your information when you visit our extension hub.</p>
        <h2 className="text-2xl font-black text-gray-900">02. Information Collection</h2>
        <p>We do not collect personal data unless you voluntarily provide it via our contact form or newsletter subscription. We collect anonymous analytics data to improve the user experience of our directory.</p>
        <h2 className="text-2xl font-black text-gray-900">03. Cookies</h2>
        <p>We use essential cookies to maintain your session preferences (such as Dark Mode). Third-party analytics may use tracking cookies, which you can opt-out of via your browser settings.</p>
      </div>
    </div>
  );

  const renderTerms = () => (
    <div className="pt-40 pb-20 px-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-10">Terms of Service.</h1>
      <div className="prose prose-slate max-w-none text-gray-600 font-medium space-y-6">
        <p className="italic">Last Updated: October 2025</p>
        <h2 className="text-2xl font-black text-gray-900">01. Agreement</h2>
        <p>By using ExtensionTo, you agree to these terms. Our site provides a directory of third-party software; we are not responsible for the performance or legalities of the extensions listed.</p>
        <h2 className="text-2xl font-black text-gray-900">02. Intellectual Property</h2>
        <p>The curation, indexing, and design of this directory are owned by ExtensionTo. You may not scrape or replicate this data for commercial purposes.</p>
        <h2 className="text-2xl font-black text-gray-900">03. Disclaimer</h2>
        <p>We provide extension reviews "as is." Users should exercise their own judgment when installing software from third-party developers.</p>
      </div>
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
            {page === 'about' && renderAbout()}
            {page === 'contact' && renderContact()}
            {page === 'privacy' && renderPrivacy()}
            {page === 'terms' && renderTerms()}
          </>
        )}
      </main>

      {Footer}
    </div>
  );
};
