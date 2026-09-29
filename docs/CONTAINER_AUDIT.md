# 컨테이너 보안 검사

## MySQL 이미지

검사일: 2026-09-29, 로컬 Docker `linux/arm64`. Trivy 0.74.0, 취약점 DB 갱신 시각 `2026-09-29T01:13:17Z`. 이 결과는 검사한 이미지와 당시 DB에 한정된다.

기반 이미지는 `mysql:8.4.11@sha256:0744ee5ef89ce6ccfa13de3e579fe6b9e27f93dd70da9c06d2c908b1b193fb8d`다. 로컬의 `mysql:8.4` 태그도 같은 digest를 가리켰다. 기반 이미지의 MySQL 서버는 8.4.11이며 OS는 Oracle Linux 9.8이다.

[Dockerfile.mysql](../Dockerfile.mysql)은 다음 항목만 조정한다.

| 조치 | 검사 시 실제 변경 | 이유 |
| --- | --- | --- |
| Oracle RPM 업데이트 | `curl`, `libcurl`: `7.76.1-40.el9_8.5` → `7.76.1-40.el9_8.7` | 사용 가능한 보안 수정 반영 |
| Oracle RPM 업데이트 | `libxml2`: `2.9.13-14.el9_8.4` → `2.9.13-14.el9_8.5` | 사용 가능한 보안 수정 반영 |
| 사용하지 않는 관리 도구 제거 | `mysql-shell-8.4.10-1.el9` RPM 하나 제거 | Ghost 연결·DB 초기화·백업에서 `mysqlsh`와 그 번들 Python 패키지를 사용하지 않음 |
| 사용하지 않는 권한 전환 도구 제거 | `/usr/local/bin/gosu` 제거 | 런타임을 UID/GID `999:999`로 고정하므로 upstream entrypoint의 root 전환 분기에 진입하지 않음 |
| 기본 사용자 제한 | `USER 999:999` | 컨테이너를 처음부터 mysql 사용자로 실행 |

업데이트는 기존 Oracle `ol9_baseos_latest`와 `ol9_appstream` 저장소만 허용하고 기존 RPM 서명 검증을 유지한다. 실제 거래는 OS 패키지 3개 업그레이드와 mysql-shell 패키지 1개 제거였으며, 서버 RPM은 `mysql-community-server-minimal-8.4.11-1.el9`로 유지됐다. `mysqld`, `mysql`, `mysqldump`, `mysqladmin`은 유지하고 빌드에서도 존재를 검사한다. upstream MySQL entrypoint는 수정하지 않는다.

### 스캔 결과

| 이미지 | Critical | High | Medium | Low | Unknown | 결과 항목 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 기반 이미지 | 1 | 37 | 27 | 6 | 1 | 72 |
| `temp-log-db:local` | 0 | 0 | 0 | 0 | 0 | 0 |

위 숫자는 package/advisory 결과 항목이며 고유 CVE 수나 실제 공격 가능한 경로 수가 아니다. 기반 이미지의 항목은 OS 패키지 10개 결과, mysql-shell에 포함된 Python 패키지 16개 결과, gosu의 Go 의존성 46개 결과로 구성됐다. 변경 후 Trivy는 OS 패키지 113개를 검사했고 별도 언어 패키지 대상은 발견하지 않았다. 탐지 결과가 0이라는 사실은 무취약 보증이 아니다.

- 기반 이미지 ID: `sha256:0a2cc5e121fa5b68ec0965ea6d4f533d4c7f23b3216e788b1479857c377aae66`
- 검사한 변경 이미지 ID: `sha256:79a3cb0486bef3b1c64a96aaf7f896b85daf6bcf4a9bc6910e6266e5ffb4e32d`
- 로컬 원본 보고서: `artifacts/mysql-trivy.json`
- 로컬 변경 보고서: `artifacts/mysql-hardened-trivy.json`

Docker image ID는 이 로컬 빌드의 식별자이며 원격 레지스트리 manifest digest와 동일한 개념이 아니다. 보고서는 로컬 생성 산출물이므로 저장소에 포함되지 않을 수 있다. 아래 명령으로 실제 배포할 빌드를 다시 검사할 수 있다. 검사 도구는 별도로 설치한다.

```sh
docker build -f Dockerfile.mysql -t temp-log-db:local .
trivy image --image-src docker --scanners vuln --format json \
  --output artifacts/mysql-hardened-trivy.json temp-log-db:local
```

### 동작 검증

