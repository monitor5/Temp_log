# 원본 앱의 백업·복구

`make backup`은 app과 MongoDB를 잠시 정상 종료하고, 전체 Mongo 데이터와 uploads를 같은 중단 구간에 보관한다. 종료 전 실행 중이던 서비스만 다시 시작한다. 백업 중에는 읽기/쓰기가 중단된다.

완료 세트는 `backups/<timestamp>/mongo-data.tar.gz`, `uploads.tar.gz`, 이미지 ID 기록이다. `INCOMPLETE` 파일이 남았다면 성공한 백업으로 쓰지 않는다. 같은 `.env`와 **동일 MongoDB 버전/이미지**도 안전하게 보관해야 한다. 다른 버전의 물리 파일로 덮어쓰지 않는다.

새 Compose 프로젝트·빈 볼륨에 먼저 복원한다. 아래 `task_backup`은 본인이 선택한 완료 백업 경로로 바꾼다. 운영 프로젝트에 `-v`를 실행하지 않는다.

```sh
export COMPOSE_PROJECT_NAME=temp-log-restore-check
export APP_PORT=8082 PUBLIC_URL=http://localhost:8082
task_backup=backups/YOUR_COMPLETED_BACKUP
# 새 볼륨을 만들되 데이터베이스 프로세스는 아직 시작하지 않는다.
docker compose create
docker compose run --rm --no-deps -T --entrypoint tar mongo -xzf - -C /data/db < "$task_backup/mongo-data.tar.gz"
docker compose run --rm --no-deps -T --entrypoint tar app -xzf - -C /data/uploads < "$task_backup/uploads.tar.gz"
docker compose up -d --wait --wait-timeout 240
```

<http://localhost:8082/admin>에서 기존 관리자 계정으로 로그인하고 글·댓글·파일과 초안 접근 제한을 확인한다. 세션 키·DB 비밀번호가 맞아야 한다. 이전 URL의 상대 경로 파일은 그대로 유지된다. 검증을 마친 뒤 시험 프로젝트만 정리한다.

```sh
docker compose -p temp-log-restore-check down -v
unset COMPOSE_PROJECT_NAME APP_PORT PUBLIC_URL
```

실행 중인 MongoDB 디렉터리를 단순 복사하지 않는다. 무중단 또는 대규모 백업은 replica set/검증된 관리 도구/스토리지 snapshot을 별도로 설계한다. [MongoDB 공식 파일시스템 백업 안내](https://www.mongodb.com/docs/manual/tutorial/backup-with-filesystem-snapshots/).
