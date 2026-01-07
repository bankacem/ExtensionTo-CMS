import { BlogPost, Extension } from '../types';

const API_URL = 'https://backend.extensionto.workers.dev/api';

const getAuthToken = () => {
    const savedAuth = localStorage.getItem('cms_auth_v4');
    if (savedAuth) {
      try {
        const user = JSON.parse(savedAuth);
        return user.token;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

export const getPosts = async (): Promise<BlogPost[]> => {
    const response = await fetch(`${API_URL}/posts`);
    return response.json();
};

export const createPost = async (post: Partial<BlogPost>): Promise<BlogPost> => {
    const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(post),
    });
    return response.json();
};

export const updatePost = async (id: string, post: Partial<BlogPost>): Promise<BlogPost> => {
    const response = await fetch(`${API_URL}/posts/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(post),
    });
    return response.json();
};

export const deletePost = async (id: string): Promise<void> => {
    await fetch(`${API_URL}/posts/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
        },
    });
};

export const getExtensions = async (): Promise<Extension[]> => {
    const response = await fetch(`${API_URL}/extensions`);
    return response.json();
};

export const createExtension = async (extension: Partial<Extension>): Promise<Extension> => {
    const response = await fetch(`${API_URL}/extensions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(extension),
    });
    return response.json();
};

export const updateExtension = async (id: string, extension: Partial<Extension>): Promise<Extension> => {
    const response = await fetch(`${API_URL}/extensions/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(extension),
    });
    return response.json();
};

export const deleteExtension = async (id: string): Promise<void> => {
    await fetch(`${API_URL}/extensions/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
        },
    });
};

export const login = async (credentials: {username: string, password: string}):Promise<{token: string}> => {
    const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });
    if (!response.ok) {
        throw new Error('Login failed');
    }
    return response.json();
}
