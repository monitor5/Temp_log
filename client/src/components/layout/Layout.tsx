import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { FollowBar } from './FollowBar';

export function Layout() {
  return (
    <div className="min-h-screen bg-surface">
      <Header />
      
      <div className="lg:grid lg:grid-cols-home">
        {/* 좌측 Follow 바 - lg 이상에서만 표시 */}
        <aside className="hidden lg:block sticky top-20 h-fit">
          <FollowBar />
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="min-h-[calc(100vh-5rem)]">
          <Outlet />
        </main>

        {/* 우측 영역 - 페이지별로 다르게 사용 */}
        <aside className="hidden lg:block" />
      </div>

      {/* 모바일 Follow 바 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <FollowBar mobile />
      </div>
    </div>
  );
}

