import { useQueryClient } from '@tanstack/react-query';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
const PostDetail = lazy(() => import('./pages/PostDetail').then(module => ({default: module.PostDetail})));
import { Gallery } from './pages/Gallery';
import { About } from './pages/About';
import { Terms } from './pages/Terms';
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then(module => ({default: module.AdminLogin})));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(module => ({default: module.AdminDashboard})));
const AdminEditor = lazy(() => import('./pages/admin/AdminEditor').then(module => ({default: module.AdminEditor})));
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  const check = useAuthStore(state => state.check);
  const queryClient = useQueryClient();
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (previous.isAuthenticated && !state.isAuthenticated) { void queryClient.cancelQueries(); queryClient.clear(); }
    });
    const recheck = () => { if (document.visibilityState === 'visible') void check(); };
    const expired = () => useAuthStore.getState().expire();
    const storage = (event: StorageEvent) => { if (event.key === 'temp-log-logout') expired(); };
    void check();
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('storage', storage);
    window.addEventListener('temp-log:session-expired', expired);
    return () => { unsubscribe(); window.removeEventListener('focus', recheck); document.removeEventListener('visibilitychange', recheck); window.removeEventListener('storage', storage); window.removeEventListener('temp-log:session-expired', expired); };
  }, [check, queryClient]);
  return (
    <Suspense fallback={<p className="p-8 text-muted">불러오는 중...</p>}><Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="project/:slug" element={<PostDetail />} />
        <Route path="story/:slug" element={<PostDetail />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Navigate to="/about" replace />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<section className="container-narrow py-20 text-center"><h1 className="text-display-sm mb-4">페이지를 찾을 수 없습니다</h1><p className="mb-6">주소가 변경되었거나 존재하지 않는 페이지입니다.</p><Link to="/" className="btn-primary">홈으로 돌아가기</Link></section>} />
      </Route>
      
      {/* 관리자 라우트 */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/editor"
        element={
          <ProtectedRoute>
            <AdminEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/editor/:id"
        element={
          <ProtectedRoute>
            <AdminEditor />
          </ProtectedRoute>
        }
      />
    </Routes></Suspense>
  );
}

export default App;

