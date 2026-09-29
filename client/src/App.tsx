import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
const PostDetail = lazy(() => import('./pages/PostDetail').then(module => ({default: module.PostDetail})));
import { Gallery } from './pages/Gallery';
import { Contact } from './pages/Contact';
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then(module => ({default: module.AdminLogin})));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(module => ({default: module.AdminDashboard})));
const AdminEditor = lazy(() => import('./pages/admin/AdminEditor').then(module => ({default: module.AdminEditor})));
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  const check = useAuthStore(state => state.check);
  useEffect(() => { void check(); }, [check]);
  return (
    <Suspense fallback={<p className="p-8 text-muted">불러오는 중...</p>}><Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="project/:slug" element={<PostDetail />} />
        <Route path="story/:slug" element={<PostDetail />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="contact" element={<Contact />} />
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

