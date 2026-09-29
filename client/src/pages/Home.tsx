import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { postsApi } from '@/lib/api';
import { HeroCard } from '@/components/cards/HeroCard';
import { SideStoryCard } from '@/components/cards/SideStoryCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { InlineSearchBar } from '@/components/search/InlineSearchBar';

export function Home() {
  const reducedMotion = useReducedMotion();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['featured-posts'],
    queryFn: postsApi.getFeatured,
  });

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const posts = data?.data || [];
  const activeIndex = posts.length ? currentHeroIndex % posts.length : 0;
  const heroPost = posts[activeIndex];
  const sidePosts = posts.filter((_, i) => i !== activeIndex).slice(0, 3);

  // Intersection Observer for slide-in effect
  const bottomRef = useRef<HTMLDivElement>(null);
  const bottomInView = useInView(bottomRef, { once: false, amount: 0.1 });

  // Auto-rotate hero cards
  useEffect(() => {
    if (posts.length <= 1 || reducedMotion) return;
    
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % posts.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [posts.length, reducedMotion]);

  if (error) {
    return (
      <div className="py-20 text-center">
        <p role="alert" className="text-secondary">콘텐츠를 불러오는데 실패했습니다.</p>
        <button type="button" onClick={() => void refetch()} disabled={isFetching} className="btn-primary mt-4">다시 시도</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip">
      {/* 검색 테이블 섹션 - 네비 아래 전체 폭 */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-dark/50 border-b border-border"
      >
        <div className="container-narrow py-4">
          <InlineSearchBar />
        </div>
      </motion.section>

      {/* 메인 콘텐츠 영역 */}
      <div className="py-8 lg:py-12">
        <div className="container-narrow">
          {/* 메인 그리드 - 히어로 + 사이드 */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-10">
            {/* 메인 시네마 카드 */}
            <motion.div
              layout
              className="relative min-w-0"
            >
              {isLoading ? (
                <Skeleton className="aspect-cinema w-full" />
              ) : heroPost ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={heroPost._id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  >
                    <HeroCard post={heroPost} hasPagination={posts.length > 1} />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="aspect-cinema bg-surface-dark flex flex-col items-center justify-center gap-4 p-4 text-center">
                  <p role="status" className="text-muted">홈에 고정된 글이 없습니다.</p>
                  <Link to="/gallery" className="btn-ghost">전체 글 보기</Link>
                </div>
              )}

              {/* 카드 인디케이터 */}
              {posts.length > 1 && (
                <div className="absolute bottom-6 right-6 flex gap-2 z-10">
                  {posts.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentHeroIndex(idx)}
                      className="w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      aria-label={`대표 글 ${idx + 1} 보기`}
                      aria-pressed={idx === activeIndex}
                    ><span aria-hidden="true" className={`h-2 rounded-full transition-all duration-300 ${idx === activeIndex ? 'bg-surface w-6' : 'bg-surface/60 w-2'}`} /></button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* 사이드 스토리 썸네일 */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-caption text-muted uppercase tracking-widest">
                    Recent Stories
                  </h3>
                  <span className="text-caption text-muted">
                    {posts.length} works
                  </span>
                </div>
                
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28" />
                  ))
                ) : sidePosts.length > 0 ? (
                  sidePosts.map((post, index) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        delay: 0.1 * (index + 1),
                        duration: 0.4,
                        ease: 'easeOut'
                      }}
                    >
                      <SideStoryCard post={post} />
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-muted">더 많은 스토리가 곧 추가됩니다</p>
                )}
              </div>
            </aside>
          </div>

          {/* 하단 슬라이드 안내 영역 */}
          <motion.div
            ref={bottomRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: bottomInView ? 1 : 0.3 }}
            transition={{ duration: 0.6 }}
            className="mt-16 lg:mt-20"
          >
            {/* Extendable 캡션 */}
            <div className="text-center mb-8">
              <p className="text-caption text-muted italic tracking-wide">extendable.</p>
            </div>

            {/* 스크롤 인디케이터 */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                ease: 'easeInOut'
              }}
              className="flex flex-col items-center"
            >
              <div className="w-px h-12 bg-gradient-to-b from-border to-transparent" />
              <svg
                className="w-5 h-5 text-muted mt-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </motion.div>
          </motion.div>
        </div>

        {/* 모바일용 사이드 스토리 */}
        <div className="lg:hidden mt-12 px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-caption text-muted uppercase tracking-widest">
              Recent Stories
            </h3>
            <span className="text-caption text-muted">
              {sidePosts.length} more
            </span>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))
            ) : (
              sidePosts.map((post, index) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                >
                  <SideStoryCard post={post} compact />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
