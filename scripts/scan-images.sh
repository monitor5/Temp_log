#!/bin/sh
# Install Trivy separately from its official releases. No daemon socket exposure.
set -eu
cd "$(dirname "$0")/.."
command -v trivy >/dev/null 2>&1 || { echo 'Trivy is required: https://trivy.dev/' >&2; exit 1; }
mkdir -p artifacts
for task_image in temp-log:local temp-log-db:local; do
    task_name="${task_image%:*}"
    trivy image --image-src docker --scanners vuln --format json \
        --output "artifacts/$task_name-trivy.json" "$task_image"
    trivy image --image-src docker --format cyclonedx \
        --output "artifacts/$task_name-sbom.json" "$task_image"
    trivy sbom "artifacts/$task_name-sbom.json" --scanners vuln \
        --severity HIGH,CRITICAL --exit-code 1
 done
