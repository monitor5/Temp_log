import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { commentsApi, type Comment } from '@/lib/api';

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    author: '',
    password: '',
    content: '',
  });
  const [deleteModal, setDeleteModal] = useState<{ id: string; password: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => commentsApi.getByPost(postId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { postId: string; author: string; password: string; content: string }) =>
      commentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setFormData({ author: '', password: '', content: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      commentsApi.delete(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setDeleteModal(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.author || !formData.password || !formData.content) return;
    createMutation.mutate({ postId, ...formData });
  };

  const handleDelete = () => {
    if (deleteModal) {
      deleteMutation.mutate(deleteModal);
    }
  };

  const comments = data?.data || [];

  return (
    <div>
      <h3 className="font-serif text-heading mb-8">
        Comments <span className="text-muted text-lg">({comments.length})</span>
      </h3>

      {/* 댓글 작성 폼 */}
      <form onSubmit={handleSubmit} className="mb-12">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="이름"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (8자 이상, 삭제 시 필요)"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="input-field"
            required
            minLength={8}
          />
        </div>
        <textarea
          placeholder="댓글을 작성해주세요"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="input-field resize-none mb-4"
          rows={4}
          required
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? '작성 중...' : '댓글 작성'}
        </button>
        {createMutation.isError && (
          <p className="text-red-500 text-sm mt-2">
            댓글 작성에 실패했습니다. 다시 시도해주세요.
          </p>
        )}
      </form>

      {/* 댓글 목록 */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-surface-dark w-1/4 mb-2" />
              <div className="h-16 bg-surface-dark" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-muted py-8">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {comments.map((comment: Comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                onDelete={(password) => setDeleteModal({ id: comment._id, password })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <AnimatePresence>
        {deleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setDeleteModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                       bg-surface p-6 z-50 w-full max-w-md shadow-xl"
            >
              <h4 className="font-medium text-lg mb-4">댓글을 삭제하시겠습니까?</h4>
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={deleteModal.password}
                onChange={(e) => setDeleteModal({ ...deleteModal, password: e.target.value })}
                className="input-field mb-4"
              />
              {deleteMutation.isError && (
                <p className="text-red-500 text-sm mb-4">
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="btn-ghost"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-primary bg-red-600 hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommentItem({
  comment,
  onDelete,
}: {
  comment: Comment;
  onDelete: (password: string) => void;
}) {
  const formattedDate = new Date(comment.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6 bg-surface-dark group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-medium">{comment.author}</span>
          <span className="text-muted text-sm ml-3">{formattedDate}</span>
        </div>
        <button
          onClick={() => onDelete('')}
          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-surface transition-all"
          aria-label="댓글 삭제"
        >
          <Trash2 className="w-4 h-4 text-muted hover:text-red-500" />
        </button>
      </div>
      <p className="text-secondary whitespace-pre-wrap">{comment.content}</p>
    </motion.div>
  );
}

