import { BlogPost } from '../types';

// The admin token is retrieved from local storage for security.
// It should be set by the user through a secure admin interface.
const getAdminToken = (): string => {
  // Ensure this code only runs on the client-side
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ADMIN_TOKEN') || '';
  }
  return '';
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to fetch with status: ${response.status}`);
  }
  // All successful responses are expected to be JSON.
  return response.json();
};

export const api = {
  async getPublicPosts(): Promise<BlogPost[]> {
    const response = await fetch('/api/posts');
    return handleResponse<BlogPost[]>(response);
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const response = await fetch(`/api/posts/${slug}`);
    if (response.status === 404) {
      return null;
    }
    return handleResponse<BlogPost>(response);
  },

  async getAdminPosts(): Promise<BlogPost[]> {
    const response = await fetch('/api/admin/posts', {
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`
      }
    });
    return handleResponse<BlogPost[]>(response);
  },

  async savePost(post: any, isNew: boolean): Promise<{ success: boolean }> {
    const url = isNew ? '/api/admin/posts' : `/api/admin/posts/${post.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAdminToken()}`
      },
      body: JSON.stringify(post),
    });
    return handleResponse<{ success: boolean }>(response);
  }
};
