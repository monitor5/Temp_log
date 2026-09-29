import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Post } from '@/lib/api';

interface HeroCardProps {
  post: Post;
}

export function HeroCard({ post }: HeroCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const linkPath = post.type === 'project' ? `/project/${post.slug}` : `/story/${post.slug}`;
  
  const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <Link to={linkPath}>
      <motion.article
        className="relative aspect-cinema overflow-hidden bg-primary group cursor-pointer"
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
        <div className="gradient-overlay" />

        {/* 블러 오버레이 (호버 시) */}
        <motion.div
          className="absolute inset-0 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.3 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* 상단 라벨 */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
          <span className="text-caption text-surface/80 uppercase tracking-widest">
            {post.type}
          </span>
          <span className="text-caption text-surface/60">
            {formattedDate}
          </span>
        </div>

        {/* 콘텐츠 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          {/* 태그 */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-surface/10 backdrop-blur-sm text-surface/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 제목 */}
          <h2 className="font-serif text-display-sm lg:text-display text-surface mb-2 text-balance">
            {post.title}
          </h2>

          {/* Extendable 영역 */}
          <motion.div
            className="overflow-hidden"
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
              <span>View Project</span>
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

