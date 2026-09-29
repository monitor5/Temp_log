# Changelog - Arch-Log

모든 주요 변경사항을 이 파일에 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따릅니다.

---

## [1.0.0] - 2025-11-30

### ✨ Added (추가됨)

#### 프로젝트 초기 구조
- 모노레포 구조 설정 (`package.json` 루트)
- `concurrently`를 이용한 클라이언트/서버 동시 실행 스크립트

#### 백엔드 (Express + MongoDB)

**설정 및 진입점**
- `server/src/index.ts`: Express 서버 진입점, 미들웨어 설정, 라우트 연결
- `server/src/config/env.ts`: 환경 변수 설정 (PORT, MONGO_URI, JWT_SECRET 등)
- `server/src/config/db.ts`: MongoDB 연결 관리

**데이터 모델**
- `server/src/models/Post.ts`: 게시글 스키마 (project/essay 타입, 태그, 미디어, isHidden, isFeatured)
- `server/src/models/Comment.ts`: 댓글 스키마 (비밀번호 해시 저장)
- `server/src/models/Admin.ts`: 관리자 스키마 (비밀번호 비교 메서드 포함)

**컨트롤러**
- `server/src/controllers/auth.controller.ts`: 로그인, 토큰 검증, 초기 관리자 생성
- `server/src/controllers/post.controller.ts`: 게시글 CRUD, 피쳐드 목록 조회
- `server/src/controllers/comment.controller.ts`: 댓글 조회/생성/삭제 (비밀번호 검증)
- `server/src/controllers/upload.controller.ts`: 파일 업로드, 미디어 라이브러리 관리

**라우트**
- `server/src/routes/auth.routes.ts`: 인증 API 라우트
- `server/src/routes/post.routes.ts`: 게시글 API 라우트
- `server/src/routes/comment.routes.ts`: 댓글 API 라우트
- `server/src/routes/upload.routes.ts`: 업로드 API 라우트

**미들웨어**
- `server/src/middlewares/auth.middleware.ts`: JWT 토큰 검증
- `server/src/middlewares/error.middleware.ts`: 에러 핸들링, asyncHandler 유틸리티
- `server/src/middlewares/upload.middleware.ts`: Multer 파일 업로드 설정
- `server/src/middlewares/rateLimit.middleware.ts`: API 요청 제한 (auth, comment, upload, api)

**스크립트**
- `server/scripts/seed.ts`: 초기 관리자 및 샘플 포스트 시드 스크립트

#### 프론트엔드 (React + Vite + TypeScript)

**설정**
- `client/vite.config.ts`: Vite 설정, API 프록시 구성
- `client/tailwind.config.js`: SKKU 건축 미니멀 디자인 토큰 정의
- `client/src/index.css`: Tailwind 기본/컴포넌트/유틸리티 레이어, 마크다운 스타일
- `client/index.html`: 폰트 프리로드 (Pretendard, Space Grotesk, Playfair Display)

**진입점**
- `client/src/main.tsx`: React 앱 진입점, QueryClient/BrowserRouter 설정
- `client/src/App.tsx`: 라우팅 구성 (홈, 상세, 갤러리, 연락처, 관리자)

**API 클라이언트**
- `client/src/lib/api.ts`: API 요청 함수 (auth, posts, comments, upload)

**상태 관리**
- `client/src/store/authStore.ts`: Zustand 인증 상태 (토큰, 관리자 정보, persist)
- `client/src/store/searchStore.ts`: Zustand 검색 상태 (query, sort, order, type)

**페이지**
- `client/src/pages/Home.tsx`: 홈 화면 (HeroCard, SideStoryCard, 검색바, 자동 슬라이드)
- `client/src/pages/PostDetail.tsx`: 게시글 상세 (마크다운 렌더링, 댓글 섹션)
- `client/src/pages/Gallery.tsx`: Masonry 그리드 갤러리
- `client/src/pages/Contact.tsx`: 연락처 및 문의 폼

**관리자 페이지**
- `client/src/pages/admin/AdminLogin.tsx`: 관리자 로그인 폼
- `client/src/pages/admin/AdminDashboard.tsx`: 게시글 목록 관리 (숨김/피쳐드 토글, 삭제)
- `client/src/pages/admin/AdminEditor.tsx`: 마크다운 에디터 (드래그&드롭 업로드, 실시간 미리보기)

**레이아웃 컴포넌트**
- `client/src/components/layout/Layout.tsx`: 3열 그리드 레이아웃 (Follow 바, 메인, 사이드)
- `client/src/components/layout/Header.tsx`: 네비게이션 헤더 (반응형 메뉴, 검색 버튼)
- `client/src/components/layout/FollowBar.tsx`: 소셜 링크 바 (Instagram, Pinterest)

**카드 컴포넌트**
- `client/src/components/cards/HeroCard.tsx`: 히어로 카드 (확장 가능한 호버 효과)
- `client/src/components/cards/SideStoryCard.tsx`: 사이드 스토리 썸네일 카드
- `client/src/components/cards/GalleryCard.tsx`: 갤러리 Masonry 카드

**검색 컴포넌트**
- `client/src/components/search/SearchPanel.tsx`: 전체 검색 패널 (모달)
- `client/src/components/search/InlineSearchBar.tsx`: 인라인 검색 바 (필터 토글)

**기타 컴포넌트**
- `client/src/components/comments/CommentSection.tsx`: 댓글 섹션 (작성/삭제)
- `client/src/components/auth/ProtectedRoute.tsx`: 인증 보호 라우트
- `client/src/components/ui/Skeleton.tsx`: 로딩 스켈레톤

### 🎨 Design

- SKKU 건축 미니멀리즘 팔레트 적용 (primary: #1a1a1a, accent: #c9a227)
- Pretendard (본문) + Space Grotesk (제목) + Playfair Display (디스플레이) 폰트 조합
- Framer Motion 애니메이션 적용 (페이지 전환, 카드 호버, 스크롤 트리거)
- `prefers-reduced-motion` 접근성 대응

### 🔒 Security

- JWT 토큰 인증 (12시간 만료)
- bcrypt 비밀번호 해싱 (salt rounds: 12)
- Helmet 보안 헤더 적용
- Rate Limiting 적용 (auth: 15분/10회, comment: 1분/5회, api: 1분/100회)
- 파일 업로드 확장자/크기 제한

### 📝 Documentation

- `cursorrule.md`: 프로젝트 개발 규칙 문서
- `README.md`: 프로젝트 개요, 기술 스택, API 인터페이스, 개발 환경 설정

---

## 참고사항

- **Breaking Changes**: 해당 없음 (초기 릴리스)
- **Migration**: 해당 없음 (초기 릴리스)
- **Known Issues**: 없음

