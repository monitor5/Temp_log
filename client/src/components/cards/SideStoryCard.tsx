import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Post } from '@/lib/api';

interface SideStoryCardProps {
  post: Post;
  compact?: boolean;
}

export function SideStoryCard({ post, compact }: SideStoryCardProps) {
  const linkPath = post.type === 'project' ? `/project/${post.slug}` : `/story/${post.slug}`;
  
  const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  if (compact) {
    return (
      <Link to={linkPath}>
        <motion.article
          className="flex gap-4 p-3 bg-surface-dark hover:bg-border transition-colors group"
          whileHover={{ x: 4 }}
        >
          {post.thumbnail && (
            <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-primary">
              <img
                src={post.thumbnail}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-caption text-muted mb-1">{formattedDate}</p>
            <h4 className="font-medium text-primary line-clamp-2">{post.title}</h4>
          </div>
        </motion.article>
      </Link>
    );
  }

  return (
    <Link to={linkPath}>
      <motion.article
        className="group relative overflow-hidden"
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex gap-4">
          {/* 썸네일 */}
          <div className="w-24 h-24 flex-shrink-0 overflow-hidden bg-primary">
            {post.thumbnail ? (
              <img
                src={post.thumbnail}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-110 
                         transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-secondary to-primary" />
            )}
          </div>

          {/* 텍스트 */}
          <div className="flex-1 min-w-0 py-1">
            <p className="text-caption text-muted mb-2">{formattedDate}</p>
            <h4 className="font-medium text-primary line-clamp-2 group-hover:text-accent-ink transition-colors">
              {post.title}
            </h4>
            <span className="text-xs text-muted mt-2 inline-block uppercase tracking-wide">
              {post.type}
            </span>
          </div>
        </div>

        {/* 호버 라인 */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent"
          initial={{ scaleY: 0 }}
          whileHover={{ scaleY: 1 }}
          transition={{ duration: 0.2 }}
        />
      </motion.article>
    </Link>
  );
}

