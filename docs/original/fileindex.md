# File Index - Arch-Log

프로젝트의 모든 파일 목록과 각 파일이 제공하는 모듈, 의존 관계를 정리합니다.

---

## 📁 프로젝트 구조 개요

```
sspark_portpolio/
├── client/                    # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── components/        # 재사용 컴포넌트
│   │   ├── pages/             # 페이지 컴포넌트
│   │   ├── store/             # Zustand 상태 관리
│   │   └── lib/               # 유틸리티 및 API
│   └── public/                # 정적 파일
├── server/                    # 백엔드 (Express + MongoDB)
│   ├── src/
│   │   ├── config/            # 환경 설정
│   │   ├── controllers/       # 라우트 핸들러
│   │   ├── middlewares/       # 미들웨어
│   │   ├── models/            # Mongoose 스키마
│   │   └── routes/            # API 라우트
│   ├── scripts/               # 유틸리티 스크립트
│   └── uploads/               # 업로드 파일 저장
└── 문서 파일들
```

---

## 🌐 루트 디렉터리

| 파일 | 설명 | 내보내는 모듈 |
|------|------|--------------|
| `package.json` | 모노레포 루트 설정, 동시 실행 스크립트 | - |
| `README.md` | 프로젝트 문서, 기술 스택, API 명세 | - |
| `cursorrule.md` | Cursor 개발 규칙 | - |
| `changelog.md` | 변경 이력 | - |
| `fileindex.md` | 파일 인덱스 (현재 문서) | - |

---

## 🖥️ Server (백엔드)

### config/

| 파일 | 설명 | 내보내는 모듈 | 의존성 |
|------|------|--------------|--------|
| `env.ts` | 환경 변수 설정 | `config` | `dotenv`, `path` |
| `db.ts` | MongoDB 연결 관리 | `connectDB` | `mongoose`, `./env` |

### models/

| 파일 | 설명 | 내보내는 모듈 | 의존성 |
|------|------|--------------|--------|
| `Post.ts` | 게시글 스키마 | `IPost`, `Post` | `mongoose` |
| `Comment.ts` | 댓글 스키마 | `IComment`, `Comment` | `mongoose` |
| `Admin.ts` | 관리자 스키마 | `IAdmin`, `Admin` | `mongoose`, `bcrypt`, `./config/env` |

#### 모델 관계도
```
Admin (1) ─────────────────────────┐
                                   │ JWT 토큰 발급
Post (1) ◄───────────────────────► │ 
   │                               │
   │ postId 참조                   │
   ▼                               │
Comment (N) ◄──────────────────────┘
```

### controllers/

| 파일 | 설명 | 내보내는 모듈 | 의존 모델 |
|------|------|--------------|----------|
| `auth.controller.ts` | 인증 로직 | `login`, `getMe`, `initAdmin` | `Admin` |
| `post.controller.ts` | 게시글 CRUD | `getPosts`, `getFeaturedPosts`, `getPostByIdOrSlug`, `createPost`, `updatePost`, `deletePost` | `Post`, `Comment` |
| `comment.controller.ts` | 댓글 CRUD | `getCommentsByPost`, `createComment`, `deleteComment`, `deleteCommentByAdmin` | `Comment`, `Post` |
| `upload.controller.ts` | 파일 업로드 | `uploadFile`, `getMediaLibrary`, `deleteFile` | - |

### middlewares/

| 파일 | 설명 | 내보내는 모듈 | 사용처 |
|------|------|--------------|--------|
| `auth.middleware.ts` | JWT 토큰 검증 | `AuthRequest`, `authMiddleware` | 관리자 전용 API |
| `error.middleware.ts` | 에러 핸들링 | `AppError`, `errorHandler`, `createError`, `asyncHandler` | 전역, 컨트롤러 |
| `upload.middleware.ts` | Multer 설정 | `upload` | 업로드 라우트 |
| `rateLimit.middleware.ts` | 요청 제한 | `authLimiter`, `commentLimiter`, `uploadLimiter`, `apiLimiter` | 모든 라우트 |

### routes/

| 파일 | 설명 | 연결 컨트롤러 | 미들웨어 |
|------|------|--------------|----------|
| `auth.routes.ts` | `/api/auth/*` | `auth.controller` | `authLimiter`, `authMiddleware` |
| `post.routes.ts` | `/api/posts/*` | `post.controller` | `apiLimiter`, `authMiddleware` |
| `comment.routes.ts` | `/api/comments/*` | `comment.controller` | `commentLimiter`, `apiLimiter`, `authMiddleware` |
| `upload.routes.ts` | `/api/upload/*` | `upload.controller` | `uploadLimiter`, `authMiddleware`, `upload` |

### scripts/

| 파일 | 설명 | 의존성 |
|------|------|--------|
| `seed.ts` | 초기 데이터 시드 | `mongoose`, `bcrypt`, `Admin`, `Post` |

### 서버 진입점

