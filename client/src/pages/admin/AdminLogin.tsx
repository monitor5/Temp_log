import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function AdminLogin() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 이미 로그인된 경우 대시보드로 이동
  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.login(formData.username, formData.password);
      setAuth(response.admin);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* 로고 */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-surface/10 mb-6"
          >
            <Lock className="w-8 h-8 text-surface" />
          </motion.div>
          <h1 className="font-serif text-2xl text-surface mb-2">Arch-Log Admin</h1>
          <p className="text-surface/60 text-sm">관리자 로그인이 필요합니다</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="사용자 이름"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-4 bg-surface/10 border border-surface/20 text-surface 
                       placeholder:text-surface/40 focus:outline-none focus:border-surface/50
                       transition-colors"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-4 bg-surface/10 border border-surface/20 text-surface 
                       placeholder:text-surface/40 focus:outline-none focus:border-surface/50
                       transition-colors"
              required
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-surface text-primary font-medium
                     hover:bg-surface/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 홈으로 돌아가기 */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-surface/60 text-sm hover:text-surface transition-colors"
          >
            ← 홈으로 돌아가기
          </a>
        </div>
      </motion.div>
    </div>
  );
}

