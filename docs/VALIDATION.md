# 검증 기록

2026-09-29, 기존 사용자의 운영 클러스터/데이터에 접근하지 않고 별도 환경에서 검증했다.

| 검증 | 결과 |
| --- | --- |
| Ghost 6 테마 GScan | 오류/경고 0 |
| Docker Compose + MySQL 8.4.11 | production 모드 초기화, 일반 DB 사용자, 비루트/read-only root로 정상 기동 |
| 웹 관리자 E2E | 최초 소유자 생성, 세션 로그인, 테마 활성화, 설정 저장 통과 |
| 콘텐츠 E2E | 한국어 글 발행, 태그 페이지, RSS, 이미지·TXT 파일 첨부 업로드/다운로드 통과 |
| 권한 경계 | 익명 관리자 쓰기 403, 미발행 초안 URL 404, 목록에 초안 없음 |
| 영속성 | 두 컨테이너 재생성 후 로그인 세션·글·이미지·첨부파일·초안 상태 유지 |
| DB 장애 | 홈페이지는 정상 200 → DB 중단 시 500. cached site API 대신 실제 홈페이지를 readiness로 사용 |
| 화면 | Chrome 1440×1000, 390×844 확인, 가로 넘침/브라우저 JS 오류 없음 |
| Kubernetes | 별도 kind v1.37.0 클러스터에서 10개 기본 리소스, restricted Pod Security 허용, PVC 2개 Bound |
| Kubernetes 권한 | Ghost UID1000/MySQL UID999, read-only root/capabilities 제거 상태로 기동 |
| Kubernetes 장애 복구 | DB 0개일 때 Ghost NotReady·재시작0, 교체 Pod는 init에서 대기, DB 복구 후 Ready·재시작0 |
| Kubernetes 데이터 | Pod 교체 후 기존 세션·글·이미지·초안·RSS 유지 |
| Kubernetes 스키마 | base/public 예시 strict kubeconform 총 21/21 리소스 통과 |
| 이미지 보안 | 최종 Ghost/MySQL linux/arm64 이미지 Trivy 0.74.0 취약점 탐지 0, SBOM 생성 |
| 로컬 백업 | Ghost 쓰기 중단 구간에서 SQL+content.tar.gz 생성, 정상 재시작 |
| 로컬 복구 | 완전히 새 DB/volume에 SQL+content 복원, 한국어 글·초안 접근제어·원본과 같은 이미지 바이트 확인 |

`tests/smoke.py`는 새 localhost 블로그에서만 owner를 만든다. 이미 초기화한 사이트에서는 create 단계가 중단된다. 테스트 자격증명/쿠키·백업은 ignored 경로에 저장하고 repository/CI artifact에 넣지 않는다. GitHub Actions는 별도로 linux/amd64 빌드·스캔·테마 검사·같은 E2E 및 재생성 검증을 실행한다. 최신 원격 실행 결과는 저장소 Actions에서 확인한다.

## 아직 검증하지 않은 범위

- 운영 DNS·TLS·Ingress 컨트롤러·실제 SMTP 계정과 새 기기 인증 메일 전달
- 실제 운영 StorageClass의 장애, PVC 재연결, CSI snapshot, 클러스터 외부 백업
- CNI의 NetworkPolicy 통신 차단: kind 기본 kindnet은 정책을 집행하지 않는다
- 부하 시험, HA, 대규모 콘텐츠, 이전 MongoDB 운영 데이터 마이그레이션
- 외부 침투 테스트, 완전한 공급망 감사, 타인이 만든 콘텐츠의 권리 증명

관리자 업로드 파일은 URL을 아는 사람이 읽을 수 있다. 초안 본문 비공개 테스트를 파일 접근 제어 보장으로 해석하지 않는다. 기존 저장소에 실제 DB/media export가 없어서 사용자 콘텐츠는 이관하지 않았다. 실제 배포는 도메인·클러스터·SMTP가 정해진 뒤 운영 문서대로 진행해야 한다.


## Docker 실행 구성 보완 검증

같은 날짜에 `temp-log-wrap-smoke`라는 별도 Compose 프로젝트로 아래 변경을 검증했다.

- `make up`으로 두 이미지 빌드와 3개 서비스 healthy 확인, 기존 `.env` 보존.
- Ghost는 app/database 두 네트워크, MySQL은 internal database만, Mailpit은 app만 연결됨을 확인. DB host port 바인딩 없음.
- 이미지에 내장된 healthcheck가 Compose에 상속됨을 확인하고 DB 중단 시 종료 코드 1 확인.
- init 프로세스, PID 제한, 서비스별 local 로그 순환, 읽기 전용 root와 capability 제거 확인.
- 관리자 등록/로그인·게시·초안 비공개·이미지/파일 업로드 후 컨테이너 전체 재생성, 세션과 콘텐츠 보존 통과.
- README와 아키텍처 문서의 Mermaid 4개를 실제 렌더러로 파싱·렌더링 확인.

이는 로컬 컨테이너와 문서 검증이다. Kubernetes는 변경한 종료 유예 시간(90초)을 포함해 Kustomize 렌더를 확인했으며, 운영 클러스터에 새로 적용하지 않았다.
