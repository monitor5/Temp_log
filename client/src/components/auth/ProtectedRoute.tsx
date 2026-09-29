import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, ready } = useAuthStore();

  if (!ready) return <p className="p-8">로그인 상태 확인 중...</p>;

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

