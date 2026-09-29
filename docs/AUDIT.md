# 원본 앱의 문제와 이번 수정

기준 원본은 `sspark_portpolio@58184033bef3131907d20cedfa8ee87ecdb5e62e`다. 이번에는 원래 앱을 가져와 아래 결함만 보완한다. 원본 파일 대응은 [source-comparison.json](source-comparison.json), 원본 문서는 `original/`에 있다.

| 원본 근거 | 문제 | 수정 |
| --- | --- | --- |
| server/src/routes/auth.routes.ts:15 | 익명 최초 관리자 생성·선점 | 웹 init 제거, CLI 관리자 생성 |
| server/src/config/env.ts:10 | 기본 JWT 키, 누락 시에도 동작 | JWT 제거, 필수 난수 세션 키 검증 |
| auth.middleware.ts:24 | 토큰의 ID만 신뢰 | 서버 세션과 실제 관리자 존재 확인 |
| post.controller.ts:24,34,95 | includeHidden/slug로 초안 노출 | 조회 경로별 관리자 확인·공개 조건 |
| scripts/seed.ts:15 | 공용 관리자 비밀번호 | 실행 시드 제거, 직접 비밀번호 생성 |
| PostDetail.tsx / AdminEditor.tsx | 무제한 raw HTML/iframe | 동일 sanitizer 및 iframe allowlist, CSP |
| upload.middleware.ts | 확장자만 검사, 파일명 충돌 | 파일 서명+확장자, 이미지 디코드, UUID, 용량 한도 |
| comment.controller.ts | 초안 댓글 접근, 입력 타입 부족 | 공개 게시글 존재 확인, Zod, 크기·조회 제한 |
| AdminDashboard.tsx | 100개 요청과 서버50개 한도 충돌 | 실제 페이지 이동, 전체 개수, 모바일 버튼 |
| Contact.tsx | 예시 학교 정보, 동작 없는 전송 폼 | 사용자 설정 분리, 명시적 mailto 연결 |
| server/index.ts | DB 장애를 모르는 health, 종료 처리 없음 | DB readiness/프로세스 liveness, SIGTERM 처리 |
| package files | 구버전 Multer/Vite, 누락된 검사 구성 | 지원 런타임/수정 버전, lockfile 통합, 회귀 테스트 |

`client/src/pages/Home.tsx`와 카드/레이아웃/검색 컴포넌트 등 원래 화면을 재사용한다. Markdown 편집, 이미지·동영상, 비회원 댓글을 유지한다. 서버 모델도 Post/Comment/Admin을 이어 사용하고 sessions collection을 추가했다. 모든 오류나 보안 위험이 사라졌다고 주장하지 않는다. 데이터 이관·운영 설정·라이선스 증빙은 별도 범위다.
