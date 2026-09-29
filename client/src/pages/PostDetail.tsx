import { postTypeLabels } from '@/lib/postTypes';
import { useState } from 'react';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ApiError, postsApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { CommentSection } from '@/components/comments/CommentSection';

export function PostDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => postsApi.getByIdOrSlug(slug!),
    enabled: !!slug,
    retry: (count, failure) => !(failure instanceof ApiError && failure.statusCode === 404) && count < 1,
  });

  const post = data?.data;

  if (isLoading) {
    return (
      <div className="container-narrow py-12">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="aspect-cinema w-full mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error && !(error instanceof ApiError && error.statusCode === 404)) {
    return <div className="container-narrow py-20 text-center">
      <h1 className="font-serif text-heading mb-4">게시글을 불러오지 못했습니다</h1>
      <p role="alert" className="text-secondary">{error instanceof Error ? error.message : '연결 상태를 확인하고 다시 시도해주세요.'}</p>
      <button type="button" onClick={() => void refetch()} disabled={isFetching} className="btn-primary mt-4">다시 시도</button>
    </div>;
  }

  if (error || !post) {
    return (
      <div className="container-narrow py-20 text-center">
        <h1 className="font-serif text-display-sm mb-4">404</h1>
        <p className="text-secondary">게시글을 찾을 수 없습니다.</p>
        <Link to="/gallery" className="btn-ghost mt-4">전체 글 보기</Link>
      </div>
    );
  }

  const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="py-12"
    >
      {/* 헤더 */}
      <header className="container-narrow mb-12">
        {post.isHidden && <p role="status" className="mb-4 text-sm text-secondary">비공개 게시글 · 관리자에게만 표시됩니다.</p>}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-caption text-muted uppercase tracking-widest">
            {postTypeLabels[post.type]}
          </span>
          <h1 className="font-serif text-display-sm lg:text-display mt-2 mb-4 text-balance">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-secondary">
            <time dateTime={post.createdAt}>{formattedDate}</time>
            {post.tags.length > 0 && (
              <>
                <span className="text-border">•</span>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-sm px-3 py-1 bg-surface-dark"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </header>

      {/* 썸네일 */}
      {post.thumbnail && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <img
            src={post.thumbnail}
            alt={post.title}
            className="w-full max-h-[70vh] object-cover"
          />
        </motion.div>
      )}

      {/* 콘텐츠 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="container-narrow"
      >
        <div className="prose max-w-prose mx-auto">
          <MarkdownContent>{post.content}</MarkdownContent>
        </div>
      </motion.div>

      {/* 미디어 갤러리 */}
      {post.media.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="container-narrow mt-16"
        >
          <h3 className="text-caption text-muted uppercase tracking-widest mb-6">
            Media Gallery
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {post.media.map((url, index) => <MediaItem key={`${url}-${index}`} url={url} index={index} />)}
          </div>
        </motion.section>
      )}

      {/* 댓글 섹션 */}
      {!post.isHidden && <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="container-narrow mt-16 pt-16 border-t border-border"
      >
        <CommentSection key={post._id} postId={post._id} />
      </motion.section>}
    </motion.article>
  );
}

function MediaItem({ url, index }: { url: string; index: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  let filename = '';
  try { filename = decodeURIComponent(new URL(url, window.location.origin).pathname.split('/').pop() || ''); } catch { /* Fall back to an attachment label. */ }
  const extension = filename.split('.').pop()?.toLowerCase();
  const video = ['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(extension || '');
  const image = !filename.includes('.') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(extension || '');
  if (video) return <div className="min-w-0 bg-surface-dark">
    <video src={url} controls preload="metadata" aria-label={`첨부 동영상 ${index + 1}`} className="w-full aspect-square object-contain" />
    <a href={url} target="_blank" rel="noopener noreferrer" className="block p-3 text-sm underline">동영상 {index + 1} 새 창에서 열기</a>
  </div>;
  return <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`첨부파일 ${index + 1} 새 창에서 열기`}
    className="min-w-0 block aspect-square overflow-hidden bg-surface-dark hover:opacity-90 transition-opacity">
    {image && !imageFailed ? <img src={url} alt={`첨부 이미지 ${index + 1}`} loading="lazy" onError={() => setImageFailed(true)} className="w-full h-full object-cover" />
      : <span className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <span className="font-medium">{extension === 'pdf' ? 'PDF 문서' : '첨부파일'} {index + 1}</span>
        <span className="text-sm text-secondary break-all">{filename || '파일 열기'}</span>
        <span className="text-sm underline">새 창에서 열기</span>
      </span>}
  </a>;
}
