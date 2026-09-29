import { Link, Outlet } from 'react-router-dom';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border">
        <div className="container-narrow flex items-center justify-between gap-4 py-6 text-sm text-muted">
          <span>Temp-Log</span>
          <Link to="/terms" className="hover:text-primary underline underline-offset-4">이용약관</Link>
        </div>
      </footer>
    </div>
  );
}