기존 사용자 DB와 분리한 일회용 컨테이너를 `--network none`, 읽기 전용 root filesystem, 모든 capability 제거, `no-new-privileges`로 시작했다. UID 999가 쓸 수 있는 데이터·socket·임시 디렉터리는 tmpfs로 제공했다. 임시 자격증명을 로그나 저장소에 기록하지 않고 다음을 확인한 뒤 컨테이너를 제거했다.

- 빈 데이터 디렉터리에서 upstream entrypoint가 초기화하고 일반 DB 사용자로 `SELECT 1`에 성공했다.
- 테이블 생성·행 삽입과 `mysqldump --no-tablespaces` 백업에 성공했다.
- 실제 프로세스 실행 사용자가 UID 999임을 확인했다.
- SIGTERM 종료 후 exit code 0을 확인했다.

### 운영 제약

이 이미지에서는 root로 사용자 설정을 덮어쓰지 않는다. gosu가 없으므로 root로 시작하는 upstream 경로는 지원하지 않는다. 데이터와 `/var/run/mysqld`, `/tmp`가 UID/GID 999에 쓰기 가능해야 하며 Kubernetes에서는 PVC 권한과 `fsGroup` 적용을 확인한다. `mysqlsh` 전용 관리·백업 기능은 제공하지 않는다.

기반 digest를 고정했어도 OS 업데이트 저장소는 시간에 따라 바뀌므로 매번 동일한 이미지가 생성되는 것은 아니다. 최종 이미지를 빌드·검사하고 원격 digest로 배포하며, 새 DB와 amd64 이미지는 각각 다시 검사한다. 여기서 실행한 테스트는 arm64 로컬 초기화/질의/덤프/종료 검증이며 실제 Kubernetes PVC 장애·복구나 업그레이드 시나리오까지 검증한 것은 아니다.

상위 layer에서 파일을 제거해도 기반 OCI layer의 바이트가 소급 삭제되지는 않는다. 이 조치는 실행 가능한 최종 filesystem의 불필요한 도구를 줄인 것이며 이미지 전체 전송 크기나 모든 layer에서의 파일 삭제를 보장하지 않는다. 제삼자 라이선스와 배포 의무는 [LICENSE_REVIEW.md](LICENSE_REVIEW.md)에 따른다.


## Ghost 이미지

기반: `ghost:6.65.0-alpine@sha256:fea3264f902e656833a84656ac6e81a6ef644f87aa0940aa636d4300de62196e`. 같은 Trivy 0.74.0/2026-09-29 DB, linux/arm64에서 비교했다.

| 이미지 | Critical | High | Medium | Low | Unknown | 결과 항목 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ghost 기반 | 1 | 41 | 27 | 3 | 1 | 73 |
| 최종 `temp-log:local` | 0 | 0 | 0 | 0 | 0 | 0 |

실행에 필요 없는 Ghost CLI, npm/Corepack/Yarn, gosu, pnpm 다운로드 store를 최종 filesystem에서 제거했다. Node와 Ghost의 설치된 runtime node_modules는 보존했다. pnpm store는 별도 다운로드 캐시이고 설치된 hardlink 파일을 삭제하지 않는다. Ghost core 또는 그 라이브러리를 임의 버전으로 덮어쓰지 않았다. app은 처음부터 UID 1000이므로 root 전환 도구를 사용하지 않는다.

제거 전의 결과는 npm/CLI Node 패키지 16항목, gosu 46항목, pnpm store의 실행 파일 11항목이었다. 기능 검증은 설치된 런타임으로 owner 등록/로그인, 테마 활성화, 초안 비공개, 글 발행, 이미지/파일 업로드, 컨테이너 재생성 후 데이터·세션 보존까지 수행했다. 자세한 결과는 [VALIDATION.md](VALIDATION.md)에 있다.

최종 JSON 검사와 CycloneDX SBOM은 `scripts/scan-images.sh`로 다시 생성한다. 기본 high/critical gate는 탐지되면 종료 코드 1로 실패한다. CI도 amd64에서 빌드·검사하고, 보고서와 SBOM만 artifact로 보관하며 테스트 비밀번호/쿠키는 업로드하지 않는다. 로컬 raw 보고서의 해시·이미지 ID·숫자는 [scan-summary.json](scan-summary.json)에 남겼다. 원본 보고서는 `artifacts/`에 있고 Git에서는 제외한다.

Trivy의 패키지 식별/취약점 DB에는 한계가 있고 앱 설정·권한·논리 오류까지 보증하지 않는다. 이미지 build layer에는 제거 전 파일이 남을 수 있다. 모든 플랫폼과 미래 이미지가 동일 결과라고 해석하지 않는다. Ghost, MySQL, 기본 OS, 보조 패키지와 새 취약점을 계속 갱신해야 한다.