| 파일 | 설명 | 역할 |
|------|------|------|
| `index.ts` | Express 앱 진입점 | 미들웨어 등록, 라우트 연결, 서버 시작 |

---

## 💻 Client (프론트엔드)

### 설정 파일

| 파일 | 설명 | 역할 |
|------|------|------|
| `vite.config.ts` | Vite 빌드 설정 | 경로 별칭(`@`), API 프록시 |
| `tailwind.config.js` | Tailwind CSS 설정 | 디자인 토큰, 커스텀 유틸리티 |
| `tsconfig.json` | TypeScript 설정 | 컴파일러 옵션 |
| `postcss.config.js` | PostCSS 설정 | Tailwind, Autoprefixer |
| `index.html` | HTML 템플릿 | 폰트 로드, 메타 태그 |

### src/

#### 진입점

| 파일 | 설명 | 내보내는 모듈 | 의존성 |
|------|------|--------------|--------|
| `main.tsx` | React 앱 진입점 | - | `react-dom`, `react-query`, `react-router-dom` |
| `App.tsx` | 라우팅 설정 | `App` (default) | 모든 페이지 컴포넌트 |
| `index.css` | 전역 스타일 | - | Tailwind |

#### lib/

| 파일 | 설명 | 내보내는 모듈 |
|------|------|--------------|
| `api.ts` | API 클라이언트 | `ApiError`, `authApi`, `postsApi`, `commentsApi`, `uploadApi`, `Post`, `Comment`, `MediaFile`, `PostsResponse` |

#### store/

| 파일 | 설명 | 내보내는 모듈 | 사용 컴포넌트 |
|------|------|--------------|--------------|
| `authStore.ts` | 인증 상태 관리 | `useAuthStore` | `AdminLogin`, `AdminDashboard`, `ProtectedRoute` |
| `searchStore.ts` | 검색 상태 관리 | `useSearchStore` | `SearchPanel`, `InlineSearchBar` |

### components/

#### layout/

| 파일 | 설명 | 내보내는 컴포넌트 | 부모 | 자식 |
|------|------|------------------|------|------|
| `Layout.tsx` | 메인 레이아웃 | `Layout` | `App` (Route) | `Header`, `FollowBar`, `Outlet` |
| `Header.tsx` | 네비게이션 헤더 | `Header` | `Layout` | `SearchPanel` |
| `FollowBar.tsx` | 소셜 링크 바 | `FollowBar` | `Layout` | - |

#### cards/

| 파일 | 설명 | 내보내는 컴포넌트 | Props | 사용처 |
|------|------|------------------|-------|--------|
| `HeroCard.tsx` | 히어로 카드 | `HeroCard` | `post: Post` | `Home` |
| `SideStoryCard.tsx` | 사이드 스토리 카드 | `SideStoryCard` | `post: Post`, `compact?: boolean` | `Home` |
| `GalleryCard.tsx` | 갤러리 카드 | `GalleryCard` | `post: Post` | `Gallery` |

#### search/

| 파일 | 설명 | 내보내는 컴포넌트 | 상태 의존 | 사용처 |
|------|------|------------------|----------|--------|
| `SearchPanel.tsx` | 검색 패널 (모달) | `SearchPanel` | `useSearchStore` | `Header` |
| `InlineSearchBar.tsx` | 인라인 검색 바 | `InlineSearchBar` | `useSearchStore` | `Home` |

#### comments/

| 파일 | 설명 | 내보내는 컴포넌트 | Props | API 의존 |
|------|------|------------------|-------|----------|
| `CommentSection.tsx` | 댓글 섹션 | `CommentSection` | `postId: string` | `commentsApi` |

#### auth/

| 파일 | 설명 | 내보내는 컴포넌트 | 상태 의존 |
|------|------|------------------|----------|
| `ProtectedRoute.tsx` | 인증 보호 라우트 | `ProtectedRoute` | `useAuthStore` |

#### ui/

| 파일 | 설명 | 내보내는 컴포넌트 | Props |
|------|------|------------------|-------|
| `Skeleton.tsx` | 로딩 스켈레톤 | `Skeleton` | `className?: string` |

### pages/

| 파일 | 설명 | 내보내는 컴포넌트 | 라우트 | 사용 컴포넌트 |
|------|------|------------------|--------|--------------|
| `Home.tsx` | 홈 페이지 | `Home` | `/` | `HeroCard`, `SideStoryCard`, `InlineSearchBar`, `Skeleton` |
| `PostDetail.tsx` | 게시글 상세 | `PostDetail` | `/project/:slug`, `/story/:slug` | `CommentSection`, `Skeleton` |
| `Gallery.tsx` | 갤러리 페이지 | `Gallery` | `/gallery` | `GalleryCard`, `Skeleton`, Masonry |
| `Contact.tsx` | 연락처 페이지 | `Contact` | `/contact` | - |

#### admin/

