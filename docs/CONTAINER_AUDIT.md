# 원본 앱 컨테이너 점검

2026-09-29, Trivy0.74.0, local linux/arm64 기준. 현재 이미지의 원본 JSON/SBOM은 `artifacts/temp-log-original-*`, `artifacts/temp-log-mongo-*`이고 결과 요약과 해시는 [scan-summary.json](scan-summary.json)에 있다.

앱은 Node24 Alpine 기반 다단계 빌드다. React 빌드를 public에, 서버 실행 의존성만 runtime에 복사한다. npm/빌드 도구는 runtime에서 제거하고 UID1000으로 실행한다. 처음 검토한 Debian 기반보다 불필요한 OS 구성요소가 적은 Alpine을 사용했으며, Express/React/MongoDB 서비스 구조는 바꾸지 않았다.

MongoDB8.0.32의 mongod와 mongosh는 유지한다. 이 구성에서 쓰지 않는 database-tools, root 전환 도구 gosu, 오래된 js-yaml 설정 로더를 제외했다. 초기화와 health는 mongosh, 설정은 명령 인자를 사용한다. `--config` YAML 경로와 root 실행은 지원하지 않는다. 백업은 DB를 정상 종료한 물리 볼륨 세트로 수행한다. 별도 논리 import/export 도구가 필요하면 최신 검증된 관리 이미지를 사용한다.

스캔에서 **두 runtime 이미지의 High/Critical은 0**이었다. Mongo OS의 Medium/Low는 남아 있으며 전체 탐지 0이라고 주장하지 않는다. 알려진 패키지 결과와 실제 서비스 공격 가능성은 같지 않다. 수정 가능한 OS 보안 업데이트와 공식 이미지 갱신을 계속 확인해야 한다.

컨테이너는 비루트, read-only root, drop ALL, no-new-privileges, CPU/메모리/PID 제한을 사용한다. app/data 네트워크를 분리하고 DB 포트는 호스트에 공개하지 않는다. Mongo 기본 이미지와 Node 기본 이미지 digest는 Dockerfile에 고정했다. 실제 배포는 최종 빌드 후 스캔한 digest로 고정한다.

`./scripts/scan-images.sh`는 각 이미지의 보고서와 CycloneDX SBOM을 만들고 High/Critical 발견 시 실패한다. CI artifacts에는 보고서만 올리며 세션·테스트 비밀번호·백업은 넣지 않는다. 제거한 파일은 기반 OCI layer에서 소급 삭제되지 않을 수 있고, 임의 제3자 이미지 배포의 라이선스 의무도 별도 확인한다.
