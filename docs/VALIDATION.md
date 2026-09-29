# 원본 앱 개선판 검증

2026-09-29, 기존 Ghost나 사용자의 운영 DB와 분리한 `temp-log-test-local` 환경에서 검증했다. 원본 저장소와 실제 사용자 데이터는 변경하지 않았다.

| 항목 | 확인 내용 |
| --- | --- |
| 빌드 | 원본 React UI와 Express TypeScript 빌드 통과 |
| 단위 회귀 | 초안 기본값, query/operator 입력 거부, 활성 media URL 거부 |
| 관리자 | CLI 생성, 기존 관리자 덮어쓰기 거부, 로그인 쿠키 HttpOnly/SameSite, logout 후401 |
| 요청 출처 | 다른 Origin의 관리자 쓰기403 |
| 공개 범위 | 익명 쓰기401, includeHidden401, 초안 ID/slug404, 초안 댓글 조회/쓰기404 |
| 업로드 | PNG 디코드·업로드/읽기, 가짜 PNG와 SVG400, PDF 다운로드 헤더 |
| 댓글 | 공개 글에 작성, 틀린 비밀번호401, 올바른 비밀번호 삭제 |
| 재생성 | 두 컨테이너 재생성 후 세션·글·초안·이미지/PDF 유지 |
| 브라우저 | 원래 관리자 로그인/새로고침, HTML event/script 및 비허용 iframe 차단 |
| 백업 | app/Mongo 정상 중지 뒤 DB+uploads 물리 파일 세트 생성, 재기동 |
| 복구 | 빈 볼륨의 별도 프로젝트에서 Mongo 데이터·한국어 글·업로드 이미지 복원 |
| Kubernetes | kind v1.37.0에서 app/Mongo Ready, 두 PVC Bound, Mongo 중단 시 live200/ready503, DB 재시작 복구 확인 |
| 의존성 | npm audit0, runtime 이미지 High/Critical0. Mongo Medium/Low는 별도 기록 |

브라우저의 Framer Motion 진입 애니메이션 도중 순간적인 overflow가 관찰되어 Home의 애니메이션 영역을 clip하고 reduced-motion 설정을 반영했다. 레이아웃·카드·기존 모션은 유지한다.

## 범위와 한계

- 운영 Ingress/TLS/DNS/StorageClass/클러스터 CNI의 통신 차단과 외부 백업은 별도 설정·시험이 필요하다.
- CPU/메모리 부하 시험, 악성 파일 백신 검사, 사용자 자산의 완전한 권리 증명은 수행하지 않았다.
- 실제 원본 MongoDB/업로드 export가 없어 사용자 콘텐츠 이관은 하지 않았다. 원본 Post/Comment/Admin 구조와 bcrypt hash 호환성을 유지했으나 운영 이관은 복사본 검증이 필요하다.
- 익명 댓글의 스팸 차단은 기본 IP rate limit 수준이다. 다중 app replica나 대규모 공개 운영은 추가 설계 대상이다.
- 초안 본문 접근 차단이 이미 업로드한 파일 URL까지 비공개로 만드는 것은 아니다.

CI는 Node24에서 build, npm audit, 회귀 테스트, 별도 Docker E2E와 재생성, Kustomize 렌더, 이미지 스캔/SBOM을 수행한다. 테스트 자격증명·쿠키·백업은 artifacts 업로드 및 Git에서 제외한다.
