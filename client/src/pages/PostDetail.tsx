import { MarkdownContent } from '@/components/MarkdownContent';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { postsApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { CommentSection } from '@/components/comments/CommentSection';

export function PostDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => postsApi.getByIdOrSlug(slug!),
    enabled: !!slug,
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

  if (error || !post) {
    return (
      <div className="container-narrow py-20 text-center">
        <h1 className="font-serif text-display-sm mb-4">404</h1>
        <p className="text-secondary">게시글을 찾을 수 없습니다.</p>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-caption text-muted uppercase tracking-widest">
            {post.type}
          </span>
          <h1 className="font-serif text-display-sm lg:text-display mt-2 mb-4 text-balance">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-secondary">
            <time>{formattedDate}</time>
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
            {post.media.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square overflow-hidden bg-surface-dark hover:opacity-90 transition-opacity"
              >
                <img
                  src={url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        </motion.section>
      )}

      {/* 댓글 섹션 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="container-narrow mt-16 pt-16 border-t border-border"
      >
        <CommentSection postId={post._id} />
      </motion.section>
    </motion.article>
  );
}

