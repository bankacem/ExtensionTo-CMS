import { DEFAULT_POSTS } from '../constants.ts';
import { BlogPost } from '../types.ts';

const API_URL = 'https://backend.extensionto.workers.dev'; 
const TOKEN = '0600231590mM@';

export const api = {
  async getPublicPosts(): Promise<BlogPost[]> {
    try {
      const res = await fetch(`${API_URL}/api/posts`);
      if (!res.ok) return DEFAULT_POSTS;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_POSTS;
    } catch (err) {
      console.error("Failed to fetch public posts, returning default.", err);
      return DEFAULT_POSTS;
    }
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const res = await fetch(`${API_URL}/api/posts/${slug}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error(`Failed to fetch post by slug ${slug}, returning default.`, err);
      return DEFAULT_POSTS.find(p => p.slug === slug) || null;
    }
  },

  async getAdminPosts(): Promise<BlogPost[]> {
    try {
      const res = await fetch(`${API_URL}/api/admin/posts`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });
      if (!res.ok) return DEFAULT_POSTS;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_POSTS;
    } catch (err) {
      console.error("Failed to fetch admin posts, returning default.", err);
      return DEFAULT_POSTS;
    }
  },

  async savePost(post: any, isNew: boolean) {
    const method = isNew ? 'POST' : 'PUT';
    const url = isNew ? `${API_URL}/api/admin/posts` : `${API_URL}/api/admin/posts/${post.id}`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}` 
        },
        body: JSON.stringify(post)
      });
      if (!res.ok) {
        const errorBody = await res.text();
        console.error('Cloud sync failed with status:', res.status, 'and body:', errorBody);
        throw new Error('Cloud sync failed');
      }
      return await res.json();
    } catch (err) {
      console.warn('Sync failed, changes may not be saved.', err);
      throw err; // Re-throw to be caught by the component
    }
  }
};