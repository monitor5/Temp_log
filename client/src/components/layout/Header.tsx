import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search } from 'lucide-react';
import { SearchPanel } from '../search/SearchPanel';

const navItems = [
  { label: 'Project', path: '/gallery?type=project' },
  { label: 'Story', path: '/gallery?type=essay' },
  { label: 'Contact', path: '/contact' },
  { label: 'Browse', path: '/gallery' },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-border">
        <div className="container-narrow">
          <div className="flex items-center justify-between h-20">
            {/* 좌측: 버거 버튼 + 검색 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-surface-dark transition-colors"
                aria-label="메뉴 열기"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 hover:bg-surface-dark transition-colors"
                aria-label="검색"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* 중앙: 로고 */}
            <Link 
              to="/" 
              className="font-serif text-2xl tracking-tight font-semibold hover:text-accent transition-colors"
            >
              Arch-Log
            </Link>

            {/* 우측: 네비게이션 */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <NavLink key={item.path} to={item.path} active={location.pathname === item.path}>
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
              <nav className="container-narrow py-4 flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
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
      <SearchPanel isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

function NavLink({ to, children, active }: { to: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`relative py-2 font-medium transition-colors group ${
        active ? 'text-primary' : 'text-secondary hover:text-primary'
      }`}
    >
      {children}
      <motion.span
        className="absolute bottom-0 left-0 h-px bg-primary"
        initial={{ width: active ? '100%' : '0%' }}
        whileHover={{ width: '100%' }}
        transition={{ duration: 0.2 }}
      />
    </Link>
  );
}

