import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const API_BASE_URL = API_ENDPOINTS.BASE_URL;

// Create axios instance with interceptors
const adminApi = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
adminApi.interceptors.request.use(
  (config) => {
    // Token will be added by the calling component
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.error('Authentication failed');
    } else if (error.response?.status === 403) {
      // Not authorized (not admin)
      console.error('Admin access required');
    }
    return Promise.reject(error);
  }
);

export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt?: string;
}

export interface AnalyticsOverview {
  totalPlays: number;
  uniqueUsers: number;
  uniqueSongs: number;
  totalUsers: number;
}

export interface TopSong {
  songId: string;
  songTitle: string;
  artist: string;
  playCount: number;
}

export interface TopUser {
  userId: string;
  userEmail: string;
  playCount: number;
}

export interface PlaysByDate {
  date: string;
  plays: number;
}

export interface Analytics {
  overview: AnalyticsOverview;
  topSongs: TopSong[];
  topUsers: TopUser[];
  playsByDate: PlaysByDate[];
}

export interface UserAnalytics {
  userId: string;
  userEmail: string;
  totalPlays: number;
  uniqueSongs: number;
  firstPlay: string;
  lastPlay: string;
}

// Song Management
export const uploadSong = async (token: string, formData: FormData) => {
  const response = await adminApi.post('/api/admin/songs/upload', formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getSongs = async (token: string) => {
  const response = await adminApi.get('/api/admin/songs', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateSong = async (token: string, songId: number, songData: Partial<Song>) => {
  const response = await adminApi.put(`/api/admin/songs/${songId}`, songData, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const deleteSong = async (token: string, songId: number) => {
  const response = await adminApi.delete(`/api/admin/songs/${songId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

// Analytics
export const getAnalytics = async (token: string): Promise<{ success: boolean; analytics: Analytics }> => {
  const response = await adminApi.get('/api/admin/analytics', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getUserAnalytics = async (token: string): Promise<{ success: boolean; users: UserAnalytics[] }> => {
  const response = await adminApi.get('/api/admin/analytics/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

// Record play (for regular users)
export const recordPlay = async (token: string, playData: {
  songId: string;
  songTitle?: string;
  artist?: string;
  duration?: number;
}) => {
  const response = await adminApi.post('/api/play', playData, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

// Test analytics endpoint (Admin only)
export const testAnalytics = async (token: string) => {
  const response = await adminApi.get('/api/admin/analytics/test', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
};

// ─── User Management ────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  firebaseUid?: string;
  email: string;
  name: string;
  profilePicture?: string;
  isBlocked: boolean;
  isActive: boolean;
  blockedAt?: string;
  blockedReason?: string;
  createdAt: string;
  likedSongsCount: number;
}

export const getUsers = async (token: string): Promise<{ success: boolean; users: AdminUser[]; total: number }> => {
  const response = await adminApi.get('/api/admin/users', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
};

export const blockUser = async (token: string, uid: string, reason?: string) => {
  const response = await adminApi.post(`/api/admin/users/${uid}/block`, { reason }, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
};

export const unblockUser = async (token: string, uid: string) => {
  const response = await adminApi.post(`/api/admin/users/${uid}/unblock`, {}, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
};

// ─── Featured Songs ──────────────────────────────────────────────────────

export interface FeaturedSong {
  _id: string;
  songId: string;
  name: string;
  primaryArtists?: string;
  image?: any;
  url?: string;
  downloadUrl?: any;
  duration?: number;
  album?: any;
  language?: string;
  year?: string;
  featuredAt: string;
  isActive: boolean;
  order: number;
}

export const getFeaturedSongs = async (token: string): Promise<{ success: boolean; songs: FeaturedSong[] }> => {
  const response = await adminApi.get('/api/admin/featured-songs', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
};

export const addFeaturedSong = async (token: string, songData: Partial<FeaturedSong>) => {
  const response = await adminApi.post('/api/admin/featured-songs', songData, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
};

export const removeFeaturedSong = async (token: string, id: string) => {
  const response = await adminApi.delete(`/api/admin/featured-songs/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return response.data;
};

export const getPublicFeaturedSongs = async (): Promise<{ success: boolean; songs: FeaturedSong[] }> => {
  const response = await adminApi.get('/api/admin/featured-songs/public');
  return response.data;
};

// ─── Co-Admin Portal API ──────────────────────────────────────────────────

export interface CoAdminUser {
  _id: string;
  username: string;
  name: string;
  role: string;
  permissions: string[];
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

export const coAdminLogin = async (username: string, password: string): Promise<{ success: boolean; token: string; coAdmin: CoAdminUser }> => {
  const response = await adminApi.post('/api/admin/coadmin/login', { username, password });
  return response.data;
};

export const createCoAdmin = async (token: string, data: { username: string; password: string; name: string; permissions?: string[] }) => {
  const response = await adminApi.post('/api/admin/coadmin/create', data, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data;
};

export const getCoAdmins = async (token: string): Promise<{ success: boolean; coAdmins: CoAdminUser[] }> => {
  const response = await adminApi.get('/api/admin/coadmin/list', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data;
};

export const deleteCoAdmin = async (token: string, id: string) => {
  const response = await adminApi.delete(`/api/admin/coadmin/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data;
};
