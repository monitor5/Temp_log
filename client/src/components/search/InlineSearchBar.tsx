import { postTypeLabels } from '@/lib/postTypes';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, X } from 'lucide-react';
import { useSearchStore } from '@/store/searchStore';

export function InlineSearchBar() {
  const navigate = useNavigate();
  const { query, sort, order, type, setQuery, setSort, setOrder, setType } = useSearchStore();
  const [localQuery, setLocalQuery] = useState(query);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => { setLocalQuery(query); }, [query]);

  // Debounced search
  const handleInputChange = useCallback((value: string) => {
    setLocalQuery(value);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const nextQuery = localQuery.trim();
    setQuery(nextQuery);
    
    const params = new URLSearchParams();
    if (nextQuery) params.set('query', nextQuery);
    if (type !== 'all') params.set('type', type);
    params.set('sort', sort === 'date' ? 'createdAt' : 'title');
    params.set('order', order);
    
    navigate(`/gallery?${params.toString()}`);
  };

  const clearSearch = () => {
    setLocalQuery('');
    setQuery('');
  };

  return (
    <form onSubmit={handleSearch}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* 검색 입력 */}
        <div className="relative flex-1">
          <Search 
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              isSearchFocused ? 'text-primary' : 'text-muted'
            }`}
          />
          <input
            type="text"
            aria-label="검색어"
            maxLength={200}
            value={localQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="찾고 싶은 글을 검색하세요"
            className="w-full pl-11 pr-10 py-3 bg-surface border border-border text-primary
                     placeholder:text-muted placeholder:italic placeholder:tracking-wide
                     focus:outline-none focus:border-primary/50 transition-all duration-200"
          />
          {localQuery && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="검색어 지우기"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted 
                       hover:text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 필터 토글 버튼 */}
        <button
          type="button"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          aria-expanded={isFilterOpen}
          aria-controls="inline-search-filters"
          className={`flex items-center gap-2 px-4 py-3 border transition-all duration-200 ${
            isFilterOpen 
              ? 'bg-primary text-surface border-primary' 
              : 'bg-surface text-secondary border-border hover:border-primary/50'
          }`}
        >
          <span className="text-sm font-medium uppercase tracking-wide">Filter</span>
          <motion.span
            animate={{ rotate: isFilterOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>

        {/* 검색 버튼 */}
        <button
          type="submit"
          className="px-6 py-3 bg-primary text-surface font-medium uppercase tracking-wide
                   hover:bg-secondary transition-colors text-sm"
        >
          Search
        </button>
      </div>

      {/* 필터 옵션 패널 */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            id="inline-search-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 flex flex-wrap items-center gap-6">
              {/* 타입 필터 */}
              <FilterGroup label="분류">
                {(['all', 'project', 'essay'] as const).map((t) => (
                  <FilterButton
                    key={t}
                    active={type === t}
                    onClick={() => setType(t)}
                  >
                    {t === 'all' ? '전체' : postTypeLabels[t]}
                  </FilterButton>
                ))}
              </FilterGroup>

              {/* 정렬 옵션 */}
              <FilterGroup label="Sort">
                {(['date', 'name'] as const).map((s) => (
                  <FilterButton
                    key={s}
                    active={sort === s}
                    onClick={() => setSort(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </FilterButton>
                ))}
              </FilterGroup>

              {/* 순서 옵션 */}
              <FilterGroup label="Order">
                {(['desc', 'asc'] as const).map((o) => (
                  <FilterButton
                    key={o}
                    active={order === o}
                    onClick={() => setOrder(o)}
                  >
                    {o === 'desc' ? 'Newest' : 'Oldest'}
                  </FilterButton>
                ))}
              </FilterGroup>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption text-muted uppercase tracking-wider">{label}</span>
      <div className="flex gap-1.5">
        {children}
      </div>
    </div>
  );
}

function FilterButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-all duration-200 ${
        active
          ? 'bg-primary text-surface'
          : 'bg-surface border border-border text-secondary hover:border-primary/50 hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
}
