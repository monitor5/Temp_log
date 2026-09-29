import { getAuthEpoch, advanceAuthEpoch } from '@/lib/authEpoch';
import { create } from 'zustand';
import { authApi, ApiError } from '@/lib/api';
interface Admin { id: string; username: string; }
interface AuthState {
  admin: Admin | null; isAuthenticated: boolean; ready: boolean; expired: boolean;
  setAuth: (admin: Admin) => void; check: () => Promise<void>; logout: () => Promise<void>; expire: () => void;
}
// Old key names are retained only to remove legacy credentials, never for branding or auth.
try { localStorage.removeItem('archlog_token'); localStorage.removeItem('archlog-auth'); } catch { /* Storage can be disabled. */ }
let checking: Promise<void> | null = null;
export const useAuthStore = create<AuthState>((set, get) => ({
  admin: null, isAuthenticated: false, ready: false, expired: false,
  setAuth: (admin) => { advanceAuthEpoch(); set({admin, isAuthenticated: true, ready: true, expired: false}); },
  expire: () => { advanceAuthEpoch(); set({admin: null, isAuthenticated: false, ready: true, expired: true}); },
  check: () => {
    if (checking) return checking;
    const current = getAuthEpoch();
    checking = (async () => {
      try {
        const result = await authApi.me();
        if (getAuthEpoch() === current) set({admin: result.admin, isAuthenticated: true, ready: true, expired: false});
      } catch (error) {
        if (getAuthEpoch() !== current) return;
        if (error instanceof ApiError && error.statusCode === 401) {
          const expired = get().isAuthenticated || get().expired;
          advanceAuthEpoch(); set({admin: null, isAuthenticated: false, ready: true, expired});
        } else if (!get().ready) set({ready: true});
      }
    })().finally(() => { checking = null; });
    return checking;
  },
  logout: async () => {
    try { await authApi.logout(); } catch (error) { if (!(error instanceof ApiError) || error.statusCode !== 401) throw error; }
    advanceAuthEpoch(); set({admin: null, isAuthenticated: false, ready: true, expired: false});
    try { localStorage.setItem('temp-log-logout', Date.now() + ':' + Math.random()); } catch { /* Focus recheck remains available. */ }
  },
}));
