import { postTypeLabels } from '@/lib/postTypes';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Post } from '@/lib/api';

interface HeroCardProps {
  post: Post;
  hasPagination?: boolean;
}

export function HeroCard({ post, hasPagination = false }: HeroCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const linkPath = post.type === 'project' ? `/project/${post.slug}` : `/story/${post.slug}`;
  
  const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <Link to={linkPath} title={post.title} className="block focus-visible:outline focus-visible:outline-4 focus-visible:outline-accent">
      <motion.article
        className="relative w-full min-w-0 aspect-cinema min-h-[240px] lg:min-h-[320px] overflow-hidden bg-primary group cursor-pointer"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        {/* 배경 이미지 */}
        {post.thumbnail ? (
          <motion.img
            src={post.thumbnail}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary" />
        )}

        {/* 그라디언트 오버레이 */}
        <div className="gradient-overlay bg-black/50" />

        {/* 블러 오버레이 (호버 시) */}
        <motion.div
          className="absolute inset-0 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.3 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* 상단 라벨 */}
        <div className="absolute top-3 left-3 right-3 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between gap-2">
          <span className="text-caption text-surface bg-black/70 px-2 py-1 uppercase tracking-widest">
            {postTypeLabels[post.type]}
          </span>
          <span className="text-caption text-surface bg-black/70 px-2 py-1 whitespace-nowrap">
            {formattedDate}
          </span>
        </div>

        {/* 콘텐츠 */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 ${hasPagination ? 'pb-16 sm:pb-16 lg:pb-20' : ''}`}>
          {/* 태그 */}
          {post.tags.length > 0 && (
            <div className="flex gap-2 mb-3 min-w-0">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  title={tag}
                  className="min-w-0 max-w-[40%] truncate text-xs px-2 py-1 bg-black/70 text-surface"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 제목 */}
          <h2 className="font-serif text-2xl sm:text-display-sm lg:text-display text-surface mb-2 text-balance [overflow-wrap:anywhere] line-clamp-2">
            {post.title}
          </h2>

          {/* Extendable 영역 */}
          <motion.div
            className="hidden lg:block overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: isHovered ? 'auto' : 0 }}
            transition={{ duration: 0.3 }}
          >
            {post.content && (
              <p className="text-surface/80 mt-4 line-clamp-2 max-w-2xl">
                {post.content.slice(0, 150).replace(/[#*\[\]]/g, '')}...
              </p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 text-surface font-medium">
              <span>글 읽기</span>
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
          </motion.div>
        </div>

        {/* 포커스 링 (접근성) */}
        <motion.div
          className="absolute inset-0 border-4 border-accent pointer-events-none"
          initial={{ opacity: 0 }}
          whileFocus={{ opacity: 1 }}
        />
      </motion.article>
    </Link>
  );
}
