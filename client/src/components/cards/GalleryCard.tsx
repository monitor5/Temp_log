import { postTypeLabels } from '@/lib/postTypes';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Post } from '@/lib/api';

interface GalleryCardProps {
  post: Post;
}

export function GalleryCard({ post }: GalleryCardProps) {
  const linkPath = post.type === 'project' ? `/project/${post.slug}` : `/story/${post.slug}`;
  
  const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // 랜덤한 높이 비율 (Masonry 효과)
  const aspectRatios = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-[5/6]'];
  const randomAspect = aspectRatios[Math.floor(post.title.length % aspectRatios.length)];

  return (
    <Link to={linkPath}>
      <motion.article
        className="group relative overflow-hidden bg-surface-dark card-hover"
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        {/* 이미지 */}
        <div className={`relative ${randomAspect} overflow-hidden`}>
          {post.thumbnail ? (
            <img
              src={post.thumbnail}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-primary" />
          )}
          
          {/* 호버 오버레이 */}
          <motion.div
            className="absolute inset-0 bg-primary/60 flex items-center justify-center"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-surface font-medium">글 읽기 →</span>
          </motion.div>
        </div>

        {/* 정보 */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption text-muted uppercase tracking-wide">
              {postTypeLabels[post.type]}
            </span>
            <span className="text-caption text-muted">{formattedDate}</span>
          </div>
          
          <h3 className="font-medium text-primary group-hover:text-accent-ink transition-colors line-clamp-2">
            {post.title}
          </h3>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {post.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-surface text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.article>
    </Link>
  );
}

