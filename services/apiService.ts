import { DEFAULT_POSTS } from '../constants';
import { BlogPost } from '../types';

// NOTE: In a sandboxed environment without a live backend, the API service
// is mocked to return default data. This prevents network errors (like 404s)
// and allows the application to be fully interactive with sample content.

export const api = {
  async getPublicPosts(): Promise<BlogPost[]> {
    console.log("Mock API: Fetching public posts.");
    // We return a copy to prevent accidental mutation of the constant
    return Promise.resolve([...DEFAULT_POSTS]);
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    console.log(`Mock API: Fetching post with slug: ${slug}`);
    const post = DEFAULT_POSTS.find(p => p.slug === slug) || null;
    
    // Simulate the server-side internal linking logic for a more realistic preview
    if (post) {
      const allPostTitles = DEFAULT_POSTS.map(p => p.title).filter(title => title !== post.title);
      let linkedContent = post.content;

      allPostTitles.forEach(title => {
        const titleRegex = new RegExp(`\\b(${title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\b`, 'gi');
        const targetPost = DEFAULT_POSTS.find(p => p.title === title);
        if (targetPost && !linkedContent.includes(`href="/post/${targetPost.slug}"`)) {
          linkedContent = linkedContent.replace(titleRegex, `<a href="/post/${targetPost.slug}" class="internal-link text-indigo-600 hover:underline font-bold">$1</a>`);
        }
      });
      return Promise.resolve({ ...post, content: linkedContent });
    }
    
    return Promise.resolve(null);
  },

  async getAdminPosts(): Promise<BlogPost[]> {
    console.log("Mock API: Fetching admin posts.");
    return Promise.resolve([...DEFAULT_POSTS]);
  },

  async savePost(post: any, isNew: boolean): Promise<{ success: boolean }> {
    console.log(`Mock API: Simulating save for post (isNew: ${isNew})`, post);
    // In a real application, this would send data to the backend.
    // Here, we just simulate a successful response.
    // For a more advanced mock, one could update an in-memory array.
    if (isNew) {
      console.log('Simulating new post creation...');
    } else {
      console.log(`Simulating update for post ID: ${post.id}`);
    }
    return Promise.resolve({ success: true });
  }
};