const API_BASE = '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  

  
  const config: RequestInit = {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'TempLog',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.error || '요청에 실패했습니다');
  }

  return data;
}

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    request<{ success: boolean; admin: { id: string; username: string } }>(
      '/auth/login',
      { method: 'POST', body: { username, password } }
    ),
  
  me: () =>
    request<{ success: boolean; admin: { id: string; username: string } }>('/auth/me'),
  
  logout: () => request<{success: boolean}>('/auth/logout', {method: 'POST'}),
};

// Posts API
export interface Post {
  _id: string;
  type: 'project' | 'essay';
  title: string;
  slug: string;
  thumbnail?: string;
  content: string;
  tags: string[];
  media: string[];
  isHidden: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostsResponse {
  success: boolean;
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const postsApi = {
  getAll: (params?: {
    type?: 'project' | 'essay';
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    query?: string;
    tags?: string;
    includeHidden?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return request<PostsResponse>(`/posts${queryString ? `?${queryString}` : ''}`);
  },

  getFeatured: () =>
    request<{ success: boolean; data: Post[] }>('/posts/featured'),

  getByIdOrSlug: (idOrSlug: string) =>
    request<{ success: boolean; data: Post }>(`/posts/${idOrSlug}`),

  create: (data: Partial<Post>) =>
    request<{ success: boolean; data: Post }>('/posts', { method: 'POST', body: data }),

  update: (id: string, data: Partial<Post>) =>
    request<{ success: boolean; data: Post }>(`/posts/${id}`, { method: 'PATCH', body: data }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/posts/${id}`, { method: 'DELETE' }),
};

// Comments API
export interface Comment {
  _id: string;
  postId: string;
  author: string;
  content: string;
  createdAt: string;
}

export const commentsApi = {
  getByPost: (postId: string) =>
    request<{ success: boolean; data: Comment[]; count: number }>(`/comments?postId=${postId}`),

  create: (data: { postId: string; author: string; password: string; content: string }) =>
    request<{ success: boolean; data: Comment }>('/comments', { method: 'POST', body: data }),

  delete: (id: string, password: string) =>
    request<{ success: boolean; message: string }>(`/comments/${id}`, {
      method: 'DELETE',
      body: { password },
    }),

  deleteByAdmin: (id: string) =>
    request<{ success: boolean; message: string }>(`/comments/${id}/admin`, { method: 'DELETE' }),
};

// Upload API
export interface MediaFile {
  filename: string;
  url: string;
  size: number;
  createdAt: string;
  type: 'image' | 'video' | 'file';
}

export const uploadApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

  
    
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'TempLog',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.error || '업로드에 실패했습니다');
    }

    return data as { success: boolean; data: { url: string; filename: string; mimetype: string; size: number } };
  },

  getLibrary: () =>
    request<{ success: boolean; data: MediaFile[]; count: number }>('/upload/library'),

  delete: (filename: string) =>
    request<{ success: boolean; message: string }>(`/upload/${filename}`, { method: 'DELETE' }),
};

export { ApiError };

