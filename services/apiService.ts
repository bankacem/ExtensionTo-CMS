import { BlogPost } from '../types';

// In a real-world production app, this token should come from a secure auth flow (e.g., login response).
// For this application, it matches the hardcoded value in the backend worker.
const ADMIN_TOKEN = '0600231590mM@';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to fetch with status: ${response.status}`);
  }
  // Handle cases where the response might be empty (e.g., a 204 No Content)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return {};
};

export const api = {
  async getPublicPosts(): Promise<BlogPost[]> {
    const response = await fetch('/api/posts');
    return (await handleResponse(response)) as BlogPost[];
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const response = await fetch(`/api/posts/${slug}`);
    if (response.status === 404) {
      return null;
    }
    return (await handleResponse(response)) as BlogPost;
  },

  async getAdminPosts(): Promise<BlogPost[]> {
    const response = await fetch('/api/admin/posts', {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    return (await handleResponse(response)) as BlogPost[];
  },

  async savePost(post: any, isNew: boolean): Promise<{ success: boolean }> {
    const url = isNew ? '/api/admin/posts' : `/api/admin/posts/${post.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(post),
    });
    return (await handleResponse(response)) as { success: boolean };
  }
};
