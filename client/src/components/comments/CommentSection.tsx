import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { commentsApi, type Comment } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function CommentSection({ postId }: {postId: string}) {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore(state => state.isAuthenticated);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState({author: '', password: '', content: ''});
  const [validation, setValidation] = useState('');
  const [deleteModal, setDeleteModal] = useState<{id: string; password: string; admin: boolean} | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comments', postId, page], queryFn: () => commentsApi.getByPost(postId, page),
  });
  const createMutation = useMutation({
    mutationFn: commentsApi.create,
    onSuccess: () => { void queryClient.invalidateQueries({queryKey: ['comments', postId]}); setPage(1); setFormData({author: '', password: '', content: ''}); setValidation(''); },
  });
  const deleteMutation = useMutation({
    mutationFn: (item: {id: string; password: string; admin: boolean}) => item.admin ? commentsApi.deleteByAdmin(item.id) : commentsApi.delete(item.id, item.password),
    onSuccess: () => { void queryClient.invalidateQueries({queryKey: ['comments', postId]}); dialog.current?.close(); setDeleteModal(null); },
  });
  const closeDelete = () => { if (deleteMutation.isPending) return; dialog.current?.close(); setDeleteModal(null); deleteMutation.reset(); };
  useEffect(() => { if (deleteModal && !dialog.current?.open) dialog.current?.showModal(); }, [deleteModal]);
  useEffect(() => { if (!isAdmin && deleteModal?.admin) { dialog.current?.close(); setDeleteModal(null); } }, [isAdmin, deleteModal?.admin]);
  useEffect(() => { if (data && page > Math.max(1, data.pagination.totalPages)) setPage(Math.max(1, data.pagination.totalPages)); }, [data, page]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setValidation(''); createMutation.reset();
    if (!formData.author.trim() || !formData.content.trim()) { setValidation('이름과 댓글 내용을 입력해주세요.'); return; }
    if (new TextEncoder().encode(formData.password).length > 72) { setValidation('비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.'); return; }
    createMutation.mutate({postId, ...formData, author: formData.author.trim(), content: formData.content.trim()});
  };
  const comments = data?.data || [];
  return (
    <section aria-label="댓글">
      <h3 className="font-serif text-heading mb-8">Comments <span className="text-muted text-lg">({data?.count || 0})</span></h3>
      <form onSubmit={submit} className="mb-12" aria-label="댓글 작성">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <input type="text" aria-label="댓글 작성자" placeholder="이름" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="input-field" required maxLength={50} disabled={createMutation.isPending} />
          <input type="password" aria-label="댓글 비밀번호" placeholder="비밀번호 (8자 이상, 삭제 시 필요)" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input-field" required minLength={8} maxLength={72} autoComplete="new-password" disabled={createMutation.isPending} />
        </div>
        <textarea aria-label="댓글 내용" placeholder="댓글을 작성해주세요" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="input-field resize-none mb-4" rows={4} required maxLength={1000} disabled={createMutation.isPending} />
        <button type="submit" className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? '작성 중...' : '댓글 작성'}</button>
        {(validation || createMutation.error) && <p role="alert" className="text-red-500 text-sm mt-2">{validation || createMutation.error?.message}</p>}
      </form>
      {isLoading ? <p role="status" className="text-muted py-8">댓글을 불러오는 중...</p> : error ? (
        <div role="alert" className="text-center py-8"><p>댓글을 불러오지 못했습니다.</p><button className="btn-ghost" onClick={() => void refetch()}>댓글 다시 불러오기</button></div>
      ) : comments.length === 0 ? <p className="text-center text-muted py-8">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p> : (
        <div className="space-y-6"><AnimatePresence>{comments.map(comment => <CommentItem key={comment._id} comment={comment} onDelete={() => {deleteMutation.reset(); setDeleteModal({id: comment._id, password: '', admin: isAdmin});}} />)}</AnimatePresence></div>
      )}
      {data && data.pagination.totalPages > 1 && <nav aria-label="댓글 페이지" className="flex justify-center gap-6 mt-8">
        <button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="disabled:opacity-30">이전</button>
        <span>{page} / {data.pagination.totalPages}</span>
        <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(value => value + 1)} className="disabled:opacity-30">다음</button>
      </nav>}
      <dialog ref={dialog} aria-labelledby="comment-delete-title" className="fixed inset-0 m-auto w-full max-w-md bg-surface p-6 border-0 shadow-xl backdrop:bg-black/50" style={{width: 'min(28rem, calc(100% - 2rem))'}} onCancel={event => {event.preventDefault(); closeDelete();}} onClick={event => {if (event.target === event.currentTarget) closeDelete();}}>
        <form onSubmit={event => {event.preventDefault(); if (deleteModal && !deleteMutation.isPending) deleteMutation.mutate(deleteModal);}}>
          <h4 id="comment-delete-title" className="font-medium text-lg mb-4">댓글 삭제</h4>
          {deleteModal?.admin ? <p className="mb-4">관리자 권한으로 이 댓글을 삭제합니다.</p> : <input aria-label="삭제 비밀번호" type="password" placeholder="비밀번호를 입력하세요" value={deleteModal?.password || ''} onChange={e => setDeleteModal(current => current ? {...current, password: e.target.value} : null)} className="input-field mb-4" required maxLength={72} autoComplete="off" autoFocus />}
          {deleteMutation.error && <p role="alert" className="text-red-500 text-sm mb-4">{deleteMutation.error.message}</p>}
          <div className="flex gap-3 justify-end"><button type="button" onClick={closeDelete} className="btn-ghost" disabled={deleteMutation.isPending}>취소</button><button type="submit" className="btn-primary bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>{deleteMutation.isPending ? '삭제 중...' : '삭제'}</button></div>
        </form>
      </dialog>
    </section>
  );
}
function CommentItem({comment, onDelete}: {comment: Comment; onDelete: () => void}) {
  const date = new Date(comment.createdAt).toLocaleDateString('ko-KR', {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'});
  return <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -10}} className="p-6 bg-surface-dark group">
    <div className="flex items-start justify-between gap-3 mb-3"><div className="min-w-0"><span className="font-medium [overflow-wrap:anywhere]">{comment.author}</span><span className="text-muted text-sm ml-3">{date}</span></div><button onClick={onDelete} className="shrink-0 p-2 hover:bg-surface transition-all focus-visible:ring-2 focus-visible:ring-primary" aria-label="댓글 삭제"><Trash2 className="w-4 h-4 text-muted hover:text-red-500" /></button></div>
    <p className="text-secondary whitespace-pre-wrap [overflow-wrap:anywhere]">{comment.content}</p>
  </motion.div>;
}
