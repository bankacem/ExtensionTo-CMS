
export type NoticeType = 'success' | 'error' | 'info';
export type Tab = 'dashboard' | 'posts' | 'extensions' | 'media' | 'analytics' | 'settings' | 'scheduler';
export type PostStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface BlogPost {
  id: string;
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
  internalLinks?: string[];
  views?: number;
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
}

export interface MediaItem {
  id: string;
  name: string;
  data: string;
  type: string;
  uploadDate: string;
}

export interface PostIndex {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishDate: string;
  status: PostStatus;
  wordCount: number;
  readingTime: number;
  seoScore: number;
  internalLinks: string[];
  author?: string;
  slug: string;
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

export interface ReportData {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalViews: number;
  totalUniqueVisitors: number;
  avgSessionDuration: number;
  avgBounceRate: number;
  postsPublished: number;
  topPosts: Record<string, number>;
  topReferrals: Record<string, number>;
}
