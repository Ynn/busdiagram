#!/bin/sh
set -eu
cd "$(git rev-parse --show-toplevel)"
if ! command -v pre-commit >/dev/null 2>&1; then
  echo 'pre-commit is required: install it with uv tool install pre-commit' >&2
  exit 1
fi
publication_index=$(mktemp)
rm -f "$publication_index"
trap 'rm -f "$publication_index"' EXIT HUP INT TERM
GIT_INDEX_FILE="$publication_index" git add -A
check_status=0
GIT_INDEX_FILE="$publication_index" pre-commit run --all-files || check_status=1
if [ -f .local/publication-rules.yaml ]; then
  GIT_INDEX_FILE="$publication_index" pre-commit run --all-files --config .local/publication-rules.yaml || check_status=1
fi
exit "$check_status"
