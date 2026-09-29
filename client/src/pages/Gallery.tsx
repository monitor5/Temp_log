import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { postsApi, type Post } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { GalleryCard } from '@/components/cards/GalleryCard';

export function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  
  const type = searchParams.get('type') as 'project' | 'essay' | null;
  const query = searchParams.get('query') || undefined;
  const sort = searchParams.get('sort') || 'createdAt';
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', { type, query, sort, order, page }],
    queryFn: () =>
      postsApi.getAll({
        type: type || undefined,
        query,
        sort,
        order,
        limit: 24, page,
      }),
  });

  const posts = data?.data || [];

  const breakpointColumns = {
    default: 3,
    1024: 2,
    640: 1,
  };

  const title = type
    ? type === 'project'
      ? 'Projects'
      : 'Stories'
    : 'Browse';

  return (
    <div className="container-narrow py-12">
      {/* 헤더 */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="font-serif text-display-sm lg:text-display mb-4">{title}</h1>
        {query && (
          <p className="text-secondary">
            &quot;{query}&quot; 검색 결과 ({data?.pagination.total || 0}건)
          </p>
        )}
        {!query && (
          <p className="text-secondary">
            {type
              ? type === 'project'
                ? '건축 프로젝트 아카이브'
                : '에세이 및 글 모음'
              : '모든 작업물 둘러보기'}
          </p>
        )}
      </motion.header>

      {/* 로딩 */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[4/5]" />
            </div>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="text-center py-20">
          <p className="text-secondary">콘텐츠를 불러오는데 실패했습니다.</p>
        </div>
      )}

      {/* 결과 없음 */}
      {!isLoading && !error && posts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-secondary">아직 게시글이 없습니다.</p>
        </div>
      )}

      {/* Masonry 그리드 */}
      {!isLoading && !error && posts.length > 0 && (
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex -ml-6 w-auto"
          columnClassName="pl-6 bg-clip-padding"
        >
          {posts.map((post: Post, index: number) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="mb-6"
            >
              <GalleryCard post={post} />
            </motion.div>
          ))}
        </Masonry>
      )}
      {data && data.pagination.totalPages > 1 && <nav aria-label="갤러리 페이지" className="flex justify-center gap-6 mt-8">
        <button disabled={page <= 1} onClick={() => {const next = new URLSearchParams(searchParams); next.set('page', String(page - 1)); setSearchParams(next);}} className="disabled:opacity-30">이전</button>
        <span>{page} / {data.pagination.totalPages}</span>
        <button disabled={page >= data.pagination.totalPages} onClick={() => {const next = new URLSearchParams(searchParams); next.set('page', String(page + 1)); setSearchParams(next);}} className="disabled:opacity-30">다음</button>
      </nav>}
    </div>
  );
}

