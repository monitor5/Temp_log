import { create } from 'zustand';
import { authApi } from '@/lib/api';
interface Admin { id: string; username: string; }
interface AuthState {
  admin: Admin | null; isAuthenticated: boolean; ready: boolean;
  setAuth: (admin: Admin) => void; check: () => Promise<void>; logout: () => Promise<void>;
}
// Remove legacy persisted credentials; session cookies are now HttpOnly.
localStorage.removeItem('archlog_token');
localStorage.removeItem('archlog-auth');
export const useAuthStore = create<AuthState>((set) => ({
  admin: null, isAuthenticated: false, ready: false,
  setAuth: (admin) => set({admin, isAuthenticated: true, ready: true}),
  check: async () => {
    try { const result = await authApi.me(); set({admin: result.admin, isAuthenticated: true, ready: true}); }
    catch { set({admin: null, isAuthenticated: false, ready: true}); }
  },
  logout: async () => { await authApi.logout(); set({admin: null, isAuthenticated: false, ready: true}); },
}));