| 파일 | 설명 | 내보내는 컴포넌트 | 라우트 | 인증 필요 |
|------|------|------------------|--------|----------|
| `AdminLogin.tsx` | 관리자 로그인 | `AdminLogin` | `/admin` | ❌ |
| `AdminDashboard.tsx` | 대시보드 | `AdminDashboard` | `/admin/dashboard` | ✅ |
| `AdminEditor.tsx` | 마크다운 에디터 | `AdminEditor` | `/admin/editor`, `/admin/editor/:id` | ✅ |

---

## 🔗 컴포넌트 의존성 그래프

```
App.tsx
├── Layout.tsx ─────────────────────────────────────────┐
│   ├── Header.tsx                                      │
│   │   └── SearchPanel.tsx → useSearchStore            │
│   ├── FollowBar.tsx                                   │
│   └── (Outlet)                                        │
│       ├── Home.tsx                                    │
│       │   ├── HeroCard.tsx                            │
│       │   ├── SideStoryCard.tsx                       │
│       │   ├── InlineSearchBar.tsx → useSearchStore    │
│       │   └── Skeleton.tsx                            │
│       ├── PostDetail.tsx                              │
│       │   ├── CommentSection.tsx → commentsApi        │
│       │   └── Skeleton.tsx                            │
│       ├── Gallery.tsx                                 │
│       │   ├── GalleryCard.tsx                         │
│       │   └── Skeleton.tsx                            │
│       └── Contact.tsx                                 │
├── AdminLogin.tsx → useAuthStore, authApi              │
└── ProtectedRoute.tsx → useAuthStore                   │
    ├── AdminDashboard.tsx → postsApi, useAuthStore     │
    └── AdminEditor.tsx → postsApi, uploadApi           │
```

---

## 📊 API 엔드포인트 매핑

| 엔드포인트 | 메서드 | 컨트롤러 함수 | 프론트엔드 API 함수 |
|-----------|--------|--------------|-------------------|
| `/api/auth/login` | POST | `login` | `authApi.login` |
| `/api/auth/me` | GET | `getMe` | `authApi.me` |
| `/api/auth/init` | POST | `initAdmin` | `authApi.init` |
| `/api/posts` | GET | `getPosts` | `postsApi.getAll` |
| `/api/posts/featured` | GET | `getFeaturedPosts` | `postsApi.getFeatured` |
| `/api/posts/:id` | GET | `getPostByIdOrSlug` | `postsApi.getByIdOrSlug` |
| `/api/posts` | POST | `createPost` | `postsApi.create` |
| `/api/posts/:id` | PATCH | `updatePost` | `postsApi.update` |
| `/api/posts/:id` | DELETE | `deletePost` | `postsApi.delete` |
| `/api/comments` | GET | `getCommentsByPost` | `commentsApi.getByPost` |
| `/api/comments` | POST | `createComment` | `commentsApi.create` |
| `/api/comments/:id` | DELETE | `deleteComment` | `commentsApi.delete` |
| `/api/comments/:id/admin` | DELETE | `deleteCommentByAdmin` | `commentsApi.deleteByAdmin` |
| `/api/upload` | POST | `uploadFile` | `uploadApi.upload` |
| `/api/upload/library` | GET | `getMediaLibrary` | `uploadApi.getLibrary` |
| `/api/upload/:filename` | DELETE | `deleteFile` | `uploadApi.delete` |

---

## 🎨 스타일 시스템

### Tailwind 커스텀 토큰

| 카테고리 | 토큰 | 값 |
|---------|------|-----|
| **Colors** | `primary` | `#1a1a1a` |
| | `secondary` | `#4a4a4a` |
| | `accent` | `#c9a227` |
| | `muted` | `#8a8a8a` |
| | `surface` | `#fafafa` |
| | `surface-dark` | `#f0f0f0` |
| | `border` | `#e5e5e5` |
| **Fonts** | `font-sans` | Pretendard |
| | `font-serif` | Space Grotesk |
| | `font-display` | Playfair Display |
| **Grid** | `grid-cols-home` | `80px 1fr 320px` |

### 커스텀 컴포넌트 클래스

| 클래스 | 용도 |
|--------|------|
| `.container-narrow` | 최대 1200px 중앙 정렬 컨테이너 |
| `.btn-primary` | 기본 버튼 스타일 |
| `.btn-ghost` | 고스트 버튼 스타일 |
| `.input-field` | 입력 필드 스타일 |
| `.card-hover` | 카드 호버 효과 |
| `.nav-link` | 네비게이션 링크 (언더라인 애니메이션) |
| `.gradient-overlay` | 그라디언트 오버레이 |
| `.prose` | 마크다운 콘텐츠 스타일 |

---

## 📝 업데이트 가이드

파일을 추가/수정할 때 이 문서도 함께 업데이트해주세요:

1. **새 컴포넌트 추가 시**: 해당 섹션의 테이블에 추가
2. **새 API 엔드포인트 추가 시**: API 엔드포인트 매핑 테이블 업데이트
3. **새 모델 추가 시**: models 섹션 및 관계도 업데이트
4. **새 스타일 토큰 추가 시**: 스타일 시스템 섹션 업데이트

