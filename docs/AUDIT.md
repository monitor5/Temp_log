# 원본 서비스 검토

검토 대상은 [monitor5/sspark_portpolio의 5818403 커밋](https://github.com/monitor5/sspark_portpolio/tree/5818403)입니다. 소스와 잠금 파일을 읽었으며, 원본의 의존성을 설치하거나 서버·시드 스크립트를 실행하지 않았습니다. 아래 내용은 정적 검토 결과이며 실제 운영 환경에 대한 침투 테스트 결과는 아닙니다.

## 핵심 판단

원본은 라우트·컨트롤러·모델 구분, 비밀번호 해시, 관리자 변경 API 등 기본 구조가 있는 프로토타입입니다. 다만 관리자 초기화와 비공개 글 접근 제어에 결함이 있고, 단일 컴퓨터의 로컬 파일 저장을 전제로 하므로 그대로 공개 배포하기에는 부적합합니다.

Temp_log는 원본 애플리케이션을 복사하지 않고 Ghost의 웹 관리자·편집기·업로드 기능을 사용합니다. 독립 제작 테마를 얹고 MySQL 및 영속 볼륨으로 데이터를 관리합니다. 원본의 인증, 댓글, 업로드 처리, React 클라이언트, 샘플 계정·콘텐츠는 포함하지 않습니다. 라이선스 판단과 제3자 고지는 별도 문서를 참조하세요.

## 확인된 주요 문제

| 우선순위 | 문제와 영향 | 근거 |
| --- | --- | --- |
| 높음 | 초기 관리자 생성 API가 공개되어 첫 요청자가 관리자를 선점할 수 있습니다. 존재 확인과 생성 사이에 경쟁 조건도 있습니다. | [인증 라우트 15행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/routes/auth.routes.ts#L15), [초기화 처리 63–85행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/controllers/auth.controller.ts#L63-L85) |
| 높음 | JWT 비밀키를 누락하면 공개된 개발용 기본값을 사용합니다. 서명 확인 후 관리자의 실제 존재도 검증하지 않으므로 잘못된 배포 설정에서 관리자 권한 위조가 가능합니다. | [환경 설정 10행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/config/env.ts#L10), [인증 미들웨어 24–27행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/middlewares/auth.middleware.ts#L24-L27) |
| 높음 | 공개 목록에 `includeHidden=true`를 전달하면 숨긴 글을 조회할 수 있고, 상세 API도 숨김 여부를 검사하지 않습니다. 숨김 기능은 비공개 접근 제어가 아닙니다. | [목록 필터 24–35행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/controllers/post.controller.ts#L24-L35), [상세 조회 95–112행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/controllers/post.controller.ts#L95-L112) |
| 높음 | 시드가 고정된 관리자 비밀번호로 계정을 만들고 자격 증명을 로그에 출력합니다. | [시드 15–20행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/scripts/seed.ts#L15-L20) |
| 중간 | 본문 HTML을 정화하지 않고 해석하며 iframe 속성을 그대로 전달합니다. 관리자 토큰은 스크립트가 읽을 수 있는 localStorage에 저장됩니다. 악성 본문과 결합한 공격 가능성은 별도 동적 검증이 필요합니다. | [본문 렌더링 117–128행](https://github.com/monitor5/sspark_portpolio/blob/5818403/client/src/pages/PostDetail.tsx#L117-L128), [토큰 저장 24행](https://github.com/monitor5/sspark_portpolio/blob/5818403/client/src/store/authStore.ts#L24) |
| 중간 | 업로드를 로컬 디스크에 저장하고 확장자만 확인합니다. 여러 Pod에서 파일이 서로 다르게 보이거나 재배치 시 사라질 수 있으며 총 저장량 제한도 없습니다. | [업로드 미들웨어 17–44행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/middlewares/upload.middleware.ts#L17-L44) |
| 중간 | 헬스 응답은 데이터베이스 연결 상태를 반영하지 않으며 종료 신호에 따른 요청 종료·연결 정리가 없습니다. Docker·Kubernetes·CI 설정도 원본에 없습니다. | [서버 42–63행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/index.ts#L42-L63), [DB 연결 이벤트](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/config/db.ts#L15-L20) |
| 중간 | 요청 제한을 프로세스 메모리에만 저장합니다. 복제본이나 재시작에 따라 제한이 달라지고, 프록시 신뢰 설정이 없어 Ingress 뒤에서 방문자를 잘못 구분할 수 있습니다. | [요청 제한](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/middlewares/rateLimit.middleware.ts), [서버 설정](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/index.ts#L14-L30) |
| 중간 | 관리자 화면은 100개를 요청하지만 서버는 50개로 제한하고 화면에 페이지 이동이 없어 오래된 글 관리가 막힙니다. | [관리자 목록 16행](https://github.com/monitor5/sspark_portpolio/blob/5818403/client/src/pages/admin/AdminDashboard.tsx#L16), [서버 제한 28행](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/controllers/post.controller.ts#L28) |

## 유지보수 상태와 확인 한계

- 쿼리 값은 타입 단언에 의존하며 숫자·배열·정렬 필드 검증이 부족합니다. 오류 메시지를 그대로 응답해 내부 정보가 노출될 수 있습니다. [쿼리 처리](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/controllers/post.controller.ts#L27-L56), [오류 응답](https://github.com/monitor5/sspark_portpolio/blob/5818403/server/src/middlewares/error.middleware.ts#L14-L25).
- Jest/ESLint 실행 명령은 있지만 추적된 테스트 파일과 ESLint 설정이 없습니다. README의 `.env.example` 이름과 실제 `env.example.txt`가 다르고, 문서의 `VITE_API_BASE`는 클라이언트에서 사용하지 않습니다.
- 잠금 파일에는 Multer `1.4.5-lts.2`, Express `4.21.2`, Vite `5.4.21`, React `18.3.1`, React Router `6.30.2`가 있습니다. 버전이 오래되었다는 사실만으로 취약하다고 단정하지 않으며, 의존성 권고문 결과는 별도 검토 기록을 따릅니다.
- 현재 파일의 개인키, GitHub/AWS/provider 토큰, 인증정보가 포함된 DB URI 패턴 검사에서는 별도 실제 비밀값을 발견하지 못했습니다. Git 전체 이력·실행 환경·외부 서비스까지 검증한 것은 아닙니다. 개발용 JWT 기본키와 고정 시드 자격 증명은 위에서 확인했습니다.

Ghost로 교체하면 원본 결함 코드는 제거되지만 새 서비스의 운영 보안이 자동으로 보장되지는 않습니다. Temp_log의 실제 검증 범위, 버전 고정, 관리자 초기 설정, 데이터 백업·복구, Kubernetes 배포 제약은 프로젝트 운영 문서와 테스트 결과를 기준으로 판단해야 합니다.
