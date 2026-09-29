# Arch-Log (Local/MERN)

SKKU 건축대의 절제된 타이포그래피와 격자감을 계승한 로컬 호스팅 포트폴리오/에세이 플랫폼이다. 외부 클라우드 없이 MERN 스택만으로 동작하며, 노트북·NAS·VPS 어디서든 동일하게 구동할 수 있도록 설계했다.

## 목차
- [프로젝트 비전](#프로젝트-비전)
- [기술 스택](#기술-스택)
- [시스템 아키텍처](#시스템-아키텍처)
- [핵심 기능](#핵심-기능)
- [데이터 모델](#데이터-모델)
- [API 인터페이스](#api-인터페이스)
- [리치 에디터 워크플로](#리치-에디터-워크플로)
- [개발 환경](#개발-환경)
- [테스트 전략](#테스트-전략)
- [로드맵](#로드맵)

## 프로젝트 비전
| 목표 | 설명 |
| --- | --- |
| 로컬 지향 | 모든 서비스는 로컬호스트에서 동작하고, 이미지·영상은 `/uploads`에 저장한다. |
| SKKU 미니멀 룩 | 단색 팔레트와 빡빡한 그리드, 여백 중심의 타이포 스케일을 유지한다. |
| 몰입형 스토리텔링 | 스크롤 시 초상 → 약력 → 대표작이 겹치며 전환되는 내러티브를 구현한다. |
| 편리한 CMS | 마크다운 기반 에디터, 즉시 업로드, 실시간 미리보기, 미디어 임베드를 기본 제공한다. |
| 라이트 커뮤니티 | 방문자가 닉네임+비밀번호로 댓글을 남기고, 비번 검증 후 수정/삭제할 수 있다. |

## 기술 스택
- **프론트엔드**: React, Vite, TypeScript, Tailwind CSS, React Router, React Query/Zustand, `react-markdown`, `remark-gfm`, Framer Motion(스크롤 연출), `react-masonry-css`.
- **백엔드**: Node.js 18+, Express, Multer(diskStorage), Mongoose, JWT, bcrypt, Helmet, Morgan.
- **데이터베이스**: MongoDB Community Edition(로컬, 단일 replica set로 충분).
- **툴링**: pnpm(권장) 또는 npm, ESLint, Prettier, Husky + lint-staged, Jest + React Testing Library, Supertest.

## 시스템 아키텍처
```
┌──────────┐        HTTPS/API        ┌──────────────┐        Mongo driver        ┌────────────┐
│ React UI │  <────────────────────> │ Express API  │  <──────────────────────> │ MongoDB 6+ │
└──────────┘        (REST+JWT)       │  uploads dir │                           └────────────┘
     │                                │  /public     │
     └─ Vite dev server               └── /uploads 정적 서빙
```
- `uploads/`: `<repo>/server/uploads`에 위치하며, 뷰어와 에디터 모두가 즉시 접근할 수 있도록 정적 공개한다.
- JWT는 `localStorage`에 저장하고, 모든 관리자 API는 `Authorization: Bearer <token>` 헤더를 요구한다.
- NAS/VPS 배포 시 Nginx 리버스 프록시와 PM2 프로세스 매니저를 추가하되 애플리케이션 코드는 동일하게 유지한다.

## 핵심 기능
### 뷰어 (Portfolio)
- **Hero Scroll Stack**: 초상 사진, 짧은 약력, 대표 프로젝트 카드가 스크롤에 따라 겹치며 등장.
- **Masonry 갤러리**: 다양한 비율의 투시도/도면을 빈틈 없이 채우는 반응형 레이아웃.
- **상세 페이지**: 마크다운 콘텐츠, 인라인 미디어, 자동 생성 태그 칩, 관련 작업 캐러셀.

### 관리자 & CMS
- **시크릿 진입**: `/admin` 접근 시 비밀번호 모달 → 성공 시 JWT 저장.
- **Markdown + Live Preview**: 왼쪽 입력, 오른쪽 `react-markdown` 미리보기. 표, 코드블록, HTML 허용.
- **Drag & Drop 업로드**: 드롭 즉시 `/api/upload`로 전송하고 커서 위치에 마크다운을 삽입.
- **미디어 라이브러리**: 기존 업로드 자산을 목록으로 불러와 재사용.
- **퍼블리싱 컨트롤**: `isHidden` 토글, 스케줄링, 템플릿 복제.

### 커뮤니티 인터랙션
- **게시글별 댓글**: 최신순 리스트, 닉네임/시간 표기.
- **비회원 수정/삭제**: 작성 시 입력한 비밀번호를 bcrypt로 비교 후 수정/삭제 허용.
- **모더레이션 API**: 관리자가 즉시 댓글 제거 가능.

## 홈 화면 기능 요구서
스케치 시안을 기준으로 홈 뷰의 각 요소를 다음과 같이 정의한다.

| 구성 요소 | 요구 사항 | 세부 동작 |
| --- | --- | --- |
| 최상단 네비게이션 바 | 좌측 버거 버튼, 검색 아이콘, 브랜드 로고, 메뉴(Project, Story, Contact, Browse/Gallery). 1200px 이상에서 가로 배치, 이하에서는 버거 버튼으로 축소. | - 메뉴 hover 시 하단 1px 라인 애니메이션<br>- `Browse` 클릭 시 서브 패널 열림(검색 옵션: date, name, support; sort 옵션). |
| 검색 테이블 섹션 | 네비 아래 전체 폭을 차지하는 얕은 박스. placeholder: “search table.” | - 키워드 입력 + 필터 선택을 묶어 `/api/posts?query=&sort=` 호출.<br>- 입력 시 200ms debounce. |
| 메인 시네마 카드 | 중앙 16:9 카드, 상단 라벨, 중간 대표 이미지(또는 비디오 썸네일), 하단 캡션/날짜. 카드 하단은 “extendable” 영역으로 호버 시 높이 확장. | - 카드 내부 텍스트는 blur-overlay 위에 표시.<br>- 클릭 시 상세 페이지로 전환하며 슬라이드 인 트랜지션.<br>- 포커스 시 키보드로도 확대(접근성). |
| 사이드 스토리 썸네일 | 우측 세로 스택 2~3개. 각각 작은 썸네일 + 제목 + 날짜(예: 2025.07.01). | - 뷰포트에 들어오면 페이드/슬라이드 애니메이션.<br>- hover 시 이미지 살짝 밝아짐. |
| 좌측 Follow 바 | 화면 왼쪽에 고정된 세로 탭. Instagram, Pinterest 아이콘을 세로로 배치. | - 모바일에서는 하단 바로 이동.<br>- hover 시 해당 플랫폼 컬러로 라인 전환. |
| 하단 슬라이드 안내 | 카드 아래 “컷을 넘길 때 slide-in으로 돌아오면 좋겠음” 메모 반영. | - Intersection Observer로 카드가 뷰포트를 떠날 때 아래쪽에서 새 카드가 슬라이드 인. |
| 글로벌 스크롤 | 전체 레이아웃은 중앙 1200px 기준 그리드, 양 옆 마진 확보. | - `prefers-reduced-motion`일 경우 이동 애니메이션 비활성화. |

### 상호작용 및 상태
- 검색 패널, 메인 카드, 사이드 카드 모두 React Query로 `/api/posts` 데이터를 공유하고, 상태는 URL 쿼리 스트링과 동기화한다.
- 메인 카드가 바뀔 때 좌측 Follow 영역과 하단 슬라이드 안내는 동일한 전환 타이밍을 사용해 리듬을 맞춘다.
- Sketch에 표기된 손글씨 라벨(예: “search table.”, “extendable”)은 실제 UI에서는 작은 캡션 형태로 구현한다.

## 개발 계획 (홈 레이아웃 중심)
1. **데이터 계약 정의**
   - Hero 카드용 대표 포스트 1건, 사이드 썸네일용 포스트 2~3건을 `GET /api/posts?featured=true` 등으로 한 번에 받도록 API 수정.
   - 검색 필터 스키마: `{ query: string, sort: 'date'|'name'|'support', from?: string, to?: string }`.

2. **레이아웃 프레임 구축**
   - Tailwind CSS로 3열 그리드(`grid-cols-[80px_1fr_320px]`) 작성.
   - 좌측 Follow 열은 sticky, 메인 열은 16:9 카드, 우측 열은 auto-rows.
   - 반응형: `lg` 이상 3열, `md`는 Follow 숨김 + 2열, `sm` 이하는 스택.

3. **네비/검색 구현**
   - Header 컴포넌트: 로고/메뉴/아이콘 배치 + Framer Motion hover underline.
   - Browse 패널은 Headless UI Dialog를 이용해 모달 or 드롭다운 형태.
   - 검색 테이블은 `SearchBar` 컴포넌트로 분리하여 form state ↔ URL sync.

4. **콘텐츠 카드 컴포넌트**
   - `HeroCard`: 이미지 lazy-load, blur overlay, extendable footer.
   - `SideStoryCard`: skeleton 상태 포함.
   - 카드 교체 시 `motion.div`로 슬라이드 인/아웃.

5. **상호작용 로직**
   - Intersection Observer 훅(`useInView`)으로 카드 슬라이드 트리거.
   - Follow 바 hover/keyboard 접근성 처리.
   - 검색 결과 업데이트가 끝나면 Hero/Side 리스트 재정렬.

6. **테스트 및 접근성**
   - Storybook 또는 Chromatic으로 주요 컴포넌트 시각 회귀 테스트(선택).
   - RTL 테스트: 검색 입력 → API 호출 모킹, 슬라이드 애니메이션 toggle, 키보드 포커스 이동.

7. **콘텐츠 관리**
   - 관리자 UI에 “홈 히어로 고정” 토글 추가(특정 포스트를 Hero에 고정).
   - 사이드 카드 우선순위는 태그/날짜 기반 자동 선정 + 수동 재정렬 옵션.

이 계획을 따라 구현하면 스케치에서 제안한 헤더/검색/메인 카드/사이드 카드/Follow 바 구조와 상호작용을 그대로 재현할 수 있다.

## 데이터 모델
### `Post` 컬렉션 (프로젝트 + 에세이)
```json
{
  "_id": "ObjectId",
  "type": "project | essay",
  "title": "String",
  "slug": "String",
  "thumbnail": "String",
  "content": "String",
  "tags": ["String"],
  "media": ["String"],
  "createdAt": "Date",
  "updatedAt": "Date",
  "isHidden": "Boolean"
}
```

### `Comment` 컬렉션
```json
{
  "_id": "ObjectId",
  "postId": "ObjectId",
  "author": "String",
  "passwordHash": "String",
  "content": "String",
  "createdAt": "Date"
}
```

### `Admin` 컬렉션
```json
{
  "username": "String",
  "passwordHash": "String"
}
```

## API 인터페이스
| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/api/auth/login` | 관리자 자격 검증 후 JWT 발급. |
| `GET` | `/api/auth/me` | 토큰 유효성 검사 및 프로필 반환. |
| `GET` | `/api/posts` | 포스트 목록. 쿼리: `type`, `isHidden`, pagination. |
| `POST` | `/api/posts` | 포스트 생성(인증 필요). |
| `GET` | `/api/posts/:id` | ID 또는 slug 기반 단일 조회. |
| `PATCH` | `/api/posts/:id` | 필드 업데이트. |
| `DELETE` | `/api/posts/:id` | 포스트 삭제 및 관련 미디어 정리. |
| `POST` | `/api/upload` | Multer 업로드, `{ url, filename, mimetype }` 반환. |
| `GET` | `/api/comments?postId=` | 특정 포스트 댓글 목록. |
| `POST` | `/api/comments` | 방문자 댓글 생성(bcrypt 해시 저장). |
| `DELETE` | `/api/comments/:id` | 비밀번호 검증 후 댓글 삭제. |

> 모든 관리자용 API는 `Authorization: Bearer <jwt>` 헤더를 요구하며, Multer는 파일 크기·확장자 가드를 적용한다.

## 리치 에디터 워크플로
1. **onDrop 리스너**로 `e.dataTransfer.files` 획득 & 기본 동작 취소.
2. **비동기 업로드**: `FormData` 생성 후 `POST /api/upload`.
3. **서버 처리**:
   - Multer가 `uploads/<timestamp>-<originalname>`로 저장.
   - `{ url: "/uploads/...", type: "image/png" }` 형태로 응답.
4. **본문 삽입**:
   - 이미지 → `![설명](url)`
   - GIF/동영상 → `<video src="url" controls />`
5. **미리보기 갱신**: `react-markdown`이 `remark-gfm` + 커스텀 렌더러로 재렌더링하며, YouTube/Vimeo 링크는 정규식으로 감지해 `<iframe>`으로 변환한다.

## 개발 환경
### 사전 준비
- Node.js 18+
- pnpm 9+ (또는 npm 10)
- MongoDB Community Edition 6+
- Git, OpenSSL(JWT 시크릿 생성용)

### 백엔드 실행
```bash
cd server
pnpm install
cp .env.example .env
# MONGO_URI, JWT_SECRET, UPLOAD_DIR 입력
pnpm dev
```

### 프론트엔드 실행
```bash
cd client
pnpm install
cp .env.example .env
# VITE_API_BASE=http://localhost:4000
pnpm dev
```

### 환경 변수
| 변수 | 설명 | 예시 |
| --- | --- | --- |
| `MONGO_URI` | Mongo 연결 문자열 | `mongodb://127.0.0.1:27017/archlog` |
| `JWT_SECRET` | 32자 이상 토큰 시크릿 | `base64` 문자열 |
| `UPLOAD_DIR` | 업로드 저장 절대경로 | `/server/uploads` |
| `MAX_FILE_SIZE_MB` | 업로드 제한 용량 | `25` |
| `VITE_API_BASE` | 프론트엔드 API 베이스 URL | `http://localhost:4000` |

### 업로드 유의사항
- 서버 실행 전 `uploads/` 디렉터리를 생성해야 한다.
- `uploads/`는 Git 추적에서 제외한다.
- NAS 사용 시 충분한 용량의 볼륨을 마운트하고 `UPLOAD_DIR`을 그 경로로 지정한다.

## 테스트 전략
- **단위/통합(API)**: Jest + Supertest로 인증, 포스트 CRUD, 댓글 비밀번호 검증, 업로드 validation을 커버.
- **프론트엔드**: React Testing Library로 에디터 드롭 핸들러, Masonry 렌더링, 댓글 작성 플로우를 검증.
- **수동 테스트**:
  - 브레이크포인트별 스크롤 경험 확인.
  - 대용량 이미지/영상 업로드 실험.
  - 올바른/잘못된 비밀번호로 댓글 삭제 시나리오.
  - 같은 네트워크 내 모바일에서 `http://<local-ip>:4000` 접속.

## 로드맵
1. **MVP**
   - CRUD API, 업로드 라우트, 기본 React 페이지, 관리자 로그인, 에디터 임시 저장, 댓글 작성.
2. **Polish**
   - 스크롤 애니메이션, 스켈레톤, 태그 필터, 메타 태그 최적화.
3. **Ops**
   - Dockerfile, PM2 에코시스템, Nginx 리버스 프록시 템플릿, Mongo + uploads 자동 백업 스크립트.

위 사양을 기준으로 개발을 진행하면 아키텍처, UX 목표, 운영 제약을 모두 공유한 상태에서 빠르게 구현할 수 있다.

