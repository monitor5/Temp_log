# 로컬 백업 복원

`./scripts/backup-local.sh`가 만든 SQL과 content.tar.gz는 같은 백업 세트여야 한다. `INCOMPLETE` 파일이 남은 백업은 완료된 것으로 사용하지 않는다. 원래 `.env`와 당시 Ghost/MySQL 이미지 버전을 안전하게 확보한다. 먼저 **새 Compose 프로젝트와 새 볼륨**에서 시험한다. 운영 볼륨에 직접 덮어쓰지 않는다.

아래는 repository 루트에서, `.env`가 준비되고 같은 이미지가 빌드되어 있을 때의 복구 시험 예시다. `task_backup` 경로는 실제 선택한 완료 백업으로 바꾼다. 포트가 비어 있어야 한다.

```sh
export COMPOSE_PROJECT_NAME=temp-log-restore-check
export GHOST_PORT=2371 MAILPIT_PORT=8028 GHOST_URL=http://localhost:2371
task_backup=backups/YOUR_COMPLETED_BACKUP

test ! -e "$task_backup/INCOMPLETE"
test -s "$task_backup/database.sql"
test -s "$task_backup/content.tar.gz"
# 기존 동일 이름 프로젝트가 없어야 한다.
docker compose up -d --wait db
docker compose exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --user=ghost ghost' \
  < "$task_backup/database.sql"
# Ghost 서버를 아직 시작하지 않고 새 content 볼륨에 복원한다.
docker compose run --rm --no-deps -T --entrypoint tar ghost \
  -xzf - -C /var/lib/ghost/content < "$task_backup/content.tar.gz"
docker compose up -d --wait
```

<http://localhost:2371>에서 글·파일·초안을 확인하고, `/ghost/`에서 기존 owner 계정으로 접속한다. 새 기기 인증 메일은 로컬 Mailpit <http://localhost:8028>에서 확인한다. 글 안의 이미지·첨부파일, 테마, 로그인, 초안 비공개까지 확인한 후 운영 복구를 계획한다. 로컬 SMTP는 외부 메일을 보내지 않는다. 테스트 완료 시 **이 시험 프로젝트만** 정리한다.

```sh
docker compose -p temp-log-restore-check down -v
unset COMPOSE_PROJECT_NAME GHOST_PORT MAILPIT_PORT GHOST_URL
```

2026-09-29 위 방식으로 새 프로젝트에 복원해 한국어 글, draft/published DB 상태, 초안404, 백업 원본과 같은 이미지 바이트를 확인했다. MySQL 버전을 내리거나 migration 이후의 DB를 이전 Ghost와 조합하는 복구는 별도 호환성 검증이 필요하다.
