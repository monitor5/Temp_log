# Temp_log

웹 관리자에서 글·이미지·파일을 올리는 개인 블로그. Ghost 6.65.0 + MySQL 8.4 LTS를 기반으로, 직접 만든 한국어 테마와 Docker/Kubernetes 운영 구성을 담았습니다.

기존 `sspark_portpolio`는 검토 대상으로만 사용했습니다. 인증·댓글·업로드 API, React 앱, MongoDB, 샘플 실적/학교 브랜딩, 외부 폰트를 복사하지 않았습니다. 원본은 변경하지 않았습니다.

## 바로 실행

Docker Desktop/Engine + Compose, Python 3가 필요합니다. 실행 시 약 2~3GB 여유 메모리를 권장합니다.

```sh
python3 scripts/init-local.py
docker compose up --build -d --wait
```

- 블로그: <http://localhost:2368>
- 관리자: <http://localhost:2368/ghost/>
- 로컬 인증 메일함: <http://localhost:8025> (Mailpit, 실제 이메일을 외부로 보내지 않습니다.)

처음 관리자 화면에서 **본인 이메일과 새 비밀번호로 소유자 계정을 생성**합니다. 기본 관리자 계정이나 공용 비밀번호는 없습니다. Compose의 포트는 `127.0.0.1`에만 열립니다.

초기 설정:

1. Settings에서 제목을 `Temp_log`, 언어를 `ko`로 설정하고 소개 문구를 입력합니다.
2. Design & branding → Change theme에서 `temp-log`를 활성화합니다. 테마가 목록에 없다면 `python3 scripts/package-theme.py`로 만든 `artifacts/temp-log.zip`을 업로드합니다.
3. Membership의 가입 설정을 Nobody로, 댓글을 Off로, Portal 버튼을 숨김으로 설정합니다. 필요할 때만 켜세요. 기본 테마에는 가입·유료 결제·댓글 UI가 없습니다.
4. Pages에서 소개/프로젝트/연락처 페이지를 만들고 Navigation에 추가합니다. 샘플 연락처나 타인의 실적은 미리 넣지 않았습니다.
5. Ghost가 자동 생성하는 Coming soon 샘플 글과 기본 About 페이지를 삭제하거나 본인 소개로 수정합니다.
6. Posts → New post에서 글을 작성하고 에디터의 `+` 메뉴로 이미지·파일·Markdown·코드·갤러리를 추가합니다. Draft와 Publish를 구분해 게시합니다.

파일을 업로드해 얻은 URL은 **초안에 삽입했더라도 URL을 아는 사람이 읽을 수 있습니다.** 이 구성은 공개할 자료의 블로그이며, 비밀 파일 보관함이 아닙니다. 일반 파일 첨부는 Ghost가 허용하는 형식을 사용하고 임의의 실행파일 업로더를 추가하지 않습니다.

`content/themes/temp-log`는 저장소에서 관리하는 테마입니다. 재시작 시 이미지의 테마 파일을 복사하므로, 수정은 이 저장소의 `theme/`에서 하고 이미지를 다시 빌드합니다. 관리자에서 업로드한 다른 이름의 테마·글·미디어는 유지됩니다.

## 들어 있는 것

- 웹 에디터, 초안/예약 발행, 이미지·파일 업로드, 태그, 소개 페이지, RSS 및 Ghost 기본 SEO
- 빌드 도구·외부 폰트·프론트엔드 npm 의존성 없는 자체 테마
- 비루트 사용자, 읽기 전용 root filesystem, capability 제거, 메모리/CPU 제한
- 데이터베이스와 업로드용 별도 영구 볼륨
- Kubernetes 단일 Ghost Deployment + MySQL StatefulSet, probes, NetworkPolicy, Secret 참조
- 새 블로그에만 실행하는 로그인·발행·비공개 초안·업로드·재시작 검증

Ghost 코어를 임의로 잘라내거나 별도 인증을 구현하지 않습니다. Ghost Admin에는 멤버십/뉴스레터 등 업스트림 기능이 남아 있지만, 이 저장소는 일반 개인 블로그에 필요한 화면·운영 구성을 제공합니다. Tinybird, ActivityPub 서버, 결제, 외부 분석기는 배포하지 않습니다.

