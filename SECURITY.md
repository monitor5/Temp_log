# 보안 운영

현재 서비스는 원본 Arch-Log를 보완한 React/Express/MongoDB 앱이다.

- 최초 관리자 생성·비밀번호 초기화는 서버 CLI만 제공한다. 기본 관리자/공유 JWT 키/익명 웹 초기화 API는 없다.
- 로그인 정보는 HttpOnly, SameSite=Strict 쿠키와 MongoDB 서버 세션으로 관리한다. logout과 암호 변경은 서버 세션을 폐기한다.
- 쓰기 요청은 PUBLIC_URL의 Origin과 전용 요청 헤더를 확인한다. 운영 HTTPS URL이면 Secure 쿠키를 사용한다. 프록시 홉 수는 신뢰하는 Ingress 경로와 정확히 일치시켜야 한다.
- 관리자 HTML도 sanitizer와 CSP를 통과한다. 외부 iframe은 제한된 YouTube/Vimeo 주소만 허용한다.
- 모든 공개 글·댓글 조회는 숨김 상태를 확인한다. 파일 URL은 공개 자료용이며 초안 상태와 별도다.
- 이미지/영상/PDF만 지원한다. 이미지 디코딩, 파일 서명/확장자 확인, UUID 이름, 파일·전체 용량 한도가 있다. 백신 검사 또는 모든 PDF/영상 내용의 무해함을 보증하지 않는다.
- 댓글 비밀번호는 bcrypt로 저장한다. 비밀번호 길이/댓글 길이/조회 수/쓰기 빈도를 제한한다. 댓글이 필요 없으면 UI와 API를 함께 비활성화한다.
- root DB 자격증명은 앱에 전달하지 않는다. 앱은 archlog DB의 readWrite 권한만 사용한다. Kubernetes Secret의 etcd 암호화/RBAC와 외부 백업은 운영자가 관리한다.
- 단일 app replica의 메모리 rate limit/로컬 업로드 전제다. 여러 replica로 늘리려면 공유 제한 저장소와 오브젝트 스토리지 등 추가 설계가 필요하다.
- Node/Mongo 이미지와 npm 의존성을 지속 갱신한다. 스캔 0건은 무취약 보장이 아니다. docs/CONTAINER_AUDIT.md에 실제 범위를 기록한다.

원본의 실제 운영 DB나 파일 export가 제공되지 않아 데이터 이관은 수행하지 않았다. 기존 스키마를 유지하지만 운영 이관 전에는 복사본으로 검증해야 한다.
