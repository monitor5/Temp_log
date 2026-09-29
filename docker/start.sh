#!/bin/sh
set -eu
# This named theme is managed by this repository. Other uploaded themes are untouched.
: "${GHOST_CONTENT:?Ghost content path is required}"
rm -rf "$GHOST_CONTENT/themes/temp-log"
mkdir -p "$GHOST_CONTENT/themes/temp-log"
cp -R /opt/temp-log/theme/. "$GHOST_CONTENT/themes/temp-log/"
exec docker-entrypoint.sh "$@"
