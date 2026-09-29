import { getAuthEpoch } from './authEpoch';
const API_BASE = '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  protectedRequest?: boolean;
}

class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readResponse(response: Response): Promise<any> {
  let data;
  try { data = await response.json(); }
  catch { throw new ApiError(response.ok ? 502 : response.status, '서버 응답을 읽을 수 없습니다. 다시 시도해주세요.'); }
  if (!response.ok) throw new ApiError(response.status, typeof data?.error === 'string' ? data.error : '요청에 실패했습니다');
  if (!data || data.success !== true) throw new ApiError(502, '서버 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
  return data;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const sessionEpoch = getAuthEpoch();
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

  let response: Response;
  try { response = await fetch(`${API_BASE}${endpoint}`, config); }
  catch { throw new ApiError(0, '서버에 연결할 수 없습니다. 연결 상태를 확인하고 다시 시도해주세요.'); }
  if (response.status === 401 && options.protectedRequest && sessionEpoch === getAuthEpoch()) window.dispatchEvent(new Event('temp-log:session-expired'));
  return await readResponse(response) as T;
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
  
  logout: () => request<{success: boolean}>('/auth/logout', {method: 'POST', protectedRequest: true}),
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
    return request<PostsResponse>(`/posts${queryString ? `?${queryString}` : ''}`, {protectedRequest: params?.includeHidden === true});
  },

  getFeatured: () =>
    request<{ success: boolean; data: Post[] }>('/posts/featured'),

  getByIdOrSlug: (idOrSlug: string) =>
    request<{ success: boolean; data: Post }>(`/posts/${idOrSlug}`),

  create: (data: Partial<Post>) =>
    request<{ success: boolean; data: Post }>('/posts', { method: 'POST', body: data, protectedRequest: true }),

  update: (id: string, data: Partial<Post>) =>
    request<{ success: boolean; data: Post }>(`/posts/${id}`, { method: 'PATCH', body: data, protectedRequest: true }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/posts/${id}`, { method: 'DELETE', protectedRequest: true }),
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
  getByPost: (postId: string, page = 1) =>
    request<{ success: boolean; data: Comment[]; count: number; pagination: {page: number; totalPages: number} }>(`/comments?postId=${postId}&page=${page}&limit=20`),

  create: (data: { postId: string; author: string; password: string; content: string }) =>
    request<{ success: boolean; data: Comment }>('/comments', { method: 'POST', body: data }),

  delete: (id: string, password: string) =>
    request<{ success: boolean; message: string }>(`/comments/${id}`, {
      method: 'DELETE',
      body: { password },
    }),

  deleteByAdmin: (id: string) =>
    request<{ success: boolean; message: string }>(`/comments/${id}/admin`, { method: 'DELETE', protectedRequest: true }),
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
    const sessionEpoch = getAuthEpoch();
    const formData = new FormData();
    formData.append('file', file);

  
    
    let response: Response;
    try { response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'TempLog',
      },
      body: formData,
    }); } catch { throw new ApiError(0, '업로드 서버에 연결할 수 없습니다. 다시 시도해주세요.'); }

    if (response.status === 401 && sessionEpoch === getAuthEpoch()) window.dispatchEvent(new Event('temp-log:session-expired'));
    const data = await readResponse(response);

    return data as { success: boolean; data: { url: string; filename: string; mimetype: string; size: number } };
  },

  getLibrary: () =>
    request<{ success: boolean; data: MediaFile[]; count: number }>('/upload/library', {protectedRequest: true}),

  delete: (filename: string) =>
    request<{ success: boolean; message: string }>(`/upload/${filename}`, { method: 'DELETE', protectedRequest: true }),
};

export { ApiError };

