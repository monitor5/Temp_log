# 의존성 검토

원본은 3개의 npm lockfile, 938 package 항목(중복 포함)이 있었다. 2026-09-29 원본 lockfile별 audit은 root2/client19/server17 취약 package 결과를 반환했다. 이는 중복을 포함하며 고유 CVE 수나 실제 공격 경로 수가 아니다. Multer1의 공식 advisory는 당시 audit 출력에서 누락되어 별도 확인했다.

현재는 npm workspaces와 하나의 lockfile로 통합했다. 원본 React/Query/Zustand/Framer Motion/Tailwind 구성을 유지하고, 취약·지원 종료·필요 없는 항목만 교정했다.

- Node24.21, Express5, Mongoose8 유지 최신 패치, Multer2, Vite8.
- React Router6의 남은 advisory를 해소하도록 선언형 라우팅을 유지하면서7로 갱신.
- JWT/localStorage 인증 의존성 제거, express-session/connect-mongo 도입.
- bcryptjs는 기존 bcrypt hash와 비교 가능한 API로 사용, 네이티브 빌드 도구 불필요.
- file-type, Sharp, Zod, rehype-sanitize로 입력·미디어·표시 검증.
- 정의만 있고 사용하지 않던 ESLint/Jest 구성 제거, 실제 작동하는 Node 테스트와 HTTP/브라우저 통합 검증.
- 기존 영문 폰트를 Fontsource 패키지로 자체 제공, OFL 원문 보관.

2026-09-29 변경 후 `npm audit`: **0 findings**. 이는 현재 lockfile과 registry DB 기준이며 무취약 보증이 아니다. 이미지 OS까지 같은 의미는 아니므로 [컨테이너 검사](CONTAINER_AUDIT.md)를 별도로 본다. CI는 npm audit moderate 이상과 이미지 high/critical gate를 실행한다.

근거: [Multer advisory](https://github.com/expressjs/multer/security/advisories/GHSA-g5hg-p3ph-g8qg), [Vite 지원 정책](https://vite.dev/releases), [Node 릴리스](https://nodejs.org/en/about/previous-releases).
