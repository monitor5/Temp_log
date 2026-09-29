import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search as SearchIcon } from 'lucide-react';
import { useSearchStore } from '@/store/searchStore';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const navigate = useNavigate();
  const { query, sort, order, type, setQuery, setSort, setOrder, setType } = useSearchStore();
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(localQuery);
    
    const params = new URLSearchParams();
    if (localQuery) params.set('query', localQuery);
    if (type !== 'all') params.set('type', type);
    params.set('sort', sort === 'date' ? 'createdAt' : 'title');
    params.set('order', order);
    
    navigate(`/gallery?${params.toString()}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-50"
            onClick={onClose}
          />

          {/* 검색 패널 */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-20 left-0 right-0 z-50 bg-surface border-b border-border shadow-lg"
          >
            <div className="container-narrow py-8">
              {/* 닫기 버튼 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-surface-dark transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 검색 폼 */}
              <form onSubmit={handleSearch}>
                <div className="relative mb-6">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type="text"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    placeholder="search table."
                    className="w-full pl-12 pr-4 py-4 bg-surface-dark border border-border text-lg
                             placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                    autoFocus
                  />
                </div>

                {/* 필터 옵션 */}
                <div className="flex flex-wrap items-center gap-6">
                  {/* 타입 필터 */}
                  <div className="flex items-center gap-3">
                    <span className="text-caption text-muted uppercase">Type</span>
                    <div className="flex gap-2">
                      {(['all', 'project', 'essay'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className={`px-3 py-1 text-sm transition-colors ${
                            type === t
                              ? 'bg-primary text-surface'
                              : 'bg-surface-dark text-secondary hover:bg-border'
                          }`}
                        >
                          {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 정렬 옵션 */}
                  <div className="flex items-center gap-3">
                    <span className="text-caption text-muted uppercase">Sort</span>
                    <div className="flex gap-2">
                      {(['date', 'name'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSort(s)}
                          className={`px-3 py-1 text-sm transition-colors ${
                            sort === s
                              ? 'bg-primary text-surface'
                              : 'bg-surface-dark text-secondary hover:bg-border'
                          }`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 순서 옵션 */}
                  <div className="flex items-center gap-3">
                    <span className="text-caption text-muted uppercase">Order</span>
                    <div className="flex gap-2">
                      {(['desc', 'asc'] as const).map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setOrder(o)}
                          className={`px-3 py-1 text-sm transition-colors ${
                            order === o
                              ? 'bg-primary text-surface'
                              : 'bg-surface-dark text-secondary hover:bg-border'
                          }`}
                        >
                          {o === 'desc' ? 'Newest' : 'Oldest'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 검색 버튼 */}
                  <button type="submit" className="btn-primary ml-auto">
                    Search
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

