const API_URL = 'https://backend.extensionto.workers.dev/api';
const getAuthToken = () => {
    const savedAuth = localStorage.getItem('cms_auth_v4');
    if (savedAuth) {
        try {
            const user = JSON.parse(savedAuth);
            return user.token;
        }
        catch (e) {
            return null;
        }
    }
    return null;
};
export const getPosts = async () => {
    const response = await fetch(`${API_URL}/posts`);
    return response.json();
};
export const createPost = async (post) => {
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
export const updatePost = async (id, post) => {
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
export const deletePost = async (id) => {
    await fetch(`${API_URL}/posts/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
        },
    });
};
export const getExtensions = async () => {
    const response = await fetch(`${API_URL}/extensions`);
    return response.json();
};
export const createExtension = async (extension) => {
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
export const updateExtension = async (id, extension) => {
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
export const deleteExtension = async (id) => {
    await fetch(`${API_URL}/extensions/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
        },
    });
};
export const login = async (credentials) => {
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
};
//# sourceMappingURL=api.js.map