## Kubernetes 배포

[실행·공개·백업·복구 안내](docs/KUBERNETES.md)를 따라 `k8s/base`를 적용합니다. 기본 서비스는 ClusterIP이며 외부 Ingress가 없습니다. 먼저 포트 포워딩으로 소유자 계정을 만든 후 도메인·HTTPS·실제 SMTP·레지스트리 접근을 설정해 공개합니다.

Ghost는 **복제 1개 + Recreate**입니다. Ghost는 clustering을 지원하지 않으며 로컬 업로드와 스케줄러가 있으므로 HPA를 붙이지 않습니다. 트래픽 확장은 캐시/CDN을 앞에 두는 방향입니다. 단일 서버 장애 시 잠시 중단될 수 있습니다. [Ghost 공식 호스팅 설계](https://github.com/TryGhost/Docs/blob/main/hosting.mdx)

GitHub 저장소가 private이라는 사실은 배포된 블로그를 비공개로 만들지 않습니다. 이 작업은 저장소와 배포 구성을 준비하며, 실제 운영 클러스터·도메인·메일 계정은 포함하지 않습니다.

## 백업과 업데이트

```sh
./scripts/backup-local.sh
```

잠시 Ghost 쓰기를 중단하고 `backups/<UTC 시간>/`에 SQL과 전체 content 압축본을 함께 저장한 뒤 다시 시작합니다. `.env`는 별도로 안전하게 보관합니다. 백업을 다른 저장소로 옮기고 실제 복원 시험을 해야 하며, 같은 Docker 호스트의 볼륨만으로는 백업이 되지 않습니다. 복구 절차는 [로컬 복구 안내](docs/RESTORE.md)와 [Kubernetes 운영 안내](docs/KUBERNETES.md)에 있습니다.

이미지 tag와 digest를 함께 고정했습니다. Dockerfile의 버전 갱신 → 스캔/검증 → DB와 content 백업 → 재배포 순서로 유지보수합니다. DB migration 이후 이미지 버전만 되돌리는 복구는 안전하지 않을 수 있습니다.

## 검증

```sh
# 실사용 블로그에 실행하지 마세요. 완전히 분리된 일회용 테스트입니다.
GHOST_PORT=2369 MAILPIT_PORT=8026 GHOST_URL=http://localhost:2369 \
  docker compose -p temp-log-smoke up --build -d --wait
python3 tests/smoke.py create
GHOST_PORT=2369 MAILPIT_PORT=8026 GHOST_URL=http://localhost:2369 \
  docker compose -p temp-log-smoke restart db ghost
GHOST_PORT=2369 MAILPIT_PORT=8026 GHOST_URL=http://localhost:2369 \
  docker compose -p temp-log-smoke up -d --wait
python3 tests/smoke.py verify
# 테스트가 만든 볼륨만 삭제합니다.
docker compose -p temp-log-smoke down -v
```

재실행할 때는 테스트용 `artifacts/smoke-state.json`과 `.cookies` 파일을 먼저 삭제합니다. CI는 임시 환경에서 같은 흐름과 GScan을 검사합니다. 검증 상세와 한계: [VALIDATION.md](docs/VALIDATION.md).

## 검토 기록과 권리

- [원본 코드·권한·설계 검토](docs/AUDIT.md)
- [원본 의존성 및 지원 상태](docs/DEPENDENCY_AUDIT.md)
- [컨테이너 취약점 점검과 제거 내역](docs/CONTAINER_AUDIT.md)
- [라이선스 검토](docs/LICENSE_REVIEW.md)
- [보안 운영 기준](SECURITY.md)

새 자체 테마/설정은 비공개 `UNLICENSED / All rights reserved`이며 Ghost(MIT), MySQL(GPLv2), 기타 이미지 구성요소의 라이선스는 별도로 유지됩니다. 이미지나 수정한 GPL 구성요소를 제3자에게 전달할 때에는 해당 고지·소스 제공 의무를 추가 확인해야 합니다. 게시하는 글·사진·파일은 본인이 사용할 권리가 있는 자료만 올리세요.
