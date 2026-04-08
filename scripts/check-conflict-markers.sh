#!/usr/bin/env bash
set -euo pipefail

if rg -n "^(<<<<<<<|=======|>>>>>>>)" README.md app.js index.html styles.css; then
  echo "Conflict markers found."
  exit 1
fi

echo "No conflict markers found."
