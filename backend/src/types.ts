
export type PostStatus = 'draft' | 'published' | 'scheduled' | 'archived';

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
