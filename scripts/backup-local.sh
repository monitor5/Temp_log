#!/bin/sh
# Consistent local backup: stop writers, dump SQL, archive uploaded content.
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
lock_dir=backups/.backup.lock
mkdir "$lock_dir" 2>/dev/null || { echo 'Another backup is running (or a stale backups/.backup.lock remains).' >&2; exit 1; }
restart_ghost=false
cleanup() {
    task_status=$?
    trap - EXIT HUP INT TERM
    if [ "$restart_ghost" = true ]; then
        docker compose start ghost >/dev/null || task_status=1
    fi
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
if [ "$(docker compose ps --status running --services ghost)" = ghost ]; then
    restart_ghost=true
    docker compose stop ghost
fi
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --user=ghost --single-transaction --no-tablespaces --set-gtid-purged=OFF ghost' > "$backup_dir/database.sql"
docker compose run --rm --no-deps -T --entrypoint tar ghost -czf - -C /var/lib/ghost/content . > "$backup_dir/content.tar.gz"
printf '%s\n' 'SQL and content belong to the same stopped-writer interval. Keep .env separately for recovery.' > "$backup_dir/README.txt"
rm "$backup_dir/INCOMPLETE"
printf 'Backup saved: %s\n' "$backup_dir"
