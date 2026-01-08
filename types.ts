export type NoticeType = 'success' | 'error' | 'info';
export type Tab = 'dashboard' | 'posts' | 'pages' | 'extensions' | 'media' | 'analytics' | 'settings' | 'scheduler' | 'seo';
export type PostStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  date: string;
  publishDate: string;
  readTime: string;
  image: string;
  status: PostStatus;
  featured: boolean;
  seoTitle: string;
  seoDesc: string;
  seoKeywords: string;
  author?: string;
  wordCount?: number;
  readingTime?: number;
  seoScore?: number;
  seoSuggestions?: string[];
  internalLinks?: string[];
  views?: number;
}

export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: 'published' | 'draft';
  updatedAt: string;
}

export interface Extension {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  downloads: number;
  icon?: string;
  storeUrl?: string;
  featured?: boolean;
}

export interface MediaItem {
  id: string;
  name: string;
  data: string;
  type: string;
  uploadDate: string;
}

export interface SEOSettings {
  robotsTxt: string;
  sitemapLastGenerated: string;
  googleSearchConsoleKey?: string;
  bingWebmasterKey?: string;
}

export interface ScheduledPost {
  id: string;
  postId: string;
  scheduledDate: string;
  status: 'pending' | 'published' | 'failed';
  createdAt: string;
}

export interface AnalyticsData {
  date: string;
  views: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPosts: string[];
  referrals: { source: string; visits: number }[];
}

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  role: UserRole;
  createdAt: string;
  avatar?: string;
}