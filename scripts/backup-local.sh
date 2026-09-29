#!/bin/sh
# Cold backup of this single-instance service. Stops writers and mongod first.
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
lock_dir=backups/.backup.lock
mkdir "$lock_dir" 2>/dev/null || { echo 'A backup is already running or a stale lock exists.' >&2; exit 1; }
restart_app=false
restart_mongo=false
cleanup() {
    task_status=$?
    trap - EXIT HUP INT TERM
    if [ "$restart_mongo" = true ]; then docker compose up -d --no-deps --no-recreate --wait --wait-timeout 120 mongo >/dev/null || task_status=1; fi
    if [ "$restart_app" = true ]; then docker compose up -d --no-deps --no-recreate --wait --wait-timeout 120 app >/dev/null || task_status=1; fi
    rmdir "$lock_dir"
    exit "$task_status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
backup_dir="backups/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir "$backup_dir"
touch "$backup_dir/INCOMPLETE"
if [ "$(docker compose ps --status running --services app)" = app ]; then restart_app=true; docker compose stop app; fi
if [ "$(docker compose ps --status running --services mongo)" = mongo ]; then restart_mongo=true; docker compose stop mongo; fi
mongo_id="$(docker compose ps -aq mongo)"
[ -n "$mongo_id" ] || { echo 'No initialized Mongo container exists.' >&2; exit 1; }
[ "$(docker inspect --format '{{.State.ExitCode}}' "$mongo_id")" = 0 ] || { echo 'Mongo did not stop cleanly; backup aborted.' >&2; exit 1; }
docker compose run --rm --no-deps -T --entrypoint tar mongo -czf - -C /data/db . > "$backup_dir/mongo-data.tar.gz"
docker compose run --rm --no-deps -T --entrypoint tar app -czf - -C /data/uploads . > "$backup_dir/uploads.tar.gz"
docker image inspect temp-log-original:local temp-log-mongo:local --format '{{.Id}}' > "$backup_dir/images.txt"
printf '%s\n' 'Keep the matching .env securely. Restore only to empty volumes with the same Mongo version.' > "$backup_dir/README.txt"
rm "$backup_dir/INCOMPLETE"
printf 'Backup saved: %s\n' "$backup_dir"
