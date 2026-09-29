import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search as SearchIcon } from 'lucide-react';
import { useSearchStore } from '@/store/searchStore';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { query, sort, order, type, setQuery, setSort, setOrder, setType } = useSearchStore();
  const [localQuery, setLocalQuery] = useState(query);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams(location.search);
    const current = useSearchStore.getState();
    if (location.pathname === '/gallery') {
      const urlType = params.get('type');
      const nextQuery = (params.get('query') || '').trim().slice(0, 200);
      setLocalQuery(nextQuery);
      setQuery(nextQuery);
      setType(urlType === 'project' || urlType === 'essay' ? urlType : 'all');
      setSort(params.get('sort') === 'title' ? 'name' : 'date');
      setOrder(params.get('order') === 'asc' ? 'asc' : 'desc');
    } else {
      setLocalQuery(current.query);
    }
  }, [isOpen, location.pathname, location.search, setQuery, setType, setSort, setOrder]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const items = panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panelRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen, onClose]);

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
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-50"
            onClick={onClose}
          />

          {/* 검색 패널 */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="검색"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-20 left-0 right-0 z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto bg-surface border-b border-border shadow-lg"
          >
            <div className="container-narrow py-8">
              {/* 닫기 버튼 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-surface-dark transition-colors"
                aria-label="검색 닫기"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 검색 폼 */}
              <form onSubmit={handleSearch}>
                <div className="relative mb-6">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    ref={inputRef}
                    type="text"
                    aria-label="검색어"
                    maxLength={200}
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    placeholder="search table."
                    className="w-full pl-12 pr-4 py-4 bg-surface-dark border border-border text-lg
                             placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
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
                          aria-pressed={type === t}
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
                          aria-pressed={sort === s}
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
                          aria-pressed={order === o}
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
