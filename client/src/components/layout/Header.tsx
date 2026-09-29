import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search } from 'lucide-react';
import { SearchPanel } from '../search/SearchPanel';

const navItems = [
  { label: '전체 글', path: '/gallery' },
  { label: '일상', path: '/gallery?type=project' },
  { label: '생각', path: '/gallery?type=essay' },
  { label: '블로그 소개', path: '/about' },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const selectedType = new URLSearchParams(location.search).get('type');
  const isActive = (path: string) => {
    const [pathname, search] = path.split('?');
    return location.pathname === pathname && (pathname !== '/gallery' || selectedType === new URLSearchParams(search).get('type'));
  };

  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsMobileMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-border">
        <div className="container-narrow">
          <div className="flex items-center justify-between h-20">
            {/* 좌측: 버거 버튼 + 검색 */}
            <div className="flex items-center gap-4">
              <button
                ref={menuButtonRef}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-surface-dark transition-colors"
                aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              
              <button
                onClick={() => { setIsMobileMenuOpen(false); setIsSearchOpen(!isSearchOpen); }}
                className="p-2 hover:bg-surface-dark transition-colors"
                aria-label="검색"
                aria-haspopup="dialog"
                aria-expanded={isSearchOpen}
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* 중앙: 로고 */}
            <Link 
              to="/" 
              className="font-serif text-2xl tracking-tight font-semibold hover:text-accent-ink transition-colors"
            >
              Temp-Log
            </Link>

            {/* 우측: 네비게이션 */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <NavLink key={item.path} to={item.path} active={isActive(item.path)}>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* 모바일 플레이스홀더 */}
            <div className="w-10 lg:hidden" />
          </div>
        </div>

        {/* 모바일 메뉴 */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden border-t border-border"
            >
              <nav id="mobile-navigation" aria-label="모바일 메뉴" className="container-narrow py-4 flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                    className="py-3 px-4 text-lg font-medium hover:bg-surface-dark transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 검색 패널 */}
      <SearchPanel isOpen={isSearchOpen} onClose={closeSearch} />
    </>
  );
}

function NavLink({ to, children, active }: { to: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`relative py-2 font-medium transition-colors group ${
        active ? 'text-primary' : 'text-secondary hover:text-primary'
      }`}
    >
      {children}
      <motion.span
        className="absolute bottom-0 left-0 h-px bg-primary"
        animate={{ width: active ? '100%' : '0%' }}
        whileHover={{ width: '100%' }}
        transition={{ duration: 0.2 }}
      />
    </Link>
  );
}
