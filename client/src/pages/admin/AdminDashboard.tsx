import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, LogOut, Star } from 'lucide-react';
import { postsApi, type Post } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/Skeleton';

export function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { admin, logout } = useAuthStore();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-posts', page],
    queryFn: () => postsApi.getAll({ includeHidden: true, limit: 20, page }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Post> }) =>
      postsApi.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => postsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });

  const handleLogout = async () => {
    try { await logout(); queryClient.clear(); } catch { alert('로그아웃에 실패했습니다. 다시 시도해주세요.'); return; }
    navigate('/admin');
  };

  const handleToggleHidden = (post: Post) => {
    updateMutation.mutate({ id: post._id, data: { isHidden: !post.isHidden } });
  };

  const handleToggleFeatured = (post: Post) => {
    updateMutation.mutate({ id: post._id, data: { isFeatured: !post.isFeatured } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  useEffect(() => { if (data && page > Math.max(1, data.pagination.totalPages)) setPage(Math.max(1, data.pagination.totalPages)); }, [data, page]);
  const posts = data?.data || [];

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* 헤더 */}
      <header className="bg-primary text-surface sticky top-0 z-40">
        <div className="container-narrow flex items-center justify-between h-16">
          <Link to="/admin/dashboard" className="font-serif text-xl">
            Arch-Log Admin
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-surface/60 text-sm hidden sm:block">
              {admin?.username}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-surface/10 transition-colors"
              aria-label="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container-narrow py-8">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">게시글 관리</h1>
            <p className="text-muted mt-1">총 {data?.pagination.total || 0}개의 게시글</p>
          </div>
          <Link to="/admin/editor" className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">새 게시글</span>
          </Link>
        </div>

        {error && <p role="alert" className="text-red-600 mb-4">{error.message}</p>}
        {(updateMutation.isError || deleteMutation.isError) && <p role="alert" className="text-red-600 mb-4">변경에 실패했습니다. 다시 시도해주세요.</p>}
        {/* 게시글 목록 */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-surface">
            <p className="text-muted mb-4">아직 게시글이 없습니다</p>
            <Link to="/admin/editor" className="btn-primary">
              첫 게시글 작성하기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: Post, index: number) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`bg-surface p-6 flex items-start gap-6 group
                          ${post.isHidden ? 'opacity-60' : ''}`}
              >
                {/* 썸네일 */}
                <div className="w-24 h-24 flex-shrink-0 bg-surface-dark overflow-hidden">
                  {post.thumbnail ? (
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      No img
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {post.type}
                        </span>
                        {post.isFeatured && (
                          <Star className="w-4 h-4 text-accent fill-accent" />
                        )}
                        {post.isHidden && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600">
                            숨김
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-lg truncate">{post.title}</h3>
                      <p className="text-sm text-muted mt-1">
                        {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        {post.tags.length > 0 && (
                          <span className="ml-2">
                            · {post.tags.slice(0, 3).join(', ')}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleFeatured(post)}
                        className={`p-2 transition-colors ${
                          post.isFeatured
                            ? 'text-accent hover:bg-accent/10'
                            : 'text-muted hover:bg-surface-dark'
                        }`}
                        title={post.isFeatured ? '홈 고정 해제' : '홈에 고정'}
                      >
                        <Star className={`w-5 h-5 ${post.isFeatured ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleToggleHidden(post)}
                        className="p-2 text-muted hover:bg-surface-dark transition-colors"
                        title={post.isHidden ? '공개' : '숨김'}
                      >
                        {post.isHidden ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                      <Link
                        to={`/admin/editor/${post._id}`}
                        className="p-2 text-muted hover:bg-surface-dark transition-colors"
                        title="수정"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(post._id)}
                        className="p-2 text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <nav aria-label="게시글 페이지" className="flex justify-center items-center gap-6 mt-8">
          <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="disabled:opacity-30">이전</button>
          <span>{page} / {Math.max(1, data?.pagination.totalPages || 1)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.pagination.totalPages || 1)} className="disabled:opacity-30">다음</button>
        </nav>
      </main>
    </div>
  );
}

