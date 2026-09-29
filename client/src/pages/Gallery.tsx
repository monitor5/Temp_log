import { postTypeLabels } from '@/lib/postTypes';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { postsApi, type Post } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { GalleryCard } from '@/components/cards/GalleryCard';
import { useSearchStore } from '@/store/searchStore';

export function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = Number(searchParams.get('page') || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 100000 ? rawPage : 1;
  const rawType = searchParams.get('type');
  const type = rawType === 'project' || rawType === 'essay' ? rawType : undefined;
  const query = searchParams.get('query')?.trim().slice(0, 200) || undefined;
  const rawSort = searchParams.get('sort') || 'createdAt';
  const sort = ['createdAt', 'updatedAt', 'title', 'featuredOrder'].includes(rawSort) ? rawSort : 'createdAt';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const normalized = new URLSearchParams(searchParams);
  if (page === 1) normalized.delete('page'); else normalized.set('page', String(page));
  if (type) normalized.set('type', type); else normalized.delete('type');
  if (query) normalized.set('query', query); else normalized.delete('query');
  if (searchParams.has('sort')) normalized.set('sort', sort);
  if (searchParams.has('order')) normalized.set('order', order);
  const normalizedSearch = normalized.toString();
  const currentSearch = searchParams.toString();

  useEffect(() => {
    if (currentSearch !== normalizedSearch) setSearchParams(normalizedSearch, { replace: true });
  }, [currentSearch, normalizedSearch, setSearchParams]);

  useEffect(() => {
    useSearchStore.setState({ query: query || '', type: type || 'all', sort: sort === 'title' ? 'name' : 'date', order });
  }, [query, type, sort, order]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
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
  const lastPage = Math.max(1, data?.pagination.totalPages || 1);
  const beyondLastPage = !!data && page > lastPage;

  useEffect(() => {
    if (!beyondLastPage) return;
    const next = new URLSearchParams(normalizedSearch);
    if (lastPage === 1) next.delete('page'); else next.set('page', String(lastPage));
    setSearchParams(next, { replace: true });
  }, [beyondLastPage, lastPage, normalizedSearch, setSearchParams]);

  const breakpointColumns = {
    default: 3,
    1024: 2,
    640: 1,
  };

  const title = type ? postTypeLabels[type] : '전체 글';

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
            &quot;{query}&quot; 검색 결과{data ? ` (${data.pagination.total}건)` : ''}
          </p>
        )}
        {!query && (
          <p className="text-secondary">
            {type
              ? type === 'project'
                ? '소소한 일상과 경험을 담은 기록'
                : '떠오른 생각과 관심사를 담은 글'
              : '일상과 생각을 차곡차곡 모았습니다.'}
          </p>
        )}
      </motion.header>

      {/* 로딩 */}
      {(isLoading || beyondLastPage) && (
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
          <p role="alert" className="text-secondary">{error instanceof Error ? error.message : '콘텐츠를 불러오는데 실패했습니다.'}</p>
          <button type="button" onClick={() => void refetch()} disabled={isFetching} className="btn-primary mt-4">다시 시도</button>
        </div>
      )}

      {/* 결과 없음 */}
      {!isLoading && !error && !beyondLastPage && posts.length === 0 && (
        <div className="text-center py-20">
          <p role="status" className="text-secondary">{query ? '검색 결과가 없습니다.' : type ? '이 분류에 공개된 게시글이 없습니다.' : '아직 공개된 게시글이 없습니다.'}</p>
          {(query || type) && <Link to="/gallery" className="btn-ghost mt-4">전체 글 보기</Link>}
        </div>
      )}

      {/* Masonry 그리드 */}
      {!isLoading && !error && !beyondLastPage && posts.length > 0 && (
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
      {data && !error && !beyondLastPage && data.pagination.totalPages > 1 && <nav aria-label="글 목록 페이지" className="flex justify-center gap-6 mt-8">
        <button disabled={page <= 1} onClick={() => {const next = new URLSearchParams(searchParams); next.set('page', String(page - 1)); setSearchParams(next);}} className="disabled:opacity-30">이전</button>
        <span>{page} / {data.pagination.totalPages}</span>
        <button disabled={page >= data.pagination.totalPages} onClick={() => {const next = new URLSearchParams(searchParams); next.set('page', String(page + 1)); setSearchParams(next);}} className="disabled:opacity-30">다음</button>
      </nav>}
    </div>
  );
}